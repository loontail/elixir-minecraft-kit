import { planInstall } from "../install/planner";
import { runInstall } from "../install/runner";
import type { MetadataCache } from "../types/cache";
import type { ProgressListener } from "../types/events";
import type { HttpClient } from "../types/http";
import type { Spawner } from "../types/spawner";
import type { Target } from "../types/target";
import type { UpdatePlan, UpdateReport } from "../types/update";

/** Inputs to {@link planUpdate}. */
export interface PlanUpdateInput {
  readonly target: Target;
  readonly http: HttpClient;
  readonly cache: MetadataCache;
  readonly signal?: AbortSignal;
}

/**
 * Build an update plan. Structurally identical to an install plan — the install runner
 * already skips files whose on-disk size + sha1 match the manifest, so "update" and
 * "install" share the same action list.
 */
export async function planUpdate(input: PlanUpdateInput): Promise<UpdatePlan> {
  return planInstall({
    target: input.target,
    http: input.http,
    cache: input.cache,
    ...(input.signal !== undefined ? { signal: input.signal } : {}),
  });
}

/** Inputs to the update runner. */
export interface RunUpdateInput {
  readonly plan: UpdatePlan;
  readonly http: HttpClient;
  readonly cache: MetadataCache;
  readonly spawner: Spawner;
  readonly signal?: AbortSignal;
  readonly onEvent?: ProgressListener;
}

/**
 * Execute an update plan. Reuses the install runner; already-correct files are skipped
 * automatically and counted in the `actionsSkipped` field of the report.
 */
export async function runUpdate(input: RunUpdateInput): Promise<UpdateReport> {
  const report = await runInstall({
    plan: input.plan,
    http: input.http,
    cache: input.cache,
    spawner: input.spawner,
    ...(input.signal !== undefined ? { signal: input.signal } : {}),
    ...(input.onEvent !== undefined ? { onEvent: input.onEvent } : {}),
  });
  return {
    targetId: report.targetId,
    bytesDownloaded: report.bytesDownloaded,
    actionsCompleted: report.actionsCompleted,
    actionsSkipped: report.actionsSkipped,
    durationMs: report.durationMs,
  };
}
