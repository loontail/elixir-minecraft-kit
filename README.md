# @loontail/minecraft-kit

A stateless TypeScript Minecraft launcher library and interactive CLI for vanilla, Fabric, and modern Forge.

**Documentation:** https://loontail.github.io/minecraft-kit/

## Features

- Resolve and install vanilla Minecraft, Fabric, and modern Forge.
- Install Mojang Java runtimes (`java-runtime-gamma`, `delta`, `jre-legacy`, ...).
- Verify, repair, and launch installations.
- Fully typed `onEvent` progress callbacks.
- Interactive `mckit` CLI.
- **Stateless** — writes only the files Minecraft itself needs; nothing else lives on disk.

## Install

```bash
pnpm add @loontail/minecraft-kit
```

## Usage

```ts
import { MinecraftKit, AuthModes, Loaders } from "@loontail/minecraft-kit";

const kit = new MinecraftKit();

const target = await kit.targets.resolve({
  id: "fabric-client",
  directory: "./minecrafts/fabric-client",
  minecraft: { version: "1.20.1" },
  loader: { type: Loaders.FABRIC },
});

const plan = await kit.install.plan(target);
await kit.install.run(plan);

const composition = await kit.launch.compose(target, {
  auth: { mode: AuthModes.OFFLINE, username: "Player" },
});
const session = kit.launch.run(composition);
await session.exited;
```

## CLI

```bash
mckit
```

The CLI is fully interactive — no required arguments. Run inside the directory that should host your installations.

## License

MIT
