import { describe, expect, it } from "vitest";
import { mergeManifest } from "../../src/core/manifest-merge";
import type { MinecraftVersionManifest } from "../../src/types/minecraft";

const baseDownload = { sha1: "x", size: 1, url: "https://x" };

const parent: MinecraftVersionManifest = {
  id: "1.20.1",
  type: "release",
  mainClass: "net.minecraft.client.main.Main",
  assetIndex: { id: "5", sha1: "x", size: 1, totalSize: 1, url: "https://x" },
  assets: "5",
  downloads: { client: baseDownload },
  libraries: [{ name: "a:b:1" }],
  arguments: { game: ["--parent"], jvm: [] },
};

const child: MinecraftVersionManifest = {
  id: "fabric-1.20.1",
  type: "release",
  mainClass: "fabric.Main",
  assetIndex: parent.assetIndex,
  assets: "5",
  downloads: { client: baseDownload },
  libraries: [{ name: "x:y:1" }],
  arguments: { game: ["--child"], jvm: [] },
  inheritsFrom: "1.20.1",
};

describe("mergeManifest", () => {
  it("uses child id and main class", () => {
    const result = mergeManifest(parent, child);
    expect(result.id).toBe("fabric-1.20.1");
    expect(result.mainClass).toBe("fabric.Main");
  });

  it("concatenates libraries", () => {
    const result = mergeManifest(parent, child);
    expect(result.libraries.map((l) => l.name)).toEqual(["a:b:1", "x:y:1"]);
  });

  it("concatenates arguments", () => {
    const result = mergeManifest(parent, child);
    expect(result.arguments?.game).toEqual(["--parent", "--child"]);
  });

  it("falls back to parent when child fields missing", () => {
    const childMinimal = { ...child, mainClass: undefined } as unknown as MinecraftVersionManifest;
    const result = mergeManifest(parent, childMinimal);
    expect(result.mainClass).toBe(parent.mainClass);
  });

  it("returns undefined arguments when neither side has them", () => {
    const noArgsParent = { ...parent, arguments: undefined };
    const noArgsChild = { ...child, arguments: undefined };
    const result = mergeManifest(noArgsParent, noArgsChild);
    expect(result.arguments).toBeUndefined();
  });
});
