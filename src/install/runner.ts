import pLimit from "p-limit";
import { DOWNLOAD_CONCURRENCY, MAX_PROCESSOR_STDERR_LINES } from "../constants/defaults";
import { extractAllToDir, readJarMainClass } from "../core/archive";
import { MinecraftKitError } from "../core/errors";
import { atomicWrite } from "../core/fs";
import { sha1OfFile } from "../core/hash";
import { targetPaths } from "../core/paths";
import type { PauseController } from "../core/pause-controller";
import { downloadFile } from "../http/download";
import type { MetadataCache } from "../types/cache";
import type { ProgressListener } from "../types/events";
import type { HttpClient } from "../types/http";
import {
  type DownloadAction,
  type ExtractNativeAction,
  type InstallAction,
  InstallActionKinds,
  type InstallPlan,
  type InstallReport,
  type RunForgeProcessorAction,
  type WriteLoggingConfigAction,
  type WriteVersionJsonAction,
} from "../types/install";
import { type InstallPhase, InstallPhases } from "../types/install";
import { Loaders } from "../types/loader";
import type { Spawner } from "../types/spawner";
import type { OperatingSystem } from "../types/system";
import { planRuntimeDownloads } from "./runtime";
import { materializeRuntimeExtras } from "./runtime-extras";

/** Inputs to the install runner. */
export interface RunInstallInput {
  readonly plan: InstallPlan;
  readonly http: HttpClient;
  readonly cache: MetadataCache;
  readonly spawner: Spawner;
  readonly signal?: AbortSignal;
  readonly onEvent?: ProgressListener;
  readonly concurrency?: number;
  /** Checkpoint between top-level actions and group transitions. Does not interrupt in-flight downloads. */
  readonly pauseController?: PauseController;
  /** When set, only download actions in this set run; post-download steps that depend on them are skipped too. */
  readonly actionCategories?: ReadonlySet<DownloadAction["category"]>;
}

const DOWNLOAD_GROUPS: ReadonlyArray<{
  readonly categories: ReadonlyArray<DownloadAction["category"]>;
  readonly phase: InstallPhase;
}> = [
  { categories: ["runtime-file"], phase: InstallPhases.INSTALLING_RUNTIME },
  { categories: ["client-jar"], phase: InstallPhases.DOWNLOADING_CLIENT_JAR },
  { categories: ["library"], phase: InstallPhases.DOWNLOADING_LIBRARIES },
  { categories: ["asset-index"], phase: InstallPhases.DOWNLOADING_ASSET_INDEX },
  { categories: ["asset"], phase: InstallPhases.DOWNLOADING_ASSETS },
  { categories: ["logging-config"], phase: InstallPhases.WRITING_FILES },
  { categories: ["fabric-library"], phase: InstallPhases.INSTALLING_FABRIC },
  { categories: ["forge-installer", "forge-library"], phase: InstallPhases.INSTALLING_FORGE },
];

