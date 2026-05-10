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
      thresholds: {
        lines: 50,
        branches: 75,
        functions: 65,
        statements: 50,
      },
      all: true,
      clean: true,
    },
  },
});
