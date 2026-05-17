import path from "node:path";
import { ApiEndpoints } from "../constants/api";
import { extractSingleEntry, openZip, readEntryBuffer } from "../core/archive";
import { dedupe, dedupeBy } from "../core/collections";
import { MinecraftKitError } from "../core/errors";
import { atomicWrite } from "../core/fs";
import { parseJsonStrict } from "../core/json";
import { mavenRelativePathFor } from "../core/maven";
import { targetPaths } from "../core/paths";
import { evaluateRules } from "../core/rules";
import { downloadFile } from "../http/download";
import type { MetadataCache } from "../types/cache";
import type { ProgressListener } from "../types/events";
import type {
  ForgeInstallProfile,
  ForgeProcessor,
  ForgeVersionJson,
  ResolvedForgeLoader,
} from "../types/forge";
import type { HttpClient } from "../types/http";
import {
  type DownloadAction,
  InstallActionKinds,
  type RunForgeProcessorAction,
  type WriteVersionJsonAction,
} from "../types/install";
import type { ResolvedMinecraft } from "../types/minecraft";
import type { RuntimeSystem } from "../types/system";
import { planLibraryDownloads } from "./libraries";

/** Outputs of {@link planForgeInstall}. */
export interface ForgeInstallPlan {
  readonly installerDownload: DownloadAction;
  readonly libraryDownloads: readonly DownloadAction[];
  readonly classpathFiles: readonly string[];
  readonly processorActions: readonly RunForgeProcessorAction[];
  readonly versionJson: WriteVersionJsonAction;
  readonly versionId: string;
  readonly profile: ForgeInstallProfile;
  readonly version: ForgeVersionJson;
}

/** Inputs to {@link planForgeInstall}. */
export interface PlanForgeInstallInput {
  readonly loader: ResolvedForgeLoader;
  readonly minecraft: ResolvedMinecraft;
  readonly directory: string;
  readonly system: RuntimeSystem;
  readonly http: HttpClient;
  readonly cache: MetadataCache;
  readonly signal?: AbortSignal;
  readonly onEvent?: ProgressListener;
}

/**
 * Plan the Forge install steps. Downloads the installer, parses install_profile + version.json,
 * extracts embedded artifacts to `libraries/`, and prepares processor invocations.
 */
export async function planForgeInstall(input: PlanForgeInstallInput): Promise<ForgeInstallPlan> {
  const installerPath = targetPaths.forgeInstaller(input.directory, input.loader.fullVersion);
  await downloadFile(input.http, {
    url: input.loader.installerUrl,
    target: installerPath,
    category: "forge-installer",
    ...(input.signal !== undefined ? { signal: input.signal } : {}),
    ...(input.onEvent !== undefined ? { onEvent: input.onEvent } : {}),
  });

  const installerDownload: DownloadAction = {
    kind: InstallActionKinds.DOWNLOAD_FILE,
    url: input.loader.installerUrl,
    target: installerPath,
    category: "forge-installer",
  };

  const profile = await readJsonEntry<ForgeInstallProfile>(installerPath, "install_profile.json");
  const versionRelative = profile.json.startsWith("/") ? profile.json.slice(1) : profile.json;
  const version = await readJsonEntry<ForgeVersionJson>(installerPath, versionRelative);

  await extractInstallerMavenEntries(installerPath, input.directory);

  const dataResolved = await resolveProfileData({
    profile,
    installerPath,
    directory: input.directory,
  });

  const installerLibraries = planLibraryDownloads({
    libraries: profile.libraries,
    directory: input.directory,
    system: input.system,
    versionId: input.minecraft.version,
    category: "forge-library",
  });
  const versionLibraries = planLibraryDownloads({
    libraries: version.libraries,
    directory: input.directory,
    system: input.system,
    versionId: version.id,
    category: "forge-library",
  });

  const dedupedDownloads = dedupeBy(
    [...installerLibraries.downloads, ...versionLibraries.downloads],
    (action) => action.target,
  );
  const classpathFiles = dedupe([
    ...installerLibraries.classpathFiles,
    ...versionLibraries.classpathFiles,
  ]);

  const processorActions = await buildProcessorActions({
    profile,
    minecraft: input.minecraft,
    installerPath,
    directory: input.directory,
    system: input.system,
    dataResolved,
  });

  const versionJsonPath = targetPaths.versionJson(input.directory, version.id);
  const versionJson: WriteVersionJsonAction = {
    kind: InstallActionKinds.WRITE_VERSION_JSON,
    path: versionJsonPath,
    content: `${JSON.stringify(version, null, 2)}\n`,
  };

  return {
    installerDownload,
    libraryDownloads: dedupedDownloads,
    classpathFiles,
    processorActions,
    versionJson,
    versionId: version.id,
    profile,
    version,
  };
}

