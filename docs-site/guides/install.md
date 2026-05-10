# Install

The install API splits planning from execution. `plan()` produces a flat list of actions
without touching the disk (with one exception, noted below); `run()` executes them.

## Plan

```ts
const plan = await kit.install.plan(target);
console.log(`${plan.totalActions} actions, ${plan.totalBytes} bytes`);
```

`InstallPlan` carries every action the runner will perform: client jar + libraries + assets +
logging config + runtime files + (for Fabric/Forge) loader profile JSON and libraries + (for
Forge) processor invocations.

**Disk during planning.** The only file written during `plan()` is the Forge installer JAR.
Forge planning needs to read `install_profile.json` from inside that JAR before it can emit
the rest of the plan, so the JAR is downloaded into `versions/forge-installers/`. Vanilla,
Fabric, and runtime planning are pure metadata.

## Run

```ts
await kit.install.run(plan, {
  onEvent: (event) => console.log(event.type),
  signal: controller.signal,
});
```

The runner:

- downloads files in parallel (`DOWNLOAD_CONCURRENCY = 32`);
- skips any download whose target file already matches the expected size + SHA-1;
- emits typed `download:*`, `integrity:*`, `archive:*`, `forge:*`, and
  `install:phase-changed` events;
- runs Forge processors sequentially using the installed Mojang JDK;
- verifies each processor's declared output files by SHA-1.

`run()` throws an `MinecraftKitError` on the first fatal failure (HTTP error after the
retry budget, hash mismatch, processor failure, abort signal). Per-file network failures that
are retryable are reflected via `download:failed` events with `willRetry: true` and do not
abort the operation.

## Runtime-only installs

To install just a Java runtime — no Minecraft, no libraries, no assets — use the standalone
flow:

```ts
const runtime = await kit.versions.runtime.resolve({
  system: kit.targets.system,
  component: "java-runtime-gamma",
});

const plan = await kit.install.runtime.standalonePlan({
  id: "shared-jre",
  directory: "/opt/minecraft-runtimes",
  runtime,
});

await kit.install.runtime.run(plan, {
  onEvent: (event) => console.log(event.type),
});
```

`standalonePlan` produces a regular `InstallPlan` so it runs through the same `install.runtime.run`
entry point. The plan contains only `DOWNLOAD_FILE` actions for the runtime files — no
client jar, no libraries.

## Update

`kit.update.plan` is `kit.install.plan` (the structures are identical), and the install
runner already skips files that are already correct on disk, so an "update" is the same call
as an install. The `update` namespace exists to communicate intent and produces an
`UpdateReport` whose `actionsSkipped` field tells you how many files were already current.
