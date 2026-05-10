import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { MinecraftKitError } from "../../src/core/errors";
import { downloadFile } from "../../src/http/download";
import type { ProgressEvent } from "../../src/types/events";
import { FakeHttpClient } from "../helpers/fake-http";
import { sha1OfBytes } from "../helpers/hash";

describe("downloadFile", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "mckit-dl-"));
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it("writes file and reports events", async () => {
    const body = new TextEncoder().encode("hello world");
    const expectedSha1 = sha1OfBytes(body);
    const http = new FakeHttpClient().on("https://x/", { body });
    const target = path.join(tmpDir, "x");
    const events: ProgressEvent[] = [];
    const result = await downloadFile(http, {
      url: "https://x/",
      target,
      expectedSha1,
      expectedSize: body.byteLength,
      onEvent: (e) => events.push(e),
    });
    expect(result.bytesDownloaded).toBe(body.byteLength);
    expect(result.skipped).toBe(false);
    expect(await fs.readFile(target, "utf8")).toBe("hello world");
    expect(events.some((e) => e.type === "download:started")).toBe(true);
    expect(events.some((e) => e.type === "download:completed")).toBe(true);
    expect(events.some((e) => e.type === "integrity:verified")).toBe(true);
  });

  it("skips when destination is already valid", async () => {
    const body = new TextEncoder().encode("hello");
    const expectedSha1 = sha1OfBytes(body);
    const target = path.join(tmpDir, "x");
    await fs.writeFile(target, body);
    const http = new FakeHttpClient();
    const result = await downloadFile(http, {
      url: "https://x/",
      target,
      expectedSha1,
      expectedSize: body.byteLength,
    });
    expect(result.skipped).toBe(true);
    expect(http.requests.length).toBe(0);
  });

  it("rejects on hash mismatch", async () => {
    const body = new TextEncoder().encode("abc");
    const http = new FakeHttpClient().on("https://x/", { body });
    const target = path.join(tmpDir, "x");
    await expect(
      downloadFile(http, {
        url: "https://x/",
        target,
        expectedSha1: "0".repeat(40),
        expectedSize: 3,
      }),
    ).rejects.toBeInstanceOf(MinecraftKitError);
  });

  it("rejects on size mismatch", async () => {
    const body = new TextEncoder().encode("abc");
    const http = new FakeHttpClient().on("https://x/", { body });
    const target = path.join(tmpDir, "x");
    await expect(
      downloadFile(http, {
        url: "https://x/",
        target,
        expectedSize: 99,
      }),
    ).rejects.toBeInstanceOf(MinecraftKitError);
  });
});
