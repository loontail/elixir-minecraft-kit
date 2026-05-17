import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { MinecraftKitError } from "../../src/core/errors";
import { PauseController } from "../../src/core/pause-controller";
import { createMemoryCache } from "../../src/http/cache";
import { runInstall } from "../../src/install/runner";
import type { HttpClient, HttpResponse } from "../../src/types/http";
import {
  type DownloadAction,
  InstallActionKinds,
  InstallPhases,
  type InstallPlan,
} from "../../src/types/install";
import type { Spawner } from "../../src/types/spawner";
import { fakeTarget } from "../helpers/fake-kit";
import { sha1OfBytes } from "../helpers/hash";

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

const okHttp: HttpClient = {
  async request(url): Promise<HttpResponse> {
    if (url === "https://rm/") {
      const body = new TextEncoder().encode('{"files":{}}');
      return makeResponse(url, body);
    }
    const body = new TextEncoder().encode(url);
    return makeResponse(url, body);
  },
};

const spawner: Spawner = {
  spawn() {
    throw new Error("spawner unused");
  },
};

function makeAction(
  tmpDir: string,
  category: DownloadAction["category"],
  index: number,
): DownloadAction {
  const url = `https://x/${category}/${index}`;
  const body = new TextEncoder().encode(url);
  return {
    kind: InstallActionKinds.DOWNLOAD_FILE,
    url,
    target: path.join(tmpDir, `${category}-${index}.bin`),
    expectedSha1: sha1OfBytes(body),
    expectedSize: body.byteLength,
    category,
  };
}

function makePlan(tmpDir: string, actions: readonly DownloadAction[]): InstallPlan {
  return {
    targetId: fakeTarget.id,
    directory: tmpDir,
    target: fakeTarget,
    actions,
    totalActions: actions.length,
    totalBytes: actions.reduce((s, a) => s + (a.expectedSize ?? 0), 0),
  };
}

describe("install runner — grouped phases", () => {
  let tmpDir: string;
  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "mckit-phases-"));
  });
  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it("emits one phase per download category in stable order", async () => {
    const plan = makePlan(tmpDir, [
      makeAction(tmpDir, "library", 0),
      makeAction(tmpDir, "client-jar", 0),
      makeAction(tmpDir, "runtime-file", 0),
      makeAction(tmpDir, "asset", 0),
      makeAction(tmpDir, "asset-index", 0),
      makeAction(tmpDir, "fabric-library", 0),
    ]);
    const phases: string[] = [];
    await runInstall({
      plan,
      http: okHttp,
      cache: createMemoryCache(),
      spawner,
      onEvent: (event) => {
        if (event.type === "install:phase-changed") phases.push(event.phase);
      },
    });
    // Planning is always first. Runtime materialisation re-enters INSTALLING_RUNTIME
    // after the asset/library groups because the runtime target is set in the fake
    // plan; the assertion focuses on the downloads-pass order.
    const downloadPhases = phases.filter((p) => p !== InstallPhases.COMPLETED);
    expect(downloadPhases.indexOf(InstallPhases.INSTALLING_RUNTIME)).toBeLessThan(
      downloadPhases.indexOf(InstallPhases.DOWNLOADING_CLIENT_JAR),
    );
    expect(downloadPhases.indexOf(InstallPhases.DOWNLOADING_CLIENT_JAR)).toBeLessThan(
      downloadPhases.indexOf(InstallPhases.DOWNLOADING_LIBRARIES),
    );
    expect(downloadPhases.indexOf(InstallPhases.DOWNLOADING_LIBRARIES)).toBeLessThan(
      downloadPhases.indexOf(InstallPhases.DOWNLOADING_ASSET_INDEX),
    );
    expect(downloadPhases.indexOf(InstallPhases.DOWNLOADING_ASSET_INDEX)).toBeLessThan(
      downloadPhases.indexOf(InstallPhases.DOWNLOADING_ASSETS),
    );
    expect(downloadPhases.indexOf(InstallPhases.DOWNLOADING_ASSETS)).toBeLessThan(
      downloadPhases.indexOf(InstallPhases.INSTALLING_FABRIC),
    );
    expect(phases.at(-1)).toBe(InstallPhases.COMPLETED);
  });
});

