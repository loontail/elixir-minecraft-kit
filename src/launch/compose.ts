import { MinecraftKitError } from "../core/errors";
import { targetPaths } from "../core/paths";
import type { LaunchComposition, LaunchOptions } from "../types/launch";
import type { Target } from "../types/target";
import { composeArgs } from "./args-composition";
import { buildClasspath } from "./classpath";
import { buildPlaceholderValues } from "./placeholder-values";
import { pickClientJarVersionId, resolveLaunchVersion } from "./version-resolution";

/** Inputs to {@link composeLaunch}. */
export interface ComposeLaunchInput {
  readonly target: Target;
  readonly options: LaunchOptions;
}

/** Build a fully resolved {@link LaunchComposition} ready to hand to {@link runLaunch}. */
export async function composeLaunch(input: ComposeLaunchInput): Promise<LaunchComposition> {
  const { target, options } = input;
  if (!options.auth.username || options.auth.username.length === 0) {
    throw new MinecraftKitError(
      "INVALID_INPUT",
      `Auth username must be non-empty (target ${target.id})`,
      { context: { targetId: target.id } },
    );
  }

  const resolved = await resolveLaunchVersion(target);
  const javaPath = targetPaths.runtimeJavaExecutable(
    target.directory,
    target.runtime.component,
    target.runtime.system.os,
    target.runtime.installRoot,
  );

  // Walk the inheritsFrom chain to find the version id whose `.jar` actually exists on
  // disk: Fabric and modern Forge leave their own `versions/<id>/<id>.jar` absent and
  // expect the vanilla client jar to land on the classpath instead.
  const clientJarVersionId = await pickClientJarVersionId(target.directory, resolved.chain);
  const classpath = buildClasspath({
    directory: target.directory,
    versionId: clientJarVersionId,
    merged: resolved.merged,
    system: target.runtime.system,
  });

  const features = buildFeatures(options);
  const placeholderValues = buildPlaceholderValues({
    target,
    versionId: resolved.versionId,
    auth: options.auth,
    classpath,
    options,
  });
  const composed = composeArgs({
    target,
    merged: resolved.merged,
    options,
    placeholderValues,
    features,
  });

  return {
    targetId: target.id,
    directory: target.directory,
    javaPath,
    mainClass: resolved.merged.mainClass,
    jvmArgs: composed.jvmArgs,
    gameArgs: composed.gameArgs,
    classpath,
    nativesDirectory: targetPaths.nativesDir(target.directory, target.minecraft.version),
    auth: options.auth,
    workingDirectory: target.directory,
  };
}

function buildFeatures(options: LaunchOptions): Readonly<Record<string, boolean>> {
  const features: Record<string, boolean> = { ...(options.features ?? {}) };
  if (options.resolution !== undefined) {
    features.has_custom_resolution = true;
  }
  return features;
}
