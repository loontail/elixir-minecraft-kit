import { describe, expect, it } from "vitest";
import { formatUserError } from "../../src/cli/error-format";
import { MinecraftKitError } from "../../src/core/errors";

describe("formatUserError", () => {
  it("translates HTTP 400 to a friendly message", () => {
    const e = new MinecraftKitError("NETWORK_HTTP_ERROR", "HTTP 400", {
      context: { httpStatus: 400 },
    });
    expect(formatUserError(e)).toContain("No matching data");
  });

  it("translates HTTP 404 to the same friendly message", () => {
    const e = new MinecraftKitError("NETWORK_HTTP_ERROR", "HTTP 404", {
      context: { httpStatus: 404 },
    });
    expect(formatUserError(e)).toContain("No matching data");
  });

  it("translates 408 / 429 / 5xx to dedicated messages", () => {
    expect(
      formatUserError(
        new MinecraftKitError("NETWORK_HTTP_ERROR", "x", { context: { httpStatus: 408 } }),
      ),
    ).toMatch(/took too long/);
    expect(
      formatUserError(
        new MinecraftKitError("NETWORK_HTTP_ERROR", "x", { context: { httpStatus: 429 } }),
      ),
    ).toMatch(/rate-limiting/);
    expect(
      formatUserError(
        new MinecraftKitError("NETWORK_HTTP_ERROR", "x", { context: { httpStatus: 503 } }),
      ),
    ).toMatch(/server returned an error/);
  });

  it("falls back to a generic HTTP message for other statuses", () => {
    const message = formatUserError(
      new MinecraftKitError("NETWORK_HTTP_ERROR", "x", { context: { httpStatus: 418 } }),
    );
    expect(message).toContain("418");
  });

  it("translates timeout / aborted / not-found cleanly", () => {
    expect(formatUserError(new MinecraftKitError("NETWORK_TIMEOUT", "x"))).toMatch(/timed out/);
    expect(formatUserError(new MinecraftKitError("NETWORK_ABORTED", "x"))).toMatch(/aborted/i);
    expect(formatUserError(new MinecraftKitError("MANIFEST_NOT_FOUND", "x"))).toMatch(
      /not available/,
    );
  });

  it("translates other domain errors", () => {
    expect(formatUserError(new MinecraftKitError("MANIFEST_INVALID", "x"))).toMatch(/malformed/);
    expect(formatUserError(new MinecraftKitError("INTEGRITY_HASH_MISMATCH", "x"))).toMatch(
      /hash check/,
    );
    expect(formatUserError(new MinecraftKitError("INTEGRITY_SIZE_MISMATCH", "x"))).toMatch(
      /wrong size/,
    );
    expect(formatUserError(new MinecraftKitError("RUNTIME_NOT_FOUND", "x"))).toMatch(
      /runtime is published/,
    );
    expect(formatUserError(new MinecraftKitError("RUNTIME_UNSUPPORTED_PLATFORM", "x"))).toMatch(
      /platform/,
    );
    expect(formatUserError(new MinecraftKitError("FORGE_INSTALLER_INVALID", "x"))).toMatch(
      /Forge installer/,
    );
    expect(formatUserError(new MinecraftKitError("FORGE_PROCESSOR_FAILED", "x"))).toMatch(
      /Forge processor/,
    );
    expect(formatUserError(new MinecraftKitError("LAUNCH_JAVA_NOT_FOUND", "x"))).toMatch(
      /Java executable/,
    );
    expect(formatUserError(new MinecraftKitError("LAUNCH_PROCESS_FAILED", "x"))).toMatch(
      /Minecraft exited/,
    );
    expect(formatUserError(new MinecraftKitError("LAUNCH_ABORTED", "x"))).toMatch(/aborted/i);
    expect(formatUserError(new MinecraftKitError("FILESYSTEM_PATH_TRAVERSAL", "x"))).toMatch(
      /escape/,
    );
    expect(formatUserError(new MinecraftKitError("FILESYSTEM_WRITE_ERROR", "broken"))).toMatch(
      /Filesystem error/,
    );
    expect(formatUserError(new MinecraftKitError("FILESYSTEM_READ_ERROR", "broken"))).toMatch(
      /Filesystem error/,
    );
    expect(formatUserError(new MinecraftKitError("INVALID_INPUT", "use defaults"))).toBe(
      "use defaults",
    );
  });

  it("returns the original message for non-elixir errors", () => {
    expect(formatUserError(new Error("plain"))).toBe("plain");
    expect(formatUserError("string")).toBe("string");
  });

  it("falls back to message for unmapped codes", () => {
    expect(formatUserError(new MinecraftKitError("NOT_IMPLEMENTED", "tbd"))).toBe("tbd");
  });

  it("falls back to message when HTTP_ERROR has no status", () => {
    expect(formatUserError(new MinecraftKitError("NETWORK_HTTP_ERROR", "weird"))).toBe("weird");
  });
});
