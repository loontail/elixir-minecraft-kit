import { LogLevels } from "../types/logger";
import type { LogLevel, Logger } from "../types/logger";

/** Logger that drops every message. Default when no logger is supplied. */
export const silentLogger: Logger = {
  log() {
    // Intentionally empty.
  },
};

/** Logger that mirrors messages to `console.<level>` with structured fields. */
export const consoleLogger: Logger = {
  log(level, message, fields) {
    const target = pickConsole(level);
    if (fields !== undefined) {
      target(`[${level}] ${message}`, fields);
    } else {
      target(`[${level}] ${message}`);
    }
  },
};

function pickConsole(level: LogLevel): (...args: unknown[]) => void {
  if (level === LogLevels.ERROR) return console.error.bind(console);
  if (level === LogLevels.WARN) return console.warn.bind(console);
  if (level === LogLevels.INFO) return console.info.bind(console);
  return console.debug.bind(console);
}
