import { describe, expect, it } from "vitest";
import { assertSafeEntryName } from "../../src/core/archive";
import { MinecraftKitError } from "../../src/core/errors";

describe("assertSafeEntryName", () => {
  it("rejects empty", () => {
    expect(() => assertSafeEntryName("")).toThrowError(MinecraftKitError);
  });

  it("rejects null bytes", () => {
    expect(() => assertSafeEntryName(`a${String.fromCharCode(0)}b`)).toThrowError(
      MinecraftKitError,
    );
  });

  it("rejects absolute paths", () => {
    expect(() => assertSafeEntryName("/etc/passwd")).toThrowError(MinecraftKitError);
    expect(() => assertSafeEntryName("C:/Windows")).toThrowError(MinecraftKitError);
    expect(() => assertSafeEntryName("\\Windows")).toThrowError(MinecraftKitError);
  });

  it("rejects parent traversal", () => {
    expect(() => assertSafeEntryName("../escape")).toThrowError(MinecraftKitError);
  });

  it("rejects reserved Windows names", () => {
    expect(() => assertSafeEntryName("CON")).toThrowError(MinecraftKitError);
    expect(() => assertSafeEntryName("nul.txt")).toThrowError(MinecraftKitError);
  });

  it("rejects trailing dots/spaces", () => {
    expect(() => assertSafeEntryName("foo. ")).toThrowError(MinecraftKitError);
  });

  it("accepts safe names", () => {
    expect(() => assertSafeEntryName("foo/bar/baz.txt")).not.toThrow();
  });
});
