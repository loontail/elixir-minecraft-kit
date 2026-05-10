import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { DOWNLOAD_CONCURRENCY } from "../../src/constants/defaults";
import { createMemoryCache } from "../../src/http/cache";
import { runInstall } from "../../src/install/runner";
import type { HttpClient, HttpResponse } from "../../src/types/http";
import { type DownloadAction, InstallActionKinds, type InstallPlan } from "../../src/types/install";
import type { Spawner } from "../../src/types/spawner";
import { fakeTarget } from "../helpers/fake-kit";
import { sha1OfBytes } from "../helpers/hash";

describe("install runner concurrency", () => {
  it("defaults DOWNLOAD_CONCURRENCY to 32", () => {
    expect(DOWNLOAD_CONCURRENCY).toBe(32);
  });
});

function waitFor(predicate: () => boolean, timeoutMs = 2000): Promise<void> {
  return new Promise((resolve, reject) => {
    const startedAt = Date.now();
    const tick = (): void => {
      if (predicate()) {
        resolve();
        return;
      }
      if (Date.now() - startedAt > timeoutMs) {
        reject(new Error("waitFor timed out"));
        return;
      }
      setImmediate(tick);
    };
    tick();
  });
}

describe("install runner worker-pool", () => {
  let tmpDir: string;
  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "emk-conc-"));
  });
  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it("runs up to N downloads concurrently and starts the next as soon as one finishes", async () => {
    const fileCount = 16;
    const concurrency = 4;
    let inFlight = 0;
    let peak = 0;
    const release: (() => void)[] = [];

    const http: HttpClient = {
      async request(url): Promise<HttpResponse> {
        // Runtime manifest lives at "https://rm/" — release it immediately so it doesn't
        // block the post-download phase. The worker-pool assertion only cares about the
        // file downloads.
        if (url === "https://rm/") {
          const body = new TextEncoder().encode('{"files":{}}');
          return makeResponse(url, body);
        }
        inFlight++;
        peak = Math.max(peak, inFlight);
        await new Promise<void>((resolve) => release.push(resolve));
        inFlight--;
        const body = new TextEncoder().encode(url);
        return makeResponse(url, body);
      },
    };

    const actions: DownloadAction[] = Array.from({ length: fileCount }, (_, i) => {
      const url = `https://x/${i}`;
      const body = new TextEncoder().encode(url);
      return {
        kind: InstallActionKinds.DOWNLOAD_FILE,
        url,
        target: path.join(tmpDir, `file-${i}.bin`),
        expectedSha1: sha1OfBytes(body),
        expectedSize: body.byteLength,
        category: "library",
      };
    });
    const plan: InstallPlan = {
      targetId: fakeTarget.id,
      directory: tmpDir,
      target: fakeTarget,
      actions,
      totalActions: actions.length,
      totalBytes: actions.reduce((sum, a) => sum + (a.expectedSize ?? 0), 0),
    };
    const spawner: Spawner = {
      spawn() {
        throw new Error("spawner unused");
      },
    };

    const runPromise = runInstall({
      plan,
      http,
      cache: createMemoryCache(),
      spawner,
      concurrency,
    });

    // Step 1: pool fills to `concurrency`. 16 files exist; only 4 should be in flight.
    await waitFor(() => inFlight >= concurrency);
    expect(inFlight).toBe(concurrency);
    expect(peak).toBe(concurrency);

    // Step 2: drain. When we release one slot, the runner must immediately schedule a
    // new request — there is no batch barrier. We verify this by releasing the queue one
    // entry at a time and confirming the queue refills until no work remains.
    let remaining = fileCount;
    while (remaining > 0) {
      const expected = Math.min(concurrency, remaining);
      await waitFor(() => release.length === expected);
      const next = release.shift();
      next?.();
      remaining--;
    }

    const report = await runPromise;
    expect(report.actionsCompleted).toBeGreaterThanOrEqual(fileCount);
    expect(peak).toBe(concurrency);
  }, 10_000);
});

function makeResponse(url: string, body: Uint8Array): HttpResponse {
  return {
    status: 200,
    headers: { "content-length": String(body.byteLength) },
    url,
    async text() {
      return new TextDecoder().decode(body);
    },
    async json<T = unknown>(): Promise<T> {
      return JSON.parse(new TextDecoder().decode(body)) as T;
    },
    async bytes() {
      return body;
    },
    async *stream() {
      yield body;
    },
  };
}
