import { describe, expect, it } from "vitest";
import { flattenArguments, pickArguments, splitLegacyArguments } from "../../src/launch/arguments";
import type { RuntimeSystem } from "../../src/types/system";

const system: RuntimeSystem = { os: "windows", arch: "x64", osVersion: "10.0" };

describe("launch arguments", () => {
  it("flattenArguments includes plain strings", () => {
    expect(flattenArguments(["a", "b"], { system })).toEqual(["a", "b"]);
  });

  it("flattenArguments evaluates rules and keeps string value", () => {
    const result = flattenArguments(
      [{ rules: [{ action: "allow", os: { name: "windows" } }], value: "--ok" }],
      { system },
    );
    expect(result).toEqual(["--ok"]);
  });

  it("flattenArguments accepts array values", () => {
    const result = flattenArguments([{ rules: [{ action: "allow" }], value: ["--a", "1"] }], {
      system,
    });
    expect(result).toEqual(["--a", "1"]);
  });

  it("flattenArguments drops disallowed entries", () => {
    const result = flattenArguments(
      [{ rules: [{ action: "allow", os: { name: "linux" } }], value: "--linux-only" }],
      { system },
    );
    expect(result).toEqual([]);
  });

  it("splitLegacyArguments splits on whitespace", () => {
    expect(splitLegacyArguments("--a 1 --b 2")).toEqual(["--a", "1", "--b", "2"]);
  });

  it("splitLegacyArguments returns [] for empty", () => {
    expect(splitLegacyArguments("")).toEqual([]);
  });

  it("pickArguments returns both arrays", () => {
    const result = pickArguments({ game: ["g"], jvm: ["j"] }, { system });
    expect(result.game).toEqual(["g"]);
    expect(result.jvm).toEqual(["j"]);
  });

  it("pickArguments handles undefined", () => {
    const result = pickArguments(undefined, { system });
    expect(result.game).toEqual([]);
    expect(result.jvm).toEqual([]);
  });
});
