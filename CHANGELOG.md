# Changelog

## Unreleased

### Breaking changes

- **Renames** — every public identifier that started with `Elixir` has dropped the prefix:
  - `ElixirMinecraftKit` → `MinecraftKit`
  - `ElixirMinecraftKitOptions` → `MinecraftKitOptions`
  - `ElixirMinecraftKitError` → `MinecraftKitError` (the class's `name` property changed to
    match)
  - `ElixirErrorCode` → `MinecraftKitErrorCode`
  - `ElixirErrorContext` → `MinecraftKitErrorContext`
  - `isElixirError` → `isMinecraftKitError`
  The package name itself (`@elixir/minecraft-kit`) is unchanged.
- **Forge data directory** renamed from `libraries/elixir-forge-data/` to
  `libraries/forge-data/`. Re-running install / repair will populate the new location;
  the old folder is harmless and can be deleted.
- **TypeScript module resolution** switched from `NodeNext` to `Bundler`. Source files no
  longer use `.js` extensions in relative imports. Consumers of the published package are
  unaffected — the dist bundle ships valid ESM as before.
- `InstallPhases.WRITING_LOGGING_CONFIG` removed. Use `InstallPhases.WRITING_FILES`
  (string `"writing-files"`) which covers both version-JSON and logging-config writes.
- `core/fs.isExecutableSync` removed (no production callers).
- `core/hash.sha1OfBytes` removed (no production callers — was only used by tests).
- `core/maven.isSameMavenArtifact` removed (no production callers).
- `http/metadata.fetchBytes` removed (no production callers).
- `constants/maven.NEOFORGE_MAVEN_BASE` removed (NeoForge is not implemented).
- `install/forge-install.__internal` removed (was only used by tests; tests now use the
  regular surface).
- `install/planner.downloadActionsOnly` removed (no callers).
- `RepairAspectInput` interfaces consolidated into a single `AspectRepairInput`. Per-aspect
  `Plan<Aspect>RepairInput` are now type aliases — the field shape is unchanged.
- `UpdateReport` now includes `actionsSkipped: number`.
- `MinecraftVersionsApi.resolveVanillaLoader` removed. The method had a single internal
  caller (`TargetsApi.resolve`) and re-fetched the Minecraft manifest that the caller had
  already resolved one line above. The wrap is now inlined in `TargetsApi.resolve` and
  reuses the resolved Minecraft, eliminating the duplicate fetch. Build a
  `ResolvedVanillaLoader` manually if you need one outside the facade:
  `{ type: Loaders.VANILLA, minecraftVersion: m.version, minecraft: m }`.

### Added

- `EventTypes` const map and `EventType` literal type — stable references for every
  `ProgressEvent.type` value.
- `MAX_PROCESSOR_STDERR_LINES` and `SPAWNER_MAX_LINE_BYTES` constants.

### Fixed

- `install/runtime-extras.ts` no longer silently swallows symlink + copy failures on
  Windows; throws `FILESYSTEM_WRITE_ERROR` with both errors as context so a missing runtime
  binary surfaces immediately instead of failing later at launch with a cryptic "java not
  found".
- `install/runner.ts` phase logic: `WRITING_FILES` is now entered once before the write
  loop, regardless of action kind (previously the phase was only set inside the
  `WRITE_VERSION_JSON` branch).
- `verify/forge.ts` now surfaces a CORRUPT issue when the Forge version JSON fails to
  parse, instead of silently skipping library verification.
- `http/client.ts` distinguishes timeout from abort by reference-equality on a `Symbol`
  sentinel instead of string-matching the error message.
- `launch/runner.ts` abort logic deduplicated through a single guarded `doAbort()`; both
  the signal listener and the manual `abort()` method now route through it without risk of
  double-emitting `launch:aborted`.
- `launch/version-resolution.ts` throws `MANIFEST_NOT_FOUND` for an empty `inheritsFrom`
  chain instead of returning an empty string.
- `launch/spawner.ts` bounds per-line memory at `SPAWNER_MAX_LINE_BYTES` (64 KiB); a
  pathological crash dump no longer exhausts launcher memory.
- `http/download.ts` `download:failed.willRetry` flag now derives from `HTTP_RETRY_MAX`
  rather than a hard-coded `3`.

### Internal

- Verify aspect runners share a single `runVerification` helper.
- Repair aspect planners share a single `planAspectRepair` helper.
- `forge-install.ts` uses generic `dedupeBy` / `dedupe` from `core/collections.ts`.
- `cli/scenarios.ts` (1084 LOC) split into a `cli/scenarios/` folder with per-scenario
  files plus shared pickers / install-helpers / types modules.
- `launch/compose.ts` (206 LOC) split into `placeholder-values.ts` and `args-composition.ts`
  plus a thin orchestrator.
- Documentation rebuilt: internal docs in `docs/`, public docs in `docs-site/`. Old `docs/`
  pages that duplicated `docs-site/guides` have been removed.

## 0.1.0

Initial release.

- Stateless TypeScript Minecraft launcher library.
- Versions API for Minecraft, Fabric, Forge modern, and Mojang Java runtimes.
- Install / verify / repair / update / launch flows.
- Interactive CLI `emk`.
- Discriminated-union progress events.
- Centralised error model with a structured `code` discriminator.
