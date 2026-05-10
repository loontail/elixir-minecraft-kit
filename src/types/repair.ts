import type { MetadataCache } from "./cache";
import type { HttpClient } from "./http";
import type { InstallAction } from "./install";
import type { Target } from "./target";
import type { VerificationResult } from "./verify";

/** Coarse-grained repair phases used for `repair:phase-changed` events. */
export const RepairPhases = {
  PLANNING: "planning",
  REPAIRING_CLIENT_JAR: "repairing-client-jar",
  REPAIRING_LIBRARIES: "repairing-libraries",
  REPAIRING_ASSETS: "repairing-assets",
  REPAIRING_NATIVES: "repairing-natives",
  REPAIRING_RUNTIME: "repairing-runtime",
  REPAIRING_LOADER: "repairing-loader",
  COMPLETED: "completed",
} as const;

/** Repair phase literal. */
export type RepairPhase = (typeof RepairPhases)[keyof typeof RepairPhases];

/**
 * A repair plan is, structurally, an install plan limited to actions needed to fix the
 * issues reported by a previous {@link VerificationResult}. The runner is the same.
 */
export interface RepairPlan {
  readonly targetId: string;
  readonly directory: string;
  readonly target: import("./target").Target;
  readonly actions: readonly InstallAction[];
  readonly totalBytes: number;
  readonly totalActions: number;
}

/** Repair report — same shape as install report. */
export interface RepairReport {
  readonly targetId: string;
  readonly bytesDownloaded: number;
  readonly actionsCompleted: number;
  readonly durationMs: number;
}

/**
 * Inputs accepted by every aspect-specific `planXxxRepair` (`planMinecraftRepair`,
 * `planFabricRepair`, `planForgeRepair`, `planRuntimeRepair`). The per-aspect input types
 * are aliases over this shape.
 */
export interface AspectRepairInput {
  readonly target: Target;
  readonly from: VerificationResult | readonly VerificationResult[];
  readonly http: HttpClient;
  readonly cache: MetadataCache;
  readonly signal?: AbortSignal;
}
