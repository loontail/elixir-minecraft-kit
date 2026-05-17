import type {
  ArgumentEntry,
  MinecraftArguments,
  MinecraftLibrary,
  MinecraftVersionManifest,
} from "../types/minecraft";
import { parseMavenCoordinate } from "./maven";

/**
 * Merge a child Minecraft version manifest with its parent (resolved through `inheritsFrom`).
 *
 * Rules:
 *  - Scalar fields (`mainClass`, `assetIndex`, `assets`, `type`, `minecraftArguments`,
 *    `javaVersion`, `logging`) — child overrides parent when defined, otherwise parent value.
 *  - `libraries` — deduped by `group:artifact[:classifier]` with child winning. Fabric's
 *    Knot loader and modern Forge ship version-pinned copies of intrinsic libraries
 *    (ASM, mixin, intermediary, …) that must replace vanilla's copies on the classpath.
 *  - `arguments.game` / `arguments.jvm` — additive concat.
 *  - `downloads` — shallow merge; child wins on conflict.
 */
export function mergeManifest(
  parent: MinecraftVersionManifest,
  child: MinecraftVersionManifest,
): MinecraftVersionManifest {
  const merged: MinecraftVersionManifest = {
    id: child.id || parent.id,
    type: child.type ?? parent.type,
    mainClass: child.mainClass ?? parent.mainClass,
    assetIndex: child.assetIndex ?? parent.assetIndex,
    assets: child.assets ?? parent.assets,
    downloads: { ...parent.downloads, ...child.downloads },
    libraries: mergeLibraries(parent.libraries, child.libraries),
    arguments: mergeArguments(parent.arguments, child.arguments),
    minecraftArguments: child.minecraftArguments ?? parent.minecraftArguments,
    javaVersion: child.javaVersion ?? parent.javaVersion,
    logging: child.logging ?? parent.logging,
    inheritsFrom: child.inheritsFrom ?? parent.inheritsFrom,
    releaseTime: child.releaseTime ?? parent.releaseTime,
    time: child.time ?? parent.time,
    minimumLauncherVersion: child.minimumLauncherVersion ?? parent.minimumLauncherVersion,
    complianceLevel: child.complianceLevel ?? parent.complianceLevel,
  };
  return merged;
}

function libraryDedupeKey(library: MinecraftLibrary): string | null {
  if (!library.name) return null;
  try {
    const coord = parseMavenCoordinate(library.name);
    const classifier = coord.classifier ? `:${coord.classifier}` : "";
    return `${coord.group}:${coord.artifact}${classifier}`;
  } catch {
    return null;
  }
}

function mergeLibraries(
  parent: readonly MinecraftLibrary[],
  child: readonly MinecraftLibrary[],
): readonly MinecraftLibrary[] {
  // Fabric Knot's classpath verifier rejects two copies of intrinsic libraries
  // (ASM, mixin, intermediary, …). Dedupe by `group:artifact[:classifier]` with
  // child winning — loader profiles pin versions compatible with themselves.
  // Libraries without a parseable Maven coordinate fall through to a separate
  // bucket so their ordering relative to others is preserved.
  const byKey = new Map<string, MinecraftLibrary>();
  const unkeyed: MinecraftLibrary[] = [];
  for (const lib of [...parent, ...child]) {
    const key = libraryDedupeKey(lib);
    if (key === null) {
      unkeyed.push(lib);
      continue;
    }
    byKey.set(key, lib);
  }
  return [...byKey.values(), ...unkeyed];
}

function mergeArguments(
  parent: MinecraftArguments | undefined,
  child: MinecraftArguments | undefined,
): MinecraftArguments | undefined {
  if (!parent && !child) return undefined;
  const parentGame: readonly ArgumentEntry[] = parent?.game ?? [];
  const parentJvm: readonly ArgumentEntry[] = parent?.jvm ?? [];
  const childGame: readonly ArgumentEntry[] = child?.game ?? [];
  const childJvm: readonly ArgumentEntry[] = child?.jvm ?? [];
  return {
    game: [...parentGame, ...childGame],
    jvm: [...parentJvm, ...childJvm],
  };
}
