import { describe, expect, it } from "vitest";
import { parseMavenMetadataVersions } from "../../src/core/xml";

describe("parseMavenMetadataVersions", () => {
  it("extracts versions", () => {
    const xml = `<metadata><versioning><versions>
      <version>1.0</version>
      <version>2.0</version>
    </versions></versioning></metadata>`;
    expect(parseMavenMetadataVersions(xml)).toEqual(["1.0", "2.0"]);
  });

  it("returns empty for missing versions", () => {
    expect(parseMavenMetadataVersions("<empty/>")).toEqual([]);
  });

  it("handles whitespace", () => {
    expect(parseMavenMetadataVersions("<version>  1.0  </version>")).toEqual(["1.0"]);
  });
});
