import type { InstallAction } from "./install";

/** Update plan — additive list of actions to bring an installation up to date. */
export interface UpdatePlan {
  readonly targetId: string;
  readonly directory: string;
  readonly target: import("./target").Target;
  readonly actions: readonly InstallAction[];
  readonly totalBytes: number;
  readonly totalActions: number;
}

/** Update report. */
export interface UpdateReport {
  readonly targetId: string;
  readonly bytesDownloaded: number;
  readonly actionsCompleted: number;
  /** Actions that found their target already correct on disk and were skipped. */
  readonly actionsSkipped: number;
  readonly durationMs: number;
}
