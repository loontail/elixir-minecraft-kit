# Development workflow (internal)

## Toolchain

| Tool | Version | Purpose |
|---|---|---|
| Node | ≥ 20.11 | Runtime (uses `fetch`, `crypto.randomBytes`, `child_process.spawn`). |
| npm | 10+ | Package manager (bundled with Node 20). |
| TypeScript | ~5.4.5 | Strict; `noUncheckedIndexedAccess`, `verbatimModuleSyntax`. |
| Biome | ^1.9.4 | Lint + format. |
| Vitest | ^1.6.0 | Test runner (fork pool, parallel files). |
| tsup | ^8.0.2 | Bundle library + CLI (ESM only). |
| TypeDoc | ~0.25.13 | API docs into `docs-site/api/`. |
| VitePress | ^1.2.3 | Docs site. |

## Commands

| `npm run <cmd>` | What it does |
|---|---|
| `build` | `tsup` bundle to `dist/`. Library + CLI + sourcemaps + declarations. |
| `dev` | Same, watching. |
| `lint` | `biome check ./src ./tests`. |
| `lint:fix` | Apply safe Biome fixes. |
| `format` | Apply Biome formatting. |
| `typecheck` | `tsc --noEmit` against the strict tsconfig. |
| `test` | Run the full Vitest suite once. (Also available as `npm test`.) |
| `test:watch` | Same, watching. |
| `test:coverage` | Vitest with `--coverage` (v8 provider, html + json-summary + text). |
| `docs:api` | TypeDoc → `docs-site/api/`. |
| `docs:dev` | `docs:api` then VitePress dev server. |
| `docs:build` | `docs:api` then VitePress build. |
| `docs:preview` | VitePress preview of the built site. |

## Before pushing

1. `npm run typecheck && npm run lint && npm test` — all three must pass.
2. `npm run build` — sanity-check the bundle.
3. If you touched `src/types/` or the public surface in `src/index.ts`, also run `npm run docs:api`.
4. Update the matching guide in `docs-site/guides/` if you changed observable behaviour.

## Tests

- Test files live in `tests/`, mirroring `src/`. Helpers in `tests/helpers/`.
- Use `FakeHttpClient` / `FakeSpawner` from `tests/helpers/`. **Never `vi.mock`** — DI is what
  these helpers are for.
- Network is forbidden in the test suite. All HTTP is scripted.
- Each test owns its temp directory (`mkdtemp(...)`), cleans up in `afterEach`.

## Git hooks

Three hooks are installed automatically by husky on `npm install` (see the `prepare`
script):

| Hook | Runs |
|---|---|
| `commit-msg` | commitlint — enforces Conventional Commits |
| `pre-commit` | lint-staged (biome on staged files) + `npm run typecheck` |
| `pre-push` | `npm run test:coverage` + `npm run build` |

Don't bypass with `--no-verify`. CI re-runs the same checks; bypassing locally just moves
the failure to GitHub Actions.

## Release

Push-driven: every merge to `main` triggers `.github/workflows/release.yml`. If the
`package.json` version on `main` doesn't have a matching `v*` tag yet, the workflow
publishes that version to npm, then writes the tag and a GitHub release. Commits that
don't bump the version are no-ops.

To cut a release: open a "chore(release): X.Y.Z" PR that bumps `package.json` and merge
it.

```bash
git switch main
git pull

# Bump package.json — no commit, no tag yet.
npm version --no-git-tag-version patch       # or minor / major / <explicit>

git switch -c chore/release-0.1.1
git commit -am "chore(release): 0.1.1"
git push -u origin chore/release-0.1.1

gh pr create --base main \
  --title "chore(release): 0.1.1" \
  --body "Bump to 0.1.1."

# Approve + merge in the GitHub UI (or `gh pr merge --squash`).
```

When the PR lands, the release workflow:

1. Reads `package.json` version on `main`.
2. Checks the matching `v*` tag doesn't already exist.
3. Re-runs typecheck / lint / test / build.
4. `npm publish --provenance --access public` to npm.
5. Creates and pushes the `vX.Y.Z` git tag.
6. Cuts a GitHub release with auto-generated notes from the Conventional-Commits log.

If publish fails, no tag is written — re-trigger the workflow by pushing any commit to
`main` (e.g. an empty `git commit --allow-empty -m "ci: retry release"`).
