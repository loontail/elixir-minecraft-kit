# Installation

```bash
pnpm add @loontail/minecraft-kit
```

The package is **ESM-only** and targets Node.js 20.11+.

After installation the `mckit` binary becomes available locally:

```bash
pnpm exec mckit
```

## Peer requirements

- Node.js ≥ 20.11
- A working network connection to `piston-meta.mojang.com`, `meta.fabricmc.net`,
  `maven.minecraftforge.net`, and `files.minecraftforge.net`.
- Disk space proportional to the games you install — runtimes are ~150 MB each, and a vanilla
  install plus assets is ~1.5 GB.

## Optional dependencies

The library never spawns Java unless you ask it to install / repair Forge or run a launch.
For everything else, no Java runtime is required on the host.
