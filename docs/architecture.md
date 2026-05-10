# Architecture (internal)

## Layering

```
src/cli/             ← interactive CLI; imports from public API only
src/kit.ts           ← public facade
src/index.ts         ← public re-exports
─────────────────────────────────────────────────────
src/install/         ← plan + execute install
src/verify/          ← per-aspect file checks
src/repair/          ← verify result → repair plan
src/launch/          ← argument composition + child process
src/update/          ← update wrapper over install
src/versions/        ← Mojang / Fabric / Forge / Adoptium resolvers
src/targets/         ← target resolution & discovery
─────────────────────────────────────────────────────
src/http/            ← HTTP client, cache, streaming download
src/core/            ← cross-cutting utils (fs, hash, archive, paths, rules, …)
src/types/           ← public type declarations
src/constants/       ← endpoint URLs, defaults, limits, file segments
```

Allowed dependency direction: any layer may depend on layers below it. CLI may not be imported
by anything except itself and the bin entry point. Domain modules (install / verify / repair /
launch / update / versions / targets) may not import from `src/cli/`.

## Public surface

The public surface is exactly what `src/index.ts` re-exports. Everything else is internal and
may be renamed or removed without a release note. The single entry class is
`MinecraftKit`; the standalone helpers (`verifyMinecraft`, `planMinecraftRepair`, etc.)
are exposed for consumers that want to avoid the facade.

## Key design choices

- **Stateless.** The library only writes files Minecraft itself expects (`versions/`,
  `libraries/`, `assets/`, `runtime/`). There is no launcher-private state, no persisted
  session, no profile registry. Consumers own all metadata about their installations.
- **Plan + execute split.** Every long-running operation (install, update, repair) produces an
  `InstallPlan` before it starts touching disk. Tests assert on plans; runners are tested
  separately with `FakeHttpClient` / `FakeSpawner`.
- **Dependency injection.** `HttpClient`, `MetadataCache`, `Spawner`, `Logger`, and
  `RuntimeSystem` are all injectable on the `MinecraftKit` constructor. The defaults are
  `FetchHttpClient` (node `fetch`), in-memory LRU cache, `ChildProcessSpawner`, silent logger,
  and `detectSystem()`.
- **Discriminated unions.** Install actions, launch events, install phases, loader kinds, and
  verification statuses all use literal-string discriminators. No magic strings in business
  code; values live in `src/constants/` or as `const` maps in `src/types/`.
- **No silent catches.** Empty `catch` blocks are allowed only with a one-line comment naming
  the explicit reason (e.g. "ENOENT during cleanup of temp file before throwing").

## Operation lifecycles

### Install
1. `planInstall` walks the target's vanilla manifest, asset index, runtime manifest, and loader
   metadata. It produces a flat `InstallAction[]`. **No disk writes happen during planning**
   except the Forge installer JAR (must be on disk to read `install_profile.json`).
2. `runInstall` consumes the plan: parallel downloads (concurrency = `DOWNLOAD_CONCURRENCY`),
   then atomic writes, then native extractions, then runtime symlinks/dirs, then Forge
   processors. Each phase emits `install:phase-changed`.
3. Downloads that match expected size + sha1 on disk are skipped automatically — install,
   update, and repair share this path.

### Verify
Per-aspect verifiers (`verifyMinecraft`, `verifyFabric`, `verifyForge`, `verifyRuntime`) each
walk the files they own. They emit one `verify:file-checked` event per file and return a
`VerificationResult` with the issue list. The shared `runVerification` helper in
`src/verify/helpers.ts` owns the timing/issue-array/emit boilerplate.

### Repair
A `VerificationResult` (or array thereof) feeds `planXxxRepair`. The shared `planAspectRepair`
helper in `src/repair/helpers.ts` builds an `InstallPlan` filtered to the aspect's actions,
keeping only those whose target file was reported as broken. The Forge planner adds a
defensive post-step: if the version JSON itself was missing, every forge-library plus all
processors are included (skip-on-correct keeps it cheap).

### Launch
1. `composeLaunch` resolves the on-disk version JSON chain (walking `inheritsFrom`), builds
   the classpath, computes every `${placeholder}` value, and folds the JVM/game args together.
2. `runLaunch` spawns the child via the injected `Spawner` and returns a `LaunchSession` with
   `pid`, `exited` promise, and an `abort()` method. Both the signal listener and `abort()`
   route through a single guarded `doAbort()` so events never double-emit.

## Where things live

- Error codes: `src/types/errors.ts` (`MinecraftKitErrorCode` union). Add new codes here; do not
  invent ad-hoc string codes at throw sites.
- Event names: `src/types/events.ts` (`EventTypes` const + `ProgressEvent` union).
- Phase names: `src/types/install.ts` (`InstallPhases`).
- Defaults/limits: `src/constants/defaults.ts` (timing, concurrency) and
  `src/constants/limits.ts` (archive caps).
- API endpoints: `src/constants/api.ts` (`ApiEndpoints`). No hard-coded URLs at call sites.
