import { describe, expect, it } from "vitest";
import { MinecraftKitError } from "../../src/core/errors";
import {
  mavenRelativePath,
  mavenRelativePathFor,
  parseMavenCoordinate,
} from "../../src/core/maven";

describe("maven coordinates", () => {
  it("parses three-part coords", () => {
    const coord = parseMavenCoordinate("com.example:lib:1.0");
    expect(coord).toEqual({
      group: "com.example",
      artifact: "lib",
      version: "1.0",
      extension: "jar",
    });
  });

  it("parses with classifier", () => {
    const coord = parseMavenCoordinate("com.example:lib:1.0:natives-windows");
    expect(coord.classifier).toBe("natives-windows");
  });

  it("parses with extension", () => {
    const coord = parseMavenCoordinate("com.example:lib:1.0@zip");
    expect(coord.extension).toBe("zip");
  });

  it("strips brackets", () => {
    const coord = parseMavenCoordinate("[com.example:lib:1.0]");
    expect(coord.group).toBe("com.example");
  });

  it("rejects too few parts", () => {
    expect(() => parseMavenCoordinate("com.example:lib")).toThrowError(MinecraftKitError);
  });

  it("rejects too many parts", () => {
    expect(() => parseMavenCoordinate("a:b:c:d:e")).toThrowError(MinecraftKitError);
  });

  it("rejects empty parts", () => {
    expect(() => parseMavenCoordinate("a::1.0")).toThrowError(MinecraftKitError);
  });

  it("builds relative path", () => {
    expect(mavenRelativePathFor("com.example:lib:1.0")).toBe("com/example/lib/1.0/lib-1.0.jar");
  });

  it("builds relative path with classifier", () => {
    expect(mavenRelativePathFor("com.example:lib:1.0:natives")).toBe(
      "com/example/lib/1.0/lib-1.0-natives.jar",
    );
  });

  it("builds relative path with extension", () => {
    expect(mavenRelativePathFor("com.example:lib:1.0@zip")).toBe("com/example/lib/1.0/lib-1.0.zip");
  });

  it("mavenRelativePath builds without parsing", () => {
    expect(mavenRelativePath({ group: "x.y", artifact: "z", version: "1", extension: "jar" })).toBe(
      "x/y/z/1/z-1.jar",
    );
  });
});