/** Execute an install plan. */
export async function runInstall(input: RunInstallInput): Promise<InstallReport> {
  const startedAt = Date.now();
  let bytesDownloaded = 0;
  let actionsCompleted = 0;
  let actionsSkipped = 0;
  const onEvent = input.onEvent;
  let currentPhase: InstallPhase | null = null;
  const enterPhase = (phase: InstallPhase): void => {
    if (phase === currentPhase) return;
    onEvent?.({ type: "install:phase-changed", phase, previous: currentPhase });
    currentPhase = phase;
  };

  const checkpoint = async (): Promise<void> => {
    if (input.signal?.aborted) {
      throw new MinecraftKitError("LAUNCH_ABORTED", "Install aborted by signal");
    }
    await input.pauseController?.waitWhilePaused();
    if (input.signal?.aborted) {
      throw new MinecraftKitError("LAUNCH_ABORTED", "Install aborted by signal");
    }
  };

  const categoryFilter = input.actionCategories;
  const downloads = input.plan.actions
    .filter(isDownload)
    .filter((a) => (categoryFilter ? categoryFilter.has(a.category) : true));
  const natives = input.plan.actions.filter(isNative);
  const writeActions = input.plan.actions.filter(isWrite);
  const processors = input.plan.actions.filter(isProcessor);

  enterPhase(InstallPhases.PLANNING);

  const limit = pLimit(input.concurrency ?? DOWNLOAD_CONCURRENCY);

  const runDownloadGroup = async (groupActions: readonly DownloadAction[]): Promise<void> => {
    await Promise.all(
      groupActions.map((action) =>
        limit(async () => {
          await checkpoint();
          const result = await downloadFile(input.http, {
            url: action.url,
            target: action.target,
            ...(action.expectedSha1 !== undefined ? { expectedSha1: action.expectedSha1 } : {}),
            ...(action.expectedSize !== undefined ? { expectedSize: action.expectedSize } : {}),
            ...(action.category !== undefined ? { category: action.category } : {}),
            ...(input.signal !== undefined ? { signal: input.signal } : {}),
            ...(input.onEvent !== undefined ? { onEvent: input.onEvent } : {}),
            ...(input.pauseController !== undefined
              ? { pauseController: input.pauseController }
              : {}),
          });
          bytesDownloaded += result.bytesDownloaded;
          if (result.skipped) actionsSkipped++;
          actionsCompleted++;
        }),
      ),
    );
  };

  for (const group of DOWNLOAD_GROUPS) {
    const groupActions = downloads.filter((action) => group.categories.includes(action.category));
    if (groupActions.length === 0) continue;
    await checkpoint();
    enterPhase(group.phase);
    await runDownloadGroup(groupActions);
  }

  // Future categories the consumer hasn't excluded fall back to the generic libraries phase.
  const ungrouped = downloads.filter(
    (action) => !DOWNLOAD_GROUPS.some((g) => g.categories.includes(action.category)),
  );
  if (ungrouped.length > 0) {
    await checkpoint();
    enterPhase(InstallPhases.DOWNLOADING_LIBRARIES);
    await runDownloadGroup(ungrouped);
  }

  if (writeActions.length > 0) {
    await checkpoint();
    enterPhase(InstallPhases.WRITING_FILES);
    for (const action of writeActions) {
      await checkpoint();
      await atomicWrite(action.path, action.content);
      actionsCompleted++;
    }
  }

  if (natives.length > 0) {
    await checkpoint();
    enterPhase(InstallPhases.EXTRACTING_NATIVES);
    for (const action of natives) {
      await checkpoint();
      const { fileCount } = await extractAllToDir(action.source, action.destination, {
        excludePrefixes: action.exclude as readonly string[],
      });
      input.onEvent?.({
        type: "archive:extracted",
        archive: action.source,
        target: action.destination,
        fileCount,
      });
      actionsCompleted++;
    }
  }

  if (input.plan.target.runtime !== undefined) {
    await checkpoint();
    enterPhase(InstallPhases.INSTALLING_RUNTIME);
    const runtimePlan = await planRuntimeDownloads({
      runtime: input.plan.target.runtime,
      directory: input.plan.directory,
      http: input.http,
      cache: input.cache,
      ...(input.signal !== undefined ? { signal: input.signal } : {}),
    });
    await materializeRuntimeExtras({
      runtime: input.plan.target.runtime,
      directory: input.plan.directory,
      manifest: runtimePlan.manifest,
    });
  }

  if (processors.length > 0) {
    await checkpoint();
    enterPhase(InstallPhases.RUNNING_FORGE_PROCESSORS);
    if (input.plan.target.loader.type !== Loaders.FORGE) {
      throw new MinecraftKitError(
        "FORGE_PROCESSOR_FAILED",
        "Forge processors planned for a non-Forge target",
      );
    }
    const javaPath = targetPaths.runtimeJavaExecutable(
      input.plan.directory,
      input.plan.target.runtime.component,
      input.plan.target.runtime.system.os as OperatingSystem,
      input.plan.target.runtime.installRoot,
    );
    for (const action of processors) {
      await checkpoint();
      await runProcessor({
        action,
        javaPath,
        spawner: input.spawner,
        ...(input.onEvent !== undefined ? { onEvent: input.onEvent } : {}),
        total: processors.length,
      });
      actionsCompleted++;
    }
  }

  enterPhase(InstallPhases.COMPLETED);

  return {
    targetId: input.plan.targetId,
    bytesDownloaded,
    actionsCompleted,
    actionsSkipped,
    durationMs: Date.now() - startedAt,
  };
}

