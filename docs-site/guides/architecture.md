# Architecture

```
┌──────────────────────────────────────────────────────────────────────────┐
│                          MinecraftKit                              │
│                                                                          │
│  versions: { minecraft, fabric, forge, runtime }                         │
│  targets:  { create, resolve, list }                                     │
│  install:  { plan, run, runtime: { plan, run, standalonePlan } }         │
│  update:   { plan, run }                                                 │
│  verify:   { minecraft, fabric, forge, runtime }                         │
│  repair:   { minecraft, fabric, forge, runtime }                         │
│  launch:   { compose, run }                                              │
└──────────────────────────────────────────────────────────────────────────┘
        │                              │
        ▼                              ▼
   HttpClient                      Spawner
   ──────────                      ──────────
   FetchHttpClient                 ChildProcessSpawner
   (node fetch)                    (node:child_process)
        │
        ▼
   MetadataCache (LRU, in-memory, 5-minute default TTL)
```

## Layered modules

```
src/types/         Public type definitions and `const` enum maps.
src/constants/     URLs, defaults, limits, file-segment names.
src/core/          Pure helpers — errors, hashing, fs, archive, retries,
                   rules, manifest merging, throttling, UUID.
src/http/          Transport — HttpClient, in-memory cache, streaming
                   downloader.
src/versions/      Version resolvers (Mojang / Fabric / Forge / runtime).
src/targets/       Target factory + filesystem scanner.
src/install/       Install planner + runner + Forge processor execution.
src/update/        Thin wrapper over install (skip-already-correct).
src/verify/        On-disk verification per aspect.
src/repair/        Aspect repair = install plan ∩ verification issues.
src/launch/        Argument composition + child-process lifecycle.
src/cli/           Interactive `emk`; imports only the public facade.
src/kit.ts         `MinecraftKit` facade.
src/index.ts       Public barrel.
```

## Statelessness

The kit writes only files Minecraft itself expects: `versions/`, `libraries/`, `assets/`,
and (optionally) `runtime/`. Anything you want to remember about a target is your
responsibility — pass the `Target` you got from `kit.targets.resolve` into your next call.

## Dependency injection

Every external dependency on the `MinecraftKit` constructor is replaceable:
`httpClient`, `cache`, `logger`, `spawner`, `system`. Tests use the `FakeHttpClient` and
`FakeSpawner` test helpers instead of `vi.mock("node:child_process")` — the `Spawner`
interface eliminates that brittleness.

## Plan vs run

Every long-running operation produces a plan first:

```ts
const plan = await kit.install.plan(target);   // pure (mostly — see install.md)
console.log(`${plan.totalActions} actions, ${plan.totalBytes} bytes`);
await kit.install.run(plan, { onEvent });      // executes
```

This is what makes the library testable, dry-run-friendly, and resumable. The same shape
holds for `update.plan` / `update.run` and `repair.<aspect>.plan` / `repair.<aspect>.run`.
