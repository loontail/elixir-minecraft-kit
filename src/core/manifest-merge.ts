import type {
  ArgumentEntry,
  MinecraftArguments,
  MinecraftLibrary,
  MinecraftVersionManifest,
} from "../types/minecraft";

/**
 * Merge a child Minecraft version manifest with its parent (resolved through `inheritsFrom`).
 *
 * Rules:
 *  - Scalar fields (`mainClass`, `assetIndex`, `assets`, `type`, `minecraftArguments`,
 *    `javaVersion`, `logging`) — child overrides parent when defined, otherwise parent value.
 *  - `libraries` — additive concat (parent first, child appended). No dedup; later loaders rely on this.
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

function mergeLibraries(
  parent: readonly MinecraftLibrary[],
  child: readonly MinecraftLibrary[],
): readonly MinecraftLibrary[] {
  return [...parent, ...child];
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
