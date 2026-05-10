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
export interface DownloadAction {
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
}

/** A native extraction step. Source jar must already exist on disk. */
export interface ExtractNativeAction {
  readonly kind: typeof InstallActionKinds.EXTRACT_NATIVE;
  readonly source: string;
  readonly destination: string;
  readonly exclude: readonly string[];
}

/** A Forge processor invocation. */
export interface RunForgeProcessorAction {
  readonly kind: typeof InstallActionKinds.RUN_FORGE_PROCESSOR;
  readonly index: number;
  readonly mainClass: string;
  readonly classpath: readonly string[];
  readonly args: readonly string[];
  readonly outputs: Readonly<Record<string, string>>;
}

/** Write a version JSON to disk (Fabric / Forge). */
export interface WriteVersionJsonAction {
  readonly kind: typeof InstallActionKinds.WRITE_VERSION_JSON;
  readonly path: string;
  readonly content: string;
}

/** Write a logging config (log4j XML) to disk. */
export interface WriteLoggingConfigAction {
  readonly kind: typeof InstallActionKinds.WRITE_LOGGING_CONFIG;
  readonly path: string;
  readonly content: string;
}

/** Discriminated union of install actions. */
export type InstallAction =
  | DownloadAction
  | ExtractNativeAction
  | RunForgeProcessorAction
  | WriteVersionJsonAction
  | WriteLoggingConfigAction;

/**
 * Pre-computed install plan: a flat ordered list of actions plus computed totals.
 *
 * The runner consumes this; nothing is downloaded or written during planning. The plan
 * carries a reference to the resolved target so the runner does not need a second target
 * argument.
 */
export interface InstallPlan {
  readonly targetId: string;
  readonly directory: string;
  readonly target: import("./target").Target;
  readonly actions: readonly InstallAction[];
  readonly totalBytes: number;
  readonly totalActions: number;
}

/** Outcome summary returned by `install.run`. */
export interface InstallReport {
  readonly targetId: string;
  readonly bytesDownloaded: number;
  readonly actionsCompleted: number;
  readonly actionsSkipped: number;
  readonly durationMs: number;
}
