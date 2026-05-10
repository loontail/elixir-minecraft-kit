# Modules (internal)

One-paragraph orientation per source module. For deep dives read the source — these notes
exist so you don't have to grep for "where does X live".

## `src/cli/`

Interactive `mckit` CLI built on Clack prompts. **Must not import from domain modules** — calls
only `kit.*` and types.

- `index.ts` — bin entry; calls `bin()` from `main.ts`.
- `main.ts` — `runCli` dispatcher and `MAIN_MENU` list.
- `ui.ts` — `Ui` abstraction with `select`, `text`, `confirm`, `spinner`, `note`, `log`, plus
  `searchableSelect`. Has a `createStubUi` factory used by tests.
- `progress.ts` — `ProgressRenderer` consumes `ProgressEvent`s and prints a bar. Also exports
  `formatBytes` / `formatDuration` (the only copies in the codebase).
- `error-format.ts` — `MinecraftKitError` → user-facing text. Domain code never formats
  user strings.
- `scenarios.ts` — thin re-export hub over `scenarios/`.
- `scenarios/types.ts` — `ScenarioContext`, `ScenarioOutcome`, `InstallSelection`,
  `CHANNEL_OPTIONS`.
- `scenarios/pickers.ts` — every interactive picker (channel, version, runtime, install type,
  Fabric loader, Forge build, directory, installed target, runtime component, runtime install
  root).
- `scenarios/install-helpers.ts` — install plan/run plumbing, summary formatting, `defaultIdFor`.
- `scenarios/install.ts` — `scenarioInstallMinecraft` (the unified wizard) and
  `scenarioInstallRuntime` (standalone JRE).
- `scenarios/verify-repair.ts` — `scenarioVerify` and `scenarioRepair`.
- `scenarios/launch.ts` — `scenarioLaunch`.
- `scenarios/inspect.ts` — `scenarioInspect`.

## `src/core/`

Cross-cutting utilities. Bottom of the dependency graph.

- `archive.ts` — zip/jar reading with zip-bomb guards (entry count, file size, total size,
  compression ratio). `readJarMainClass` parses `META-INF/MANIFEST.MF` with line-fold handling.
- `collections.ts` — `dedupe` / `dedupeBy` helpers (used by Forge install planner).
- `errors.ts` — `MinecraftKitError` class and `isMinecraftKitError` / `isErrorCode` guards.
- `fs.ts` — `ensureDir`, `fileExists`, `dirExists`, `fileSize`, `atomicWrite` (temp + rename),
  `readText`, `readBytes`, `listChildDirectories`, `chmodExecutable`, `assertWithinRoot`
  (zip-slip defence).
- `hash.ts` — `sha1OfFile` (streaming).
- `logger.ts` — `silentLogger` (default) and `consoleLogger`.
- `lzma.ts` — `decodeLzma` for Mojang runtime sidecars (LZMA1 "alone" format).
- `manifest-merge.ts` — merge a child Minecraft manifest with its `inheritsFrom` parent.
- `maven.ts` — `parseMavenCoordinate`, `mavenRelativePath`, and `mavenRelativePathFor`.
- `paths.ts` — `targetPaths.*` — every per-target directory layout helper. Hard-coded path
  segments live in `src/constants/files.ts`.
