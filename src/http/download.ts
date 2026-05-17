import crypto from "node:crypto";
import { createWriteStream } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { HTTP_RETRY_MAX } from "../constants/defaults";
import { MinecraftKitError } from "../core/errors";
import { ensureDir } from "../core/fs";
import type { PauseController } from "../core/pause-controller";
import { isHttpRetryable, withRetry } from "../core/retry";
import type { ProgressListener } from "../types/events";
import type { HttpClient } from "../types/http";

/** Inputs to {@link downloadFile}. */
export type DownloadFileInput = {
  readonly url: string;
  readonly target: string;
  readonly expectedSha1?: string;
  readonly expectedSize?: number;
  readonly category?: string;
  readonly signal?: AbortSignal;
  readonly onEvent?: ProgressListener;
  /** Checked between chunks; pauses an in-flight download without aborting. */
  readonly pauseController?: PauseController;
};

/** Outputs from a successful download. */
export type DownloadFileResult = {
  readonly bytesDownloaded: number;
  readonly sha1: string;
  readonly skipped: boolean;
};

/**
 * Stream a URL to a file with on-the-fly hash verification, atomic rename, retries, and
 * progress events. Skips the download when the destination already exists with matching
 * size + sha1.
 */
export const downloadFile = async (
  http: HttpClient,
  input: DownloadFileInput,
): Promise<DownloadFileResult> => {
  assertSafeDownloadUrl(input.url);
  const fileRef = {
    url: input.url,
    target: input.target,
    ...(input.category !== undefined ? { category: input.category } : {}),
  };
  if (input.expectedSha1 !== undefined) {
    const existing = await checkExistingFile(input.target, input.expectedSha1, input.expectedSize);
    if (existing.matches) {
      input.onEvent?.({ type: "download:skipped", file: fileRef });
      return { bytesDownloaded: 0, sha1: existing.sha1, skipped: true };
    }
  }
  await ensureDir(path.dirname(input.target));
  const tmp = `${input.target}.${crypto.randomBytes(4).toString("hex")}.download`;
  return withRetry(
    async () => {
      input.onEvent?.({
        type: "download:started",
        file: fileRef,
        expectedSize: input.expectedSize ?? 0,
      });
      const startedAt = Date.now();
      let bytesDownloaded = 0;
      const hash = crypto.createHash("sha1");
      const response = await http.request(input.url, {
        ...(input.signal !== undefined ? { signal: input.signal } : {}),
      });
      const contentLength = Number(response.headers["content-length"] ?? "0");
      const total = input.expectedSize ?? (Number.isFinite(contentLength) ? contentLength : 0);
      const sourceIterable = response.stream();
      const counting = (async function* () {
        for await (const chunk of sourceIterable) {
          if (input.pauseController?.paused) {
            await input.pauseController.waitWhilePaused();
          }
          if (input.signal?.aborted) {
            throw new MinecraftKitError("LAUNCH_ABORTED", "Download aborted by signal");
          }
          bytesDownloaded += chunk.byteLength;
          hash.update(chunk);
          input.onEvent?.({
            type: "download:progress",
            file: fileRef,
            bytesDownloaded,
            totalBytes: total,
          });
          yield chunk;
        }
      })();
      try {
        await pipeline(Readable.from(counting), createWriteStream(tmp));
      } catch (cause) {
        await safeUnlink(tmp);
        throw new MinecraftKitError(
          "FILESYSTEM_WRITE_ERROR",
          `Failed to write download: ${input.target}`,
          { cause, context: { filePath: input.target, url: input.url } },
        );
      }
      const computedSha1 = hash.digest("hex");
      if (input.expectedSize !== undefined && bytesDownloaded !== input.expectedSize) {
        await safeUnlink(tmp);
        throw new MinecraftKitError("INTEGRITY_SIZE_MISMATCH", `Size mismatch for ${input.url}`, {
          context: {
            url: input.url,
            expectedSize: input.expectedSize,
            actualSize: bytesDownloaded,
          },
        });
      }
      if (input.expectedSha1 !== undefined && computedSha1 !== input.expectedSha1) {
        await safeUnlink(tmp);
        input.onEvent?.({
          type: "integrity:mismatch",
          file: fileRef,
          algorithm: "sha1",
          expected: input.expectedSha1,
          actual: computedSha1,
        });
        throw new MinecraftKitError("INTEGRITY_HASH_MISMATCH", `SHA-1 mismatch for ${input.url}`, {
          context: {
            url: input.url,
            expectedHash: input.expectedSha1,
            actualHash: computedSha1,
          },
        });
      }
      try {
        await fs.rename(tmp, input.target);
      } catch (cause) {
        await safeUnlink(tmp);
        throw new MinecraftKitError(
          "FILESYSTEM_WRITE_ERROR",
          `Failed to finalize download: ${input.target}`,
          { cause, context: { filePath: input.target } },
        );
      }
      input.onEvent?.({
        type: "download:completed",
        file: fileRef,
        durationMs: Date.now() - startedAt,
        bytes: bytesDownloaded,
      });
      if (input.expectedSha1 !== undefined) {
        input.onEvent?.({
          type: "integrity:verified",
          file: fileRef,
          algorithm: "sha1",
          hash: computedSha1,
        });
      }
      return { bytesDownloaded, sha1: computedSha1, skipped: false };
    },
    isHttpRetryable,
    {
      ...(input.signal !== undefined ? { signal: input.signal } : {}),
      onAttemptFailed: (error, attempt) => {
        input.onEvent?.({
          type: "download:failed",
          file: fileRef,
          error: error instanceof Error ? error : new Error(String(error)),
          willRetry: isHttpRetryable(error) && attempt < HTTP_RETRY_MAX - 1,
        });
      },
    },
  );
};

const checkExistingFile = async (
  target: string,
  expectedSha1: string,
  expectedSize: number | undefined,
): Promise<{ readonly matches: boolean; readonly sha1: string }> => {
  let stat: Awaited<ReturnType<typeof fs.stat>>;
  try {
    stat = await fs.stat(target);
  } catch {
    return { matches: false, sha1: "" };
  }
  if (!stat.isFile()) {
    return { matches: false, sha1: "" };
  }
  if (expectedSize !== undefined && stat.size !== expectedSize) {
    return { matches: false, sha1: "" };
  }
  const buf = await fs.readFile(target);
  const sha1 = crypto.createHash("sha1").update(buf).digest("hex");
  return { matches: sha1 === expectedSha1, sha1 };
};

const safeUnlink = async (filePath: string): Promise<void> => {
  try {
    await fs.unlink(filePath);
  } catch {
    // Best-effort.
  }
};

// Manifests are loaded over the network; an attacker controlling DNS or a man-in-the-middle
// could rewrite `library.url` to `file:///etc/passwd` and the streaming `fetch` would happily
// follow it. Restrict downloads to plain HTTP(S) so manifests can never coax `fetch` into
// reading local files, executing JS, or following data URIs.
const assertSafeDownloadUrl = (url: string): void => {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new MinecraftKitError("INVALID_INPUT", `Download URL is not parseable: ${url}`, {
      context: { url },
    });
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    throw new MinecraftKitError(
      "INVALID_INPUT",
      `Download URL must use http(s); refusing scheme ${parsed.protocol}`,
      { context: { url, scheme: parsed.protocol } },
    );
  }
};
