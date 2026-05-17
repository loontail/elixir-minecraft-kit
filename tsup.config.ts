import { defineConfig } from "tsup";

// Dual build: ESM + CJS. `noExternal` inlines ESM-only deps so the CJS bundle
// doesn't `require("p-limit")` at runtime (p-limit v5+ is `type: module`).
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
  noExternal: ["p-limit", "yocto-queue"],
  banner: ({ format }) => (format === "esm" ? { js: "#!/usr/bin/env node" } : {}),
  outExtension: ({ format }) => ({ js: format === "esm" ? ".mjs" : ".cjs" }),
});
