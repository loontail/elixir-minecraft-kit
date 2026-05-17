/**
 * Coarse-grained install phases. Used in `install:phase-changed` events so consumers can
 * render a progress bar with named steps.
 */
export const InstallPhases = {
  PLANNING: "planning",
  DOWNLOADING_VERSION_MANIFEST: "downloading-version-manifest",
  DOWNLOADING_CLIENT_JAR: "downloading-client-jar",
  DOWNLOADING_LIBRARIES: "downloading-libraries",
  DOWNLOADING_ASSET_INDEX: "downloading-asset-index",
  DOWNLOADING_ASSETS: "downloading-assets",
  EXTRACTING_NATIVES: "extracting-natives",
  INSTALLING_RUNTIME: "installing-runtime",
  INSTALLING_FABRIC: "installing-fabric",
  INSTALLING_FORGE: "installing-forge",
  RUNNING_FORGE_PROCESSORS: "running-forge-processors",
  WRITING_FILES: "writing-files",
  COMPLETED: "completed",
} as const;

/** Install phase literal. */
export type InstallPhase = (typeof InstallPhases)[keyof typeof InstallPhases];

/** Action kinds inside an {@link InstallPlan}. */
export const InstallActionKinds = {
  DOWNLOAD_FILE: "download-file",
  EXTRACT_NATIVE: "extract-native",
  RUN_FORGE_PROCESSOR: "run-forge-processor",
  WRITE_VERSION_JSON: "write-version-json",
  WRITE_LOGGING_CONFIG: "write-logging-config",
} as const;

/** Discriminator for an install action. */
export type InstallActionKind = (typeof InstallActionKinds)[keyof typeof InstallActionKinds];

/** A single download step. */
export type DownloadAction = {
  readonly kind: typeof InstallActionKinds.DOWNLOAD_FILE;
  readonly url: string;
  readonly target: string;
  readonly expectedSha1?: string;
  readonly expectedSize?: number;
  readonly category:
    | "client-jar"
    | "library"
    | "asset-index"
    | "asset"
    | "logging-config"
    | "fabric-library"
    | "forge-library"
    | "runtime-file"
    | "forge-installer";
};

/** A native extraction step. Source jar must already exist on disk. */
export type ExtractNativeAction = {
  readonly kind: typeof InstallActionKinds.EXTRACT_NATIVE;
  readonly source: string;
  readonly destination: string;
  readonly exclude: readonly string[];
};

/**
 * A Forge processor invocation. `Main-Class` is intentionally NOT carried here — the
 * runner reads it from `classpath[0]`'s manifest at execution time, because the JAR is
 * not guaranteed to exist on disk during planning (newer Forge versions ship some
 * processor JARs as regular Maven libraries instead of bundling them in the installer).
 */
export type RunForgeProcessorAction = {
  readonly kind: typeof InstallActionKinds.RUN_FORGE_PROCESSOR;
  readonly index: number;
  /** First entry is the processor JAR; remaining entries are its declared classpath. */
  readonly classpath: readonly string[];
  readonly args: readonly string[];
  readonly outputs: Readonly<Record<string, string>>;
};

/** Write a version JSON to disk (Fabric / Forge). */
export type WriteVersionJsonAction = {
  readonly kind: typeof InstallActionKinds.WRITE_VERSION_JSON;
  readonly path: string;
  readonly content: string;
};

/** Write a logging config (log4j XML) to disk. */
export type WriteLoggingConfigAction = {
  readonly kind: typeof InstallActionKinds.WRITE_LOGGING_CONFIG;
  readonly path: string;
  readonly content: string;
};

/** Discriminated union of install actions. */
export type InstallAction =
  | DownloadAction
  | ExtractNativeAction
  | RunForgeProcessorAction
  | WriteVersionJsonAction
  | WriteLoggingConfigAction;

/**
 * A "runtime-only" install plan target. Used by `planStandaloneRuntimeInstall` to plan a
 * JRE-only install without a Minecraft version/loader pinned to the plan.
 */
export type RuntimeOnlyInstallTarget = {
  readonly id: string;
  readonly directory: string;
  readonly runtime: import("./runtime").ResolvedRuntime;
  readonly minecraft?: undefined;
  readonly loader?: undefined;
};

/**
 * Shape of `InstallPlan.target`. Either a fully-resolved {@link import("./target").Target} or a
 * runtime-only stand-in. The install runner only reads `target.minecraft`/`target.loader` when
 * the plan actually contains those steps, so runtime-only plans are safe.
 */
export type InstallPlanTarget = import("./target").Target | RuntimeOnlyInstallTarget;

/**
 * Pre-computed install plan: a flat ordered list of actions plus computed totals.
 *
 * The runner consumes this; nothing is downloaded or written during planning. The plan
 * carries a reference to the resolved target so the runner does not need a second target
 * argument.
 */
export type InstallPlan = {
  readonly targetId: string;
  readonly directory: string;
  readonly target: InstallPlanTarget;
  readonly actions: readonly InstallAction[];
  readonly totalBytes: number;
  readonly totalActions: number;
};

/** Outcome summary returned by `install.run`. */
export type InstallReport = {
  readonly targetId: string;
  readonly bytesDownloaded: number;
  readonly actionsCompleted: number;
  readonly actionsSkipped: number;
  readonly durationMs: number;
};
