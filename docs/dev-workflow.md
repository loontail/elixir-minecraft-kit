# Development workflow (internal)

## Toolchain

| Tool | Version | Purpose |
|---|---|---|
| Node | ≥ 20.11 | Runtime (uses `fetch`, `crypto.randomBytes`, `child_process.spawn`). |
| pnpm | 9.15.0 | Package manager (pinned via `packageManager`). |
| TypeScript | ~5.4.5 | Strict; `noUncheckedIndexedAccess`, `verbatimModuleSyntax`. |
| Biome | ^1.9.4 | Lint + format. |
| Vitest | ^1.6.0 | Test runner (fork pool, parallel files). |
| tsup | ^8.0.2 | Bundle library + CLI (ESM only). |
| TypeDoc | ~0.25.13 | API docs into `docs-site/api/`. |
| VitePress | ^1.2.3 | Docs site. |

## Commands

| `pnpm <cmd>` | What it does |
|---|---|
| `build` | `tsup` bundle to `dist/`. Library + CLI + sourcemaps + declarations. |
| `dev` | Same, watching. |
| `lint` | `biome check ./src ./tests`. |
| `lint:fix` | Apply safe Biome fixes. |
| `format` | Apply Biome formatting. |
| `typecheck` | `tsc --noEmit` against the strict tsconfig. |
| `test` | Run the full Vitest suite once. |
| `test:watch` | Same, watching. |
| `test:coverage` | Vitest with `--coverage` (v8 provider, html + json-summary + text). |
| `docs:api` | TypeDoc → `docs-site/api/`. |
| `docs:dev` | `docs:api` then VitePress dev server. |
| `docs:build` | `docs:api` then VitePress build. |
| `docs:preview` | VitePress preview of the built site. |

## Before pushing

1. `pnpm typecheck && pnpm lint && pnpm test` — all three must pass.
2. `pnpm build` — sanity-check the bundle.
3. If you touched `src/types/` or the public surface in `src/index.ts`, also run `pnpm docs:api`.
4. Update the matching guide in `docs-site/guides/` if you changed observable behaviour.

## Tests

- Test files live in `tests/`, mirroring `src/`. Helpers in `tests/helpers/`.
- Use `FakeHttpClient` / `FakeSpawner` from `tests/helpers/`. **Never `vi.mock`** — DI is what
  these helpers are for.
- Network is forbidden in the test suite. All HTTP is scripted.
- Each test owns its temp directory (`mkdtemp(...)`), cleans up in `afterEach`.

## Pre-commit hooks

None configured. Add them via `husky` if you want enforced gating; until then, rely on CI to
catch regressions.

## Release (TODO)

There is no automated release yet. When one is added, document it here.
