# Interactive CLI: `mckit`

The `mckit` binary is a fully-interactive companion to the library. It has no required
arguments; the only flags are `--help`, `--version`, and `--debug`.

```bash
mckit
```

## Main menu

```text
○ Install Minecraft
○ Install Java/runtime
○ Verify installation
○ Repair installation
○ Launch Minecraft
○ Inspect installation
○ Exit
```

There are **no** separate "Install with Fabric" / "Install with Forge" entries — Fabric and
Forge are picked **inside** the unified `Install Minecraft` flow, after Minecraft + runtime
have been chosen.

## Install Minecraft flow

```text
Install Minecraft
→ Select Minecraft channel        (release / snapshot / old / all)
→ Select Minecraft version        (searchable list, top 50, type to filter)
→ Select Java/runtime             (auto-detect / pick specific component)
→ Select installation type        (Vanilla / Fabric / Forge)
→ Select Fabric loader            (only when type = Fabric)
→ Select Forge build              (only when type = Forge; recommended/latest first)
→ Select installation directory   (default / custom path)
→ Summary                         (Minecraft, Type, Loader, Runtime, Directory)
→ Confirm
→ Install with progress
```

Every list is API-driven. Free-form text is only accepted for the optional **Custom path**
(directory) and the player username at Launch time.

## Searchable picker (Minecraft / Fabric / Forge)

Long lists never render hundreds of options at once. The picker behaviour:

- **Lists ≤ 30 options** — shown directly with `← Back` / `✕ Cancel`.
- **Lists > 30 options** — the picker first prompts for a filter string. Pressing Enter with
  an empty filter shows the first **50** entries (newest first) plus a `↻ Refine filter…`
  option to type a new query. Typing a filter narrows the list before the select renders.
- Versions are **deduplicated by id** and **sorted newest-first**.
- An empty filter input never produces "No matches for undefined" — the picker treats
  unset / undefined input as an empty query.
- Selecting `↻ Refine filter…` re-prompts in place; it does not drop you back to the
  previous wizard step.

## Compatibility checks

Every loader pick happens **after** the loader's compatibility list has been loaded for the
chosen Minecraft version. If Fabric or Forge has no published builds for the selected
Minecraft version (or the metadata server returns 4xx), the wizard prints a friendly note
and returns the user to the **install-type** picker — never straight to the main menu, and
never with a raw `NETWORK_HTTP_ERROR: HTTP 400 …` string.

## Progress UX

Install / Repair / Update flows render a single throttled status line driven by typed
progress events from the core library. The line includes:

- Current install phase (`downloading-libraries`, `extracting-natives`, …).
- Files processed `X / Y`.
- Bytes downloaded `nn MB / mm MB`.
- Aggregate download speed (rolling 5-second window).
- `active N` — how many files are downloading right now (capped by the worker-pool size).
- Textual progress bar (`████████░░ 58%`).
- Truncated current-file path.

The line is updated **in-place** through `spinner.message()` — it does not produce a new
console line per event. Refresh rate is capped (default 250 ms) and identical lines are
deduped, so the console is never spammed with thousands of lines. After the run completes,
a summary note shows files downloaded / skipped / failed, total bytes, average speed, and
duration.

```text
[downloading-libraries] 124/1532 · 84.3 MB/512.7 MB · 12.4 MB/s · active 32 · ████████░░ 58% · …libraries/net/lwjgl/lwjgl/3.3.1/lwjgl-3.3.1.jar
```

If `totalBytes` is unknown (zero-size manifests), the bar falls back to `—` while the file
counter, live speed, and active-downloads counter continue to update. There is **no ETA**
in any progress line, summary, event payload, or error message — by design.

## Worker-pool downloads

Downloads run through a worker-pool driven by `p-limit`, with a default size of
`DOWNLOAD_CONCURRENCY = 32`. The runner does **not** wait for a batch to finish before
queueing the next file: as soon as one download completes, the next file in the queue
starts immediately. Concurrency is overridable via the `concurrency` option on
`kit.install.run` / `kit.repair.run` / `kit.update.run`.

Each download still verifies its expected SHA-1 on the fly, writes through a temporary
`.download` file with atomic rename on success, retries transient HTTP errors with
exponential backoff, and respects an optional `AbortSignal`.

## Inspect

- **Inspect installation** — pick one entry from the discovered list, then show a detail
  block: directory, all Minecraft versions on disk, all detected loaders, runtime path /
  component / version. Inspect never runs verification; that lives behind
  `Verify installation`.

## Verify / Repair / Launch

`pickInstalledTarget` walks the discovered list and resolves a real `Target` from the
hint(s) on disk. If multiple Minecraft versions live inside one installation directory, the
wizard asks which one to operate on instead of guessing.

Repair runs the install runner under the progress renderer, so the same UX applies to
re-downloads as to fresh installs.

## Errors

Every recoverable error message goes through `formatUserError`, which translates each
`MinecraftKitError` code (and HTTP status) into a single-sentence user-friendly
message. Examples:

- `NETWORK_HTTP_ERROR` 400/404 → "No matching data is available for that combination."
- `NETWORK_TIMEOUT` → "Network request timed out."
- `RUNTIME_NOT_FOUND` → "No runtime is published for that combination."

Pass `--debug` to surface raw stack traces instead of the friendly translation.

## Programmatic CLI

The `runCli` helper exported from `@loontail/minecraft-kit/cli` lets tests script the entire
CLI against a stub UI:

```ts
import { runCli, createStubUi } from "@loontail/minecraft-kit/cli";

const ui = createStubUi([
  "install-minecraft",     // main menu
  "release",               // channel
  versionSummary,          // searchable Minecraft picker
  "auto",                  // runtime: auto-detect
  "vanilla",               // install type
  "default",               // directory
  true,                    // confirm
  "exit",                  // back to menu → exit
]);
await runCli({ args: [], ui, rootDir: "./minecrafts" });
```

`createStubUi` records every prompt and notification (`ui.calls`) for assertion in tests.