- `retry.ts` — `withRetry` (full-jitter exponential backoff) and `isHttpRetryable`.
- `rules.ts` — `evaluateRules` (Mojang OS/feature rule semantics) and `resolveArchPlaceholder`.
- `system.ts` — `detectSystem` (host OS / arch detection).
- `throttle.ts` — wrap a `ProgressListener` to rate-limit `download:progress` events.
- `uuid.ts` — `offlineUuidFor` (Mojang's `MD5("OfflinePlayer:" + name)`) and
  `stripUuidDashes`.
- `xml.ts` — `parseMavenMetadataVersions` (regex-based; Maven metadata is rigid enough).

## `src/http/`

- `client.ts` — `FetchHttpClient` (the default `HttpClient`). Uses a `Symbol` sentinel to tell
  timer-driven aborts apart from parent-signal aborts.
- `download.ts` — `downloadFile`: streaming sha1, atomic temp + rename, skip-on-correct,
  retry-with-backoff, `download:*` events.
- `cache.ts` — `createMemoryCache` (LRU-backed `MetadataCache`).
- `metadata.ts` — `fetchJson` and `fetchText` (cached GET helpers).

## `src/install/`

- `planner.ts` — `planInstall` aggregates vanilla / library / asset / logging / runtime /
  loader actions into a flat `InstallPlan`.
- `runner.ts` — `runInstall` executes a plan. Owns the parallel download pool
  (`DOWNLOAD_CONCURRENCY`), the write loop, native extraction, runtime materialisation, and
  Forge processor execution.
- `assets.ts` — `planAssetDownloads` (fetches the asset index, dedupes by hash).
- `libraries.ts` — `planLibraryDownloads` (walks library entries, evaluates OS rules,
  emits download + native-extraction actions).
- `fabric-install.ts` — `planFabricInstall` (profile JSON write + libraries).
- `forge-install.ts` — `planForgeInstall` (download installer, extract `maven/` entries,
  parse `install_profile.json` + version.json, resolve tokens, build processor actions).
- `runtime.ts` — `planRuntimeDownloads` (file-type entries of a runtime manifest).
- `runtime-extras.ts` — `materializeRuntimeExtras` (directory placeholders + symlinks; falls
  back to `copyFile` when symlinks are forbidden; throws if both fail).
- `runtime-install.ts` — `planRuntimeInstall` (target-bound) and
  `planStandaloneRuntimeInstall` (no Minecraft target needed).

## `src/launch/`

- `compose.ts` — `composeLaunch`. Thin orchestrator: validates auth, resolves the version
  chain, builds the classpath, defers placeholder computation and argument composition.
- `placeholder-values.ts` — `buildPlaceholderValues` (maps auth + paths → `${...}` table).
- `args-composition.ts` — `composeArgs` (JVM and game arg pipeline: memory + base + macOS +
  manifest-jvm + logging + extra; manifest-game + extra + resolution/fullscreen).
- `placeholders.ts` — `substituteArg` / `substituteArgs` (the actual `${}` replacement).
- `classpath.ts` — `buildClasspath` (library entries → absolute path list + version jar).
- `version-resolution.ts` — `resolveLaunchVersion` (loads + merges the on-disk version JSON),
  `pickClientJarVersionId` (which jar lands on the classpath for loader installs).
- `arguments.ts` — `flattenArguments` / `splitLegacyArguments` / `pickArguments` (rule-aware
  manifest argument flattening).
- `runner.ts` — `runLaunch` spawns the child and returns a `LaunchSession`. A single
  `doAbort()` guards both the signal listener and the manual abort method.
- `spawner.ts` — `ChildProcessSpawner` (the default). Bounds line buffers at
  `SPAWNER_MAX_LINE_BYTES` to keep launcher memory flat under pathological output.

## `src/verify/`

- `helpers.ts` — `runVerification` boilerplate, `verifyHashedFile`, `verifyExistence`,
  `findForgeVersionJsonPath`.
- `minecraft.ts`, `fabric.ts`, `forge.ts`, `runtime.ts` — per-aspect verifiers.

## `src/repair/`

- `helpers.ts` — `IssueIndex`, `selectRepairActions`, `buildRepairPlan`,
  `planAspectRepair` (the shared template used by every aspect planner).
- `minecraft.ts`, `fabric.ts`, `forge.ts`, `runtime.ts` — per-aspect repair planners (each
  ~30 LOC after the M6 refactor).
- `runner.ts` — `runRepair` is a thin wrapper that calls `runInstall` on the repair plan.

## `src/update/`

- `runner.ts` — `planUpdate` is `planInstall` directly; `runUpdate` is `runInstall` plus a
  report-shape adjustment. The update concept exists for user-facing clarity, not internal
  difference.

## `src/versions/`

- `context.ts` — `ResolverContext` (DI bundle: http, cache, logger).
- `minecraft.ts` — `MinecraftVersionsApi` (list / latest / get / resolve). Vanilla-loader
  wrapping is inline in `TargetsApi.resolve`; there is no dedicated method.
- `fabric.ts` — `FabricVersionsApi` (list / resolve).
- `forge.ts` — `ForgeVersionsApi` (list / resolve via Maven metadata + promotions).
- `runtime.ts` — `RuntimeVersionsApi` (list / resolve via Mojang runtime index).

## `src/targets/`

- `index.ts` — `TargetsApi` with `create`, `resolve`, and `list` (filesystem scan that
  discovers `versions/*` and infers loaders).
