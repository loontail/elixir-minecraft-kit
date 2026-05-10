/** HTTP request timeout for metadata calls, in milliseconds. */
export const HTTP_TIMEOUT_MS = 30_000;

/** Maximum retry attempts for transient HTTP failures. */
export const HTTP_RETRY_MAX = 4;

/** Base delay for exponential backoff, in milliseconds. */
export const HTTP_RETRY_BACKOFF_BASE_MS = 500;

/** Maximum delay for exponential backoff, in milliseconds. */
export const HTTP_RETRY_BACKOFF_CAP_MS = 30_000;

/**
 * Default per-host concurrency for downloads. The runner uses a worker-pool: when one file
 * finishes, the next file in the queue starts immediately. There is no batch barrier.
 */
export const DOWNLOAD_CONCURRENCY = 32;

/** TTL for in-memory metadata cache entries, in milliseconds. */
export const CACHE_TTL_MS = 5 * 60_000;

/** Maximum number of entries kept in the metadata cache. */
export const CACHE_MAX_ENTRIES = 256;

/** User-agent value sent on every HTTP request. */
export const USER_AGENT = "elixir-minecraft-kit/0.1";

/** Default launcher brand sent through `${launcher_name}`. */
export const DEFAULT_LAUNCHER_NAME = "elixir-minecraft-kit";

/** Default launcher version sent through `${launcher_version}`. */
export const DEFAULT_LAUNCHER_VERSION = "0.1.0";

/** Default min heap size in megabytes. */
export const DEFAULT_MIN_MB = 1024;

/** Default max heap size in megabytes. */
export const DEFAULT_MAX_MB = 4096;

/** Time after a SIGTERM before escalating to SIGKILL when aborting a launch. */
export const DEFAULT_KILL_GRACE_MS = 5_000;

/** Throttle interval for emitting download:progress events (in milliseconds). */
export const PROGRESS_EVENT_INTERVAL_MS = 100;

/** Maximum number of stderr lines retained from a Forge processor for diagnostics. */
export const MAX_PROCESSOR_STDERR_LINES = 20;

/**
 * Maximum bytes per line emitted by {@link ChildProcessSpawner}. Lines longer than this
 * are split: a Minecraft crash that prints megabytes of unbroken text should not exhaust
 * memory inside the launcher.
 */
export const SPAWNER_MAX_LINE_BYTES = 64 * 1024;
