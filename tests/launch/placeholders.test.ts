import { describe, expect, it } from "vitest";
import { MinecraftKitError } from "../../src/core/errors";
import { substituteArg, substituteArgs } from "../../src/launch/placeholders";

describe("placeholders", () => {
  it("substitutes placeholders", () => {
    expect(substituteArg("hello ${name}", { name: "world" })).toBe("hello world");
  });

  it("rejects unknown placeholders", () => {
    expect(() => substituteArg("${missing}", {})).toThrowError(MinecraftKitError);
  });

  it("substituteArgs maps the array", () => {
    expect(substituteArgs(["${a}", "x"], { a: "1" })).toEqual(["1", "x"]);
  });
});
