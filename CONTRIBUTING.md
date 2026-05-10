# Contributing

Thanks for taking the time to contribute. This project values small, focused changes that
ship with passing checks. The notes below cover what you need to get a PR through CI.

## Setup

Requirements:

- Node ≥ 20.11
- pnpm 9.15 (pinned via `packageManager` in `package.json`)

```bash
git clone <your-fork>
cd minecraft-kit
pnpm install
```

`pnpm install` automatically installs the git hooks (via husky's `prepare` script). You do
not need to do anything else to enable them.

## Git hooks

Three hooks run locally — they are the same checks CI runs, just split across stages so
the fast ones fire first:

| Hook | Runs | When it fires |
|---|---|---|
| `commit-msg` | commitlint — Conventional Commits enforcement | on every commit |
| `pre-commit` | lint-staged (biome on staged files) + `pnpm typecheck` | on every commit |
| `pre-push` | `pnpm test:coverage` + `pnpm build` | on `git push` |

If a hook fails, fix the issue and re-run the command. **Do not use `--no-verify`** —
investigate why the hook failed instead. CI runs the same checks; bypassing locally just
moves the failure to CI.

## Commands

| Command | What it does |
|---|---|
| `pnpm typecheck` | `tsc --noEmit` against the strict tsconfig. |
| `pnpm lint` | `biome check ./src ./tests`. |
| `pnpm lint:fix` | Apply safe Biome fixes. |
| `pnpm format` | Apply Biome formatting only. |
| `pnpm test` | Run the full Vitest suite once. |
| `pnpm test:watch` | Vitest in watch mode. |
| `pnpm test:coverage` | Vitest with `--coverage` (v8 provider). |
| `pnpm build` | tsup bundle to `dist/` (library + CLI + sourcemaps + declarations). |
| `pnpm docs:dev` | TypeDoc → VitePress dev server. |
| `pnpm docs:build` | TypeDoc → VitePress static build. |

Before opening a PR:

```bash
pnpm typecheck && pnpm lint && pnpm test && pnpm build
```

All four must pass. CI runs the same checks plus coverage on every PR.

## Project conventions

The rules every change must follow are in [`docs/code-guidelines.md`](./docs/code-guidelines.md).
The most important ones:

- **No `any`** — narrow at the boundary if a third-party type is too loose.
- **No magic strings** — finite sets live in `const` maps under `src/types/` or
  `src/constants/`.
- **No silent `catch`** — every caught error is inspected, logged, or re-thrown. Empty
  catches need a one-line comment explaining why the loss is safe.
- **Plan / run split** — install, update, and repair flows produce a serialisable plan
  before they touch disk. Tests assert on plans; runners are tested separately with
  `FakeHttpClient` / `FakeSpawner` from `tests/helpers/`.
- **Dependency injection** — never `vi.mock("node:child_process")`. Inject the `Spawner`
  abstraction instead.
- **No network in tests.**

If you're touching internal modules, [`docs/modules.md`](./docs/modules.md) has a
one-paragraph orientation per source folder.

## Commit & PR

Commits follow [Conventional Commits](https://www.conventionalcommits.org/). The format is
enforced by the `commit-msg` hook:

```
<type>[optional scope][!]: <description>

[optional body]

[optional footer]
```

Allowed types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`,
`chore`, `revert`. Add `!` after the type (or scope) to mark a breaking change.

Examples:

```
feat: add resolveVanillaLoader
fix(runner): close the readstream on abort
feat!: rename ElixirMinecraftKit to MinecraftKit
chore: bump tsup to 8.5
```

Other PR conventions:

- Keep PRs focused — one logical change per PR is much easier to review than five.
- Reference any related issue in the PR description.
- Breaking changes are findable later via `git log --grep='!:'` because of the
  Conventional-Commits marker.
- Update the matching guide under `docs-site/guides/` if you changed observable behaviour.
- TypeDoc regeneration (`pnpm docs:api`) is a separate, manual step — not required for the
  PR but appreciated when you've changed the public surface.

## Reporting bugs

Open an issue with a minimal reproduction: target id, loader, Minecraft version, the
operation that failed, and the full `MinecraftKitError` (code + message + context). Include
your platform and Node version. If the failure happens at install or repair, attach the
`onEvent` log if you have one.

## Asking before writing

For non-trivial features (new public API, new loader support, new CLI scenario) open an
issue first to align on scope. Small fixes and refactors can go straight to a PR.
