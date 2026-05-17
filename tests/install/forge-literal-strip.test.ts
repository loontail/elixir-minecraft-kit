import { describe, expect, it } from "vitest";
import { stripLiteralPrefix } from "../../src/install/forge-install";

describe("stripLiteralPrefix", () => {
  it("strips both leading and trailing single quotes", () => {
    // Forge processor outputs from install_profile.json wrap literal SHA-1
    // expected hashes in single quotes — both must be stripped or the
    // post-processor hash check fails with a false-positive mismatch.
    expect(stripLiteralPrefix("'bbe5ec9c5b3968997952df1b547f5b4db47b6dec'")).toBe(
      "bbe5ec9c5b3968997952df1b547f5b4db47b6dec",
    );
  });

  it("strips a leading quote when no trailing quote is present", () => {
    expect(stripLiteralPrefix("'abc")).toBe("abc");
  });

  it("strips a trailing quote when no leading quote is present", () => {
    expect(stripLiteralPrefix("abc'")).toBe("abc");
  });

  it("passes through values with no wrapping quotes", () => {
    expect(stripLiteralPrefix("plain-value")).toBe("plain-value");
  });

  it("returns empty string when input is a pair of empty quotes", () => {
    expect(stripLiteralPrefix("''")).toBe("");
  });
});
