import process from "node:process";

/**
 * When set to a truthy value, every auth step writes a short trace line to stderr — token
 * lengths, endpoint URLs, response previews. Intentionally stderr-only so it doesn't pollute
 * clack's rendered UI on stdout.
 */
export const DEBUG_ENV_VAR = "MINECRAFT_KIT_AUTH_DEBUG";

/** Print a single debug line if {@link DEBUG_ENV_VAR} is enabled. */
export function authDebug(message: string): void {
  if (process.env[DEBUG_ENV_VAR]) {
    process.stderr.write(`[auth] ${message}\n`);
  }
}
