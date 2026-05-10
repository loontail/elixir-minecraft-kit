---
layout: home
hero:
  name: "@elixir/minecraft-kit"
  text: Minecraft launcher kit
  tagline: TypeScript library and interactive CLI for installing, verifying, repairing, and launching Minecraft — vanilla, Fabric, and modern Forge.
  actions:
    - theme: brand
      text: Get started
      link: /getting-started/
    - theme: alt
      text: API Reference
      link: /api/
features:
  - title: Library + CLI
    details: Use the TypeScript facade from your app, or drop into the interactive emk CLI — both backed by the same code.
  - title: Versions API
    details: Symmetric list/resolve for Minecraft, Fabric, Forge, and Mojang Java runtimes.
  - title: Forge modern
    details: Downloads the official installer, runs processors locally with the installed Mojang JDK, and verifies every output hash.
  - title: 100% typed events
    details: Discriminated-union onEvent callback covers every download, integrity check, processor, and launch transition.
  - title: Verify and repair
    details: Per-aspect verification (minecraft / fabric / forge / runtime) and a matching repair flow that re-downloads only what's broken.
  - title: Modern stack
    details: ESM-only, Biome, Vitest, tsup, TypeDoc, VitePress.
---