async function readJsonEntry<T>(zipPath: string, entryName: string): Promise<T> {
  const buffer = await readEntryBuffer(zipPath, entryName);
  if (!buffer) {
    throw new MinecraftKitError(
      "FORGE_INSTALLER_INVALID",
      `Forge installer is missing required entry: ${entryName}`,
      { context: { filePath: zipPath, entryName } },
    );
  }
  return parseJsonStrict<T>(buffer.toString("utf8"), {
    code: "FORGE_INSTALLER_INVALID",
    message: `Forge installer entry is not valid JSON: ${entryName}`,
    context: { filePath: zipPath, entryName },
  });
}

async function extractInstallerMavenEntries(
  installerPath: string,
  directory: string,
): Promise<void> {
  const reader = await openZip(installerPath);
  try {
    for await (const entry of reader.entries()) {
      if (!entry.name.startsWith("maven/") || entry.isDirectory) continue;
      const relativeWithinLibraries = entry.name.slice("maven/".length);
      const destination = path.join(targetPaths.librariesDir(directory), relativeWithinLibraries);
      const buffer = await entry.readBuffer();
      await atomicWrite(destination, buffer);
    }
  } finally {
    reader.close();
  }
}

interface ResolvedProfileData {
  readonly tokens: Readonly<Record<string, ResolvedTokenValue>>;
}

interface ResolvedTokenValue {
  /** Final string used in argument substitution. */
  readonly value: string;
  /** When true, the value is an on-disk path; otherwise it is a literal. */
  readonly isPath: boolean;
}

async function resolveProfileData(input: {
  readonly profile: ForgeInstallProfile;
  readonly installerPath: string;
  readonly directory: string;
}): Promise<ResolvedProfileData> {
  const tokens: Record<string, ResolvedTokenValue> = {};
  for (const [key, sided] of Object.entries(input.profile.data)) {
    const raw = sided.client;
    tokens[key] = await resolveDataValue(raw, input.installerPath, input.directory);
  }
  return { tokens };
}

async function resolveDataValue(
  raw: string,
  installerPath: string,
  directory: string,
): Promise<ResolvedTokenValue> {
  if (raw.startsWith("[") && raw.endsWith("]")) {
    const coord = raw.slice(1, -1);
    const relativePath = mavenRelativePathFor(coord);
    return {
      value: path.join(targetPaths.librariesDir(directory), relativePath),
      isPath: true,
    };
  }
  if (raw.startsWith("'")) {
    return { value: raw.slice(1), isPath: false };
  }
  if (raw.startsWith("/")) {
    const entryName = raw.slice(1);
    const destination = path.join(targetPaths.librariesDir(directory), "forge-data", entryName);
    await extractSingleEntry(installerPath, entryName, destination);
    return { value: destination, isPath: true };
  }
  return { value: raw, isPath: false };
}

