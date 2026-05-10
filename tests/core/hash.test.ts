import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { sha1OfFile } from "../../src/core/hash";

describe("hash utilities", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "mckit-hash-"));
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it("hashes a file streaming", async () => {
    const filePath = path.join(tmpDir, "f.txt");
    await fs.writeFile(filePath, "hello");
    expect(await sha1OfFile(filePath)).toBe("aaf4c61ddcc5e8a2dabede0f3b482cd9aea9434d");
  });

  it("rejects when file does not exist", async () => {
    await expect(sha1OfFile(path.join(tmpDir, "missing"))).rejects.toBeTruthy();
  });
});
