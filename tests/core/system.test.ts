import { describe, expect, it } from "vitest";
import { MinecraftKitError } from "../../src/core/errors";
import { detectSystem } from "../../src/core/system";

describe("detectSystem", () => {
  it("maps win32/x64 to windows/x64", () => {
    const sys = detectSystem({ platform: "win32", arch: "x64", osVersion: "10.0" });
    expect(sys).toEqual({ os: "windows", arch: "x64", osVersion: "10.0" });
  });

  it("maps darwin/arm64 to osx/arm64", () => {
    const sys = detectSystem({ platform: "darwin", arch: "arm64", osVersion: "23.0" });
    expect(sys.os).toBe("osx");
    expect(sys.arch).toBe("arm64");
  });

  it("maps linux/ia32 to linux/x86", () => {
    const sys = detectSystem({ platform: "linux", arch: "ia32", osVersion: "5.0" });
    expect(sys.arch).toBe("x86");
  });

  it("throws for unsupported platform", () => {
    expect(() => detectSystem({ platform: "freebsd" as never, arch: "x64" })).toThrowError(
      MinecraftKitError,
    );
  });

  it("throws for unsupported arch", () => {
    expect(() => detectSystem({ platform: "linux", arch: "mips" as never })).toThrowError(
      MinecraftKitError,
    );
  });

  it("uses process defaults when no input", () => {
    const sys = detectSystem();
    expect(["windows", "osx", "linux"]).toContain(sys.os);
  });
});
