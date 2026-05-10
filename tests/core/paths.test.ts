import { describe, expect, it } from "vitest";
import { targetPaths } from "../../src/core/paths";

describe("targetPaths", () => {
  it("computes versionsDir / versionDir / versionJar", () => {
    expect(targetPaths.versionsDir("/r")).toContain("versions");
    expect(targetPaths.versionDir("/r", "1.20.1")).toContain("1.20.1");
    expect(targetPaths.versionJar("/r", "1.20.1")).toContain("1.20.1.jar");
    expect(targetPaths.versionJson("/r", "1.20.1")).toContain("1.20.1.json");
  });

  it("computes asset paths", () => {
    expect(targetPaths.assetIndex("/r", "5")).toContain("5.json");
    const objectPath = targetPaths.assetObject("/r", "abcdef1234567890");
    expect(objectPath).toContain("ab");
    expect(objectPath).toContain("abcdef1234567890");
    expect(targetPaths.assetVirtual("/r", "x")).toContain("virtual");
    expect(targetPaths.assetLegacy("/r", "x")).toContain("legacy");
    expect(targetPaths.assetResource("/r", "x")).toContain("resources");
    expect(targetPaths.loggingConfig("/r", "id.xml")).toContain("id.xml");
  });

  it("computes natives directory", () => {
    expect(targetPaths.nativesDir("/r", "1.20.1")).toContain("natives");
  });

  it("computes runtime executable path on each OS", () => {
    expect(targetPaths.runtimeJavaExecutable("/r", "java-runtime-gamma", "windows")).toContain(
      "javaw",
    );
    expect(targetPaths.runtimeJavaExecutable("/r", "java-runtime-gamma", "osx")).toContain(
      "jre.bundle",
    );
    expect(targetPaths.runtimeJavaExecutable("/r", "java-runtime-gamma", "linux")).toContain(
      "java",
    );
  });

  it("computes forge installer path", () => {
    expect(targetPaths.forgeInstaller("/r", "1.20.1-47.2.0")).toContain("47.2.0");
  });

  it("computes libraries dir", () => {
    expect(targetPaths.librariesDir("/r")).toContain("libraries");
    expect(targetPaths.libraryFile("/r", "a/b.jar")).toContain("b.jar");
  });

  it("computes runtime root", () => {
    expect(targetPaths.runtimeRoot("/r", "java-runtime-gamma")).toContain("java-runtime-gamma");
  });
});
