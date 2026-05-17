import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: false,
    environment: "node",
    pool: "forks",
    isolate: true,
    fileParallelism: true,
    include: ["tests/**/*.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "json-summary"],
      reportsDirectory: "./coverage",
      include: ["src/**/*.ts"],
      exclude: [
        "src/**/*.d.ts",
        "src/types/**",
        "src/index.ts",
        "src/cli/index.ts",
        "src/cli/main.ts",
      ],
      // Floors, not targets. V8 line/branch counting can wobble by a few tenths of a
      // percent between runs, so leave ~5% headroom above the actual aggregate (currently
      // ~76% lines / ~76% branches / ~77% functions) — a single new untested branch should
      // not block a push.
      thresholds: {
        lines: 65,
        branches: 70,
        functions: 65,
        statements: 65,
      },
      all: true,
      clean: true,
    },
  },
});