async function buildProcessorActions(input: {
  readonly profile: ForgeInstallProfile;
  readonly minecraft: ResolvedMinecraft;
  readonly installerPath: string;
  readonly directory: string;
  readonly system: RuntimeSystem;
  readonly dataResolved: ResolvedProfileData;
}): Promise<readonly RunForgeProcessorAction[]> {
  const builtIns: Record<string, ResolvedTokenValue> = {
    SIDE: { value: "client", isPath: false },
    MINECRAFT_JAR: {
      value: targetPaths.versionJar(input.directory, input.minecraft.version),
      isPath: true,
    },
    MINECRAFT_VERSION: { value: input.minecraft.version, isPath: false },
    ROOT: { value: input.directory, isPath: true },
    INSTALLER: { value: input.installerPath, isPath: true },
    LIBRARY_DIR: { value: targetPaths.librariesDir(input.directory), isPath: true },
  };
  const tokens: Readonly<Record<string, ResolvedTokenValue>> = {
    ...builtIns,
    ...input.dataResolved.tokens,
  };
  const actions: RunForgeProcessorAction[] = [];
  let index = 0;
  for (const processor of input.profile.processors) {
    if (!processorAppliesToClient(processor)) {
      continue;
    }
    if (!evaluateRules([], { system: input.system })) {
      // Currently processors do not carry rules; placeholder for future expansion.
    }
    const action = buildProcessorAction({
      processor,
      directory: input.directory,
      tokens,
      index,
    });
    actions.push(action);
    index++;
  }
  return actions;
}

function processorAppliesToClient(processor: ForgeProcessor): boolean {
  if (!processor.sides || processor.sides.length === 0) return true;
  return processor.sides.includes("client");
}

function buildProcessorAction(input: {
  readonly processor: ForgeProcessor;
  readonly directory: string;
  readonly tokens: Readonly<Record<string, ResolvedTokenValue>>;
  readonly index: number;
}): RunForgeProcessorAction {
  const jarPath = path.join(
    targetPaths.librariesDir(input.directory),
    mavenRelativePathFor(input.processor.jar),
  );
  // Note: `Main-Class` is read from the JAR at runtime, not here. Newer Forge versions
  // ship some processor JARs as regular Maven libraries that haven't been downloaded
  // yet at planning time.
  const classpath = [
    jarPath,
    ...input.processor.classpath.map((coord) =>
      path.join(targetPaths.librariesDir(input.directory), mavenRelativePathFor(coord)),
    ),
  ];
  const args = input.processor.args.map((arg) => substituteToken(arg, input.tokens));
  const outputs: Record<string, string> = {};
  if (input.processor.outputs) {
    for (const [key, value] of Object.entries(input.processor.outputs)) {
      outputs[substituteToken(key, input.tokens)] = stripLiteralPrefix(
        substituteToken(value, input.tokens),
      );
    }
  }
  return {
    kind: InstallActionKinds.RUN_FORGE_PROCESSOR,
    index: input.index,
    classpath,
    args,
    outputs,
  };
}

function substituteToken(
  raw: string,
  tokens: Readonly<Record<string, ResolvedTokenValue>>,
): string {
  if (raw.startsWith("[") && raw.endsWith("]")) {
    return path.join(...mavenRelativePathFor(raw.slice(1, -1)).split("/"));
  }
  return raw.replaceAll(/\{([A-Z0-9_]+)\}/g, (match, key: string) => {
    const token = tokens[key];
    if (token === undefined) {
      throw new MinecraftKitError("FORGE_INSTALLER_INVALID", `Unknown processor token: ${match}`, {
        context: { token: key },
      });
    }
    return token.value;
  });
}

/** @internal */
export function stripLiteralPrefix(value: string): string {
  // Forge install_profile.json wraps literal values in single quotes (vs `{token}` /
  // `[g:a:v]` maven coords). Both quotes must be stripped.
  const stripped = value.startsWith("'") ? value.slice(1) : value;
  return stripped.endsWith("'") ? stripped.slice(0, -1) : stripped;
}

/** Build the Forge installer download URL. Used by repair flows that need to refetch. */
export function forgeInstallerUrl(fullVersion: string): string {
  return ApiEndpoints.forge.installer(fullVersion);
}