describe("install runner — pause controller", () => {
  let tmpDir: string;
  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "mckit-pause-"));
  });
  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it("blocks the loop while paused and resumes on resume()", async () => {
    const plan = makePlan(tmpDir, [
      makeAction(tmpDir, "library", 0),
      makeAction(tmpDir, "library", 1),
      makeAction(tmpDir, "library", 2),
    ]);
    const pauseController = new PauseController();
    pauseController.pause();
    const completedFiles: string[] = [];
    const runPromise = runInstall({
      plan,
      http: okHttp,
      cache: createMemoryCache(),
      spawner,
      pauseController,
      onEvent: (event) => {
        if (event.type === "download:completed") completedFiles.push(event.file.target);
      },
    });

    // Give the loop a turn to reach the first pause checkpoint.
    await new Promise<void>((resolve) => setTimeout(resolve, 30));
    expect(completedFiles).toHaveLength(0);

    pauseController.resume();
    const report = await runPromise;
    expect(report.actionsCompleted).toBeGreaterThanOrEqual(3);
    expect(completedFiles).toHaveLength(3);
  });

  it("pauses an in-flight download between chunks", async () => {
    // A slow HTTP response that yields multiple chunks with delays in between
    // simulates a real download. Pausing should stop new chunks from being
    // counted until resume.
    const chunkBody = new Uint8Array(64 * 1024); // 64KB chunk
    const totalChunks = 6;
    const totalSize = chunkBody.byteLength * totalChunks;
    const sha1 = (() => {
      const h = require("node:crypto").createHash("sha1");
      for (let i = 0; i < totalChunks; i++) h.update(chunkBody);
      return h.digest("hex");
    })();

    const slowHttp: HttpClient = {
      async request(url): Promise<HttpResponse> {
        if (url === "https://rm/")
          return makeResponse(url, new TextEncoder().encode('{"files":{}}'));
        return {
          status: 200,
          headers: { "content-length": String(totalSize) },
          url,
          async text() {
            return "";
          },
          async json<T = unknown>(): Promise<T> {
            return null as T;
          },
          async bytes() {
            return new Uint8Array(totalSize);
          },
          async *stream() {
            for (let i = 0; i < totalChunks; i++) {
              await new Promise<void>((r) => setTimeout(r, 10));
              yield chunkBody;
            }
          },
        };
      },
    };

    const action: DownloadAction = {
      kind: InstallActionKinds.DOWNLOAD_FILE,
      url: "https://stream/0",
      target: path.join(tmpDir, "big.bin"),
      expectedSha1: sha1,
      expectedSize: totalSize,
      category: "library",
    };
    const plan = makePlan(tmpDir, [action]);
    const pauseController = new PauseController();

    let lastProgress = 0;
    const runPromise = runInstall({
      plan,
      http: slowHttp,
      cache: createMemoryCache(),
      spawner,
      pauseController,
      onEvent: (event) => {
        if (event.type === "download:progress") lastProgress = event.bytesDownloaded;
      },
    });

    // Wait for the download to start streaming, then pause.
    await new Promise<void>((r) => setTimeout(r, 25));
    pauseController.pause();
    const pausedAt = lastProgress;

    // Confirm progress freezes within ~50ms of the pause request.
    await new Promise<void>((r) => setTimeout(r, 50));
    const stillPaused = lastProgress;
    expect(stillPaused).toBe(pausedAt);

    pauseController.resume();
    await runPromise;
    expect(lastProgress).toBe(totalSize);
  }, 5_000);

  it("abort wins over pause", async () => {
    const plan = makePlan(tmpDir, [makeAction(tmpDir, "library", 0)]);
    const pauseController = new PauseController();
    pauseController.pause();
    const controller = new AbortController();

    const runPromise = runInstall({
      plan,
      http: okHttp,
      cache: createMemoryCache(),
      spawner,
      pauseController,
      signal: controller.signal,
    });

    // While the loop is parked on the pause checkpoint, abort it. The wait should
    // be released by resume(), but the immediate re-check of the signal flag wins.
    await new Promise<void>((resolve) => setTimeout(resolve, 30));
    controller.abort();
    pauseController.resume();

    await expect(runPromise).rejects.toBeInstanceOf(MinecraftKitError);
  });
});
