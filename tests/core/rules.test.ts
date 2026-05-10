import { describe, expect, it } from "vitest";
import { archDigit, evaluateRules, resolveArchPlaceholder } from "../../src/core/rules";

const linuxX64 = { os: "linux" as const, arch: "x64" as const, osVersion: "5.0" };
const macX64 = { os: "osx" as const, arch: "x64" as const, osVersion: "23.0" };
const winX86 = { os: "windows" as const, arch: "x86" as const, osVersion: "10.0" };

describe("library rules", () => {
  it("returns true with no rules", () => {
    expect(evaluateRules(undefined, { system: linuxX64 })).toBe(true);
    expect(evaluateRules([], { system: linuxX64 })).toBe(true);
  });

  it("respects allow on matching os", () => {
    expect(evaluateRules([{ action: "allow", os: { name: "linux" } }], { system: linuxX64 })).toBe(
      true,
    );
  });

  it("respects disallow on matching os", () => {
    expect(
      evaluateRules([{ action: "allow" }, { action: "disallow", os: { name: "osx" } }], {
        system: macX64,
      }),
    ).toBe(false);
  });

  it("does not apply rule when os does not match", () => {
    expect(evaluateRules([{ action: "allow", os: { name: "linux" } }], { system: macX64 })).toBe(
      false,
    );
  });

  it("matches arch with x86 normalization", () => {
    expect(evaluateRules([{ action: "allow", os: { arch: "x86" } }], { system: winX86 })).toBe(
      true,
    );
  });

  it("rejects when version regex does not match", () => {
    expect(
      evaluateRules([{ action: "allow", os: { name: "linux", version: "^99\\." } }], {
        system: linuxX64,
      }),
    ).toBe(false);
  });

  it("rejects on invalid regex", () => {
    expect(
      evaluateRules([{ action: "allow", os: { name: "linux", version: "(unclosed" } }], {
        system: linuxX64,
      }),
    ).toBe(false);
  });

  it("evaluates feature flags correctly", () => {
    expect(
      evaluateRules([{ action: "allow", features: { is_demo_user: true } }], {
        system: linuxX64,
        features: { is_demo_user: true },
      }),
    ).toBe(true);
    expect(
      evaluateRules([{ action: "allow", features: { is_demo_user: true } }], { system: linuxX64 }),
    ).toBe(false);
    expect(
      evaluateRules([{ action: "allow", features: { is_demo_user: false } }], { system: linuxX64 }),
    ).toBe(true);
  });

  it("resolveArchPlaceholder substitutes", () => {
    expect(resolveArchPlaceholder("natives-windows-${arch}", "64")).toBe("natives-windows-64");
  });

  it("archDigit maps arch to suffix", () => {
    expect(archDigit("x86")).toBe("32");
    expect(archDigit("x64")).toBe("64");
    expect(archDigit("arm64")).toBe("64");
  });
});
