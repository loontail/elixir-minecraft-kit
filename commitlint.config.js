/**
 * Conventional Commits — enforced via the `commit-msg` husky hook.
 *
 * Allowed types: feat, fix, docs, style, refactor, perf, test, build, ci, chore, revert.
 * Breaking changes: use `!` after the type/scope (e.g. `feat!:` or `feat(api)!:`).
 *
 * Examples:
 *   feat: add resolveVanillaLoader
 *   fix(runner): close the readstream on abort
 *   feat!: rename ElixirMinecraftKit to MinecraftKit
 *   chore: bump tsup to 8.5
 */
export default {
  extends: ["@commitlint/config-conventional"],
  rules: {
    // Tighten a couple of defaults: header length and case style.
    "header-max-length": [2, "always", 100],
    "subject-case": [2, "never", ["upper-case", "pascal-case", "start-case"]],
  },
};
