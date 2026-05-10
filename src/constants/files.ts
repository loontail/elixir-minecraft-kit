/**
 * Relative-path segments used to build per-target directory layouts.
 *
 * These are SEGMENTS — never use them as absolute paths. Compose with `path.join` at call sites.
 */
export const VERSIONS_DIR = "versions";
export const LIBRARIES_DIR = "libraries";
export const ASSETS_DIR = "assets";
export const ASSETS_OBJECTS_DIR = "assets/objects";
export const ASSETS_INDEXES_DIR = "assets/indexes";
export const ASSETS_VIRTUAL_DIR = "assets/virtual";
export const ASSETS_LEGACY_DIR = "assets/virtual/legacy";
export const ASSETS_RESOURCES_DIR = "resources";
export const ASSETS_LOG_CONFIGS_DIR = "assets/log_configs";
export const RUNTIMES_DIR = "runtime";
export const NATIVES_DIR_NAME = "natives";
export const FORGE_INSTALLERS_DIR = "forge-installers";

/** Java executable filename per OS (relative to the runtime root). */
export const JAVA_EXECUTABLE = {
  windows: "bin/javaw.exe",
  windowsConsole: "bin/java.exe",
  linux: "bin/java",
  /** Note: macOS uses an extra `jre.bundle/Contents/Home/` prefix above this. */
  osx: "bin/java",
} as const;

/** macOS runtime layout adds this prefix above {@link JAVA_EXECUTABLE.osx}. */
export const MAC_RUNTIME_PREFIX = "jre.bundle/Contents/Home";
