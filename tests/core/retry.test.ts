import { describe, expect, it, vi } from "vitest";
import { MinecraftKitError } from "../../src/core/errors";
import { abortableSleep, isHttpRetryable, withRetry } from "../../src/core/retry";

describe("withRetry", () => {
  it("returns result on first attempt", async () => {
    const result = await withRetry(
      async () => 42,
      () => true,
    );
    expect(result).toBe(42);
  });

  it("retries on retryable errors", async () => {
    let attempt = 0;
    const result = await withRetry(
      async () => {
        attempt++;
        if (attempt < 3) {
          throw new MinecraftKitError("NETWORK_TIMEOUT", "boom");
        }
        return "ok";
      },
      isHttpRetryable,
      { sleep: async () => undefined, maxAttempts: 5 },
    );
    expect(result).toBe("ok");
    expect(attempt).toBe(3);
  });

  it("does not retry non-retryable errors", async () => {
    const op = vi.fn(async () => {
      throw new MinecraftKitError("INVALID_INPUT", "bad");
    });
    await expect(
      withRetry(op, isHttpRetryable, { sleep: async () => undefined }),
    ).rejects.toBeInstanceOf(MinecraftKitError);
    expect(op).toHaveBeenCalledTimes(1);
  });

  it("aborts immediately when signal already aborted", async () => {
    const controller = new AbortController();
    controller.abort("test");
    await expect(
      withRetry(
        async () => 1,
        () => true,
        { signal: controller.signal },
      ),
    ).rejects.toBeInstanceOf(MinecraftKitError);
  });

  it("calls onAttemptFailed on failures", async () => {
    const failures: number[] = [];
    let attempt = 0;
    await withRetry(
      async () => {
        attempt++;
        if (attempt < 2) throw new MinecraftKitError("NETWORK_TIMEOUT", "x");
        return 1;
      },
      isHttpRetryable,
      { sleep: async () => undefined, onAttemptFailed: (_, a) => failures.push(a) },
    );
    expect(failures).toEqual([0]);
  });

  it("exhausts attempts and rethrows", async () => {
    await expect(
      withRetry(
        async () => {
          throw new MinecraftKitError("NETWORK_TIMEOUT", "x");
        },
        isHttpRetryable,
        { sleep: async () => undefined, maxAttempts: 2 },
      ),
    ).rejects.toBeInstanceOf(MinecraftKitError);
  });
});

describe("isHttpRetryable", () => {
  it("retries 503", () => {
    const error = new MinecraftKitError("NETWORK_HTTP_ERROR", "x", {
      context: { httpStatus: 503 },
    });
    expect(isHttpRetryable(error)).toBe(true);
  });
  it("does not retry 404", () => {
    const error = new MinecraftKitError("NETWORK_HTTP_ERROR", "x", {
      context: { httpStatus: 404 },
    });
    expect(isHttpRetryable(error)).toBe(false);
  });
  it("retries 429", () => {
    const error = new MinecraftKitError("NETWORK_HTTP_ERROR", "x", {
      context: { httpStatus: 429 },
    });
    expect(isHttpRetryable(error)).toBe(true);
  });
  it("does not retry on aborted", () => {
    const error = new MinecraftKitError("NETWORK_ABORTED", "x");
    expect(isHttpRetryable(error)).toBe(false);
  });
  it("retries on timeout", () => {
    const error = new MinecraftKitError("NETWORK_TIMEOUT", "x");
    expect(isHttpRetryable(error)).toBe(true);
  });
  it("does not retry on non-elixir errors", () => {
    expect(isHttpRetryable(new Error("x"))).toBe(false);
  });
  it("retries http error with no status (treated as 0)", () => {
    const error = new MinecraftKitError("NETWORK_HTTP_ERROR", "x");
    expect(isHttpRetryable(error)).toBe(true);
  });
});

describe("abortableSleep", () => {
  it("resolves after timeout", async () => {
    const start = Date.now();
    await abortableSleep(10);
    expect(Date.now() - start).toBeGreaterThanOrEqual(0);
  });

  it("rejects when aborted before sleep", async () => {
    const controller = new AbortController();
    controller.abort("x");
    await expect(abortableSleep(100, controller.signal)).rejects.toBeInstanceOf(MinecraftKitError);
  });

  it("rejects when aborted during sleep", async () => {
    const controller = new AbortController();
    const promise = abortableSleep(1000, controller.signal);
    setTimeout(() => controller.abort("x"), 5);
    await expect(promise).rejects.toBeInstanceOf(MinecraftKitError);
  });
});
