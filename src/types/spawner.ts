/** Stream-of-text channel exposed by spawned processes. */
export interface ProcessStream {
  on(event: "data", listener: (chunk: string) => void): void;
}

/** Live handle for a child process. */
export interface SpawnedProcess {
  readonly pid: number;
  readonly stdout: ProcessStream;
  readonly stderr: ProcessStream;
  /** Resolves when the process exits with its exit info. */
  readonly exited: Promise<{
    readonly code: number | null;
    readonly signal: NodeJS.Signals | null;
  }>;
  /** Send a termination signal. Returns true on success. */
  kill(signal?: NodeJS.Signals): boolean;
}

/** Options accepted by the spawner. */
export interface SpawnOptions {
  readonly cwd: string;
  readonly env?: Readonly<Record<string, string>>;
}

/**
 * Pluggable process spawner. The default implementation uses `node:child_process`; tests
 * inject a fake to avoid spawning real processes.
 */
export interface Spawner {
  spawn(command: string, args: readonly string[], options: SpawnOptions): SpawnedProcess;
}