function isDownload(action: InstallAction): action is DownloadAction {
  return action.kind === InstallActionKinds.DOWNLOAD_FILE;
}

function isNative(action: InstallAction): action is ExtractNativeAction {
  return action.kind === InstallActionKinds.EXTRACT_NATIVE;
}

function isProcessor(action: InstallAction): action is RunForgeProcessorAction {
  return action.kind === InstallActionKinds.RUN_FORGE_PROCESSOR;
}

function isWrite(
  action: InstallAction,
): action is WriteVersionJsonAction | WriteLoggingConfigAction {
  return (
    action.kind === InstallActionKinds.WRITE_VERSION_JSON ||
    action.kind === InstallActionKinds.WRITE_LOGGING_CONFIG
  );
}

/** Inputs to {@link runProcessor}. */
export interface RunProcessorInput {
  readonly action: RunForgeProcessorAction;
  readonly javaPath: string;
  readonly spawner: Spawner;
  readonly onEvent?: ProgressListener;
  readonly total: number;
}

/** Execute a single Forge processor and verify its declared outputs. */
export async function runProcessor(input: RunProcessorInput): Promise<void> {
  const startedAt = Date.now();
  // Resolve Main-Class from the processor JAR (always classpath[0]) now that all
  // libraries have been downloaded. Deferring this from planning to runtime is what
  // lets newer Forge versions work, since their processor JARs ship as regular Maven
  // libraries instead of being bundled inside the installer.
  const processorJar = input.action.classpath[0];
  if (processorJar === undefined) {
    throw new MinecraftKitError(
      "FORGE_INSTALLER_INVALID",
      "Forge processor has an empty classpath",
      { context: { processorIndex: input.action.index } },
    );
  }
  const mainClass = await readJarMainClass(processorJar);
  if (!mainClass) {
    throw new MinecraftKitError(
      "FORGE_INSTALLER_INVALID",
      `Forge processor jar has no Main-Class: ${processorJar}`,
      { context: { filePath: processorJar } },
    );
  }
  const classpathSeparator = process.platform === "win32" ? ";" : ":";
  const args = [
    "-cp",
    input.action.classpath.join(classpathSeparator),
    mainClass,
    ...input.action.args,
  ];
  input.onEvent?.({
    type: "forge:processor-started",
    processor: { index: input.action.index, mainClass },
    total: input.total,
  });
  const stderrTail: string[] = [];
  const child = input.spawner.spawn(input.javaPath, args, { cwd: process.cwd() });
  child.stdout.on("data", () => {
    // Forge processors print noisy progress to stdout; we don't surface it.
  });
  child.stderr.on("data", (line) => {
    if (stderrTail.length >= MAX_PROCESSOR_STDERR_LINES) stderrTail.shift();
    stderrTail.push(line);
  });
  const exit = await child.exited;
  if (exit.code !== 0) {
    throw new MinecraftKitError(
      "FORGE_PROCESSOR_FAILED",
      `Forge processor exited with code ${exit.code ?? "(signal)"}: ${mainClass}`,
      {
        context: {
          exitCode: exit.code ?? undefined,
          mainClass,
          stderr: stderrTail.join("\n"),
        },
      },
    );
  }
  input.onEvent?.({
    type: "forge:processor-completed",
    processor: { index: input.action.index, mainClass },
    exitCode: exit.code ?? 0,
    durationMs: Date.now() - startedAt,
  });
  for (const [outputPath, expectedSha1] of Object.entries(input.action.outputs)) {
    const sha1 = await sha1OfFile(outputPath);
    if (sha1 !== expectedSha1) {
      throw new MinecraftKitError(
        "FORGE_PROCESSOR_FAILED",
        `Processor output hash mismatch: ${outputPath}`,
        { context: { filePath: outputPath, expectedHash: expectedSha1, actualHash: sha1 } },
      );
    }
    input.onEvent?.({
      type: "forge:processor-output-verified",
      processor: { index: input.action.index, mainClass },
      path: outputPath,
    });
  }
}
