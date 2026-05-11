import { defineConfig } from "tsup";

// Dual build: ESM for modern Node consumers, CJS for Electron main
// process consumers that still target CommonJS (e.g. elixir-app). The
// CLI binary stays ESM-only — it's never imported as a library.
export default defineConfig({
  entry: {
    index: "src/index.ts",
    "cli/index": "src/cli/index.ts",
  },
  format: ["esm", "cjs"],
  target: "node20",
  platform: "node",
  dts: true,
  sourcemap: true,
  clean: true,
  splitting: false,
  treeshake: true,
  shims: false,
  tsconfig: "./tsconfig.build.json",
  banner: ({ format }) => (format === "esm" ? { js: "#!/usr/bin/env node" } : {}),
  // tsup picks the right extension per format: .mjs/.cjs when `type: module`,
  // .js/.cjs otherwise. `outExtension` is explicit to keep `main`/`module`/`exports`
  // consistent with package.json below.
  outExtension: ({ format }) => ({ js: format === "esm" ? ".mjs" : ".cjs" }),
});
