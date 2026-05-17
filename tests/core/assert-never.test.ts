import { describe, expect, it } from "vitest";
import { assertNever } from "../../src/core/assert-never";

describe("assertNever", () => {
  it("throws with a JSON-encoded description of the unhandled value", () => {
    expect(() => assertNever("unexpected" as never)).toThrow(/Unhandled variant: "unexpected"/);
  });

  it("encodes objects via JSON.stringify", () => {
    expect(() => assertNever({ kind: "ghost" } as never)).toThrow(
      /Unhandled variant: \{"kind":"ghost"\}/,
    );
  });
});
