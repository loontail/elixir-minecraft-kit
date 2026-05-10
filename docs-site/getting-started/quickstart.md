# Quickstart

```ts
import { MinecraftKit, AuthModes, Loaders } from "@loontail/minecraft-kit";

const kit = new MinecraftKit();

// 1. Resolve a target — Minecraft 1.20.1 with the latest stable Fabric loader.
const target = await kit.targets.resolve({
  id: "fabric-client",
  directory: "./minecrafts/fabric-client",
  minecraft: { version: "1.20.1" },
  loader: { type: Loaders.FABRIC },
});

// 2. Plan the install. No disk writes happen here apart from the Forge installer
//    (Fabric and vanilla skip the disk during planning).
const plan = await kit.install.plan(target);
console.log(`${plan.totalActions} actions, ${plan.totalBytes} bytes`);

// 3. Execute the plan. Downloads run in parallel, files already on disk are skipped.
await kit.install.run(plan, {
  onEvent: (e) => {
    if (e.type === "install:phase-changed") console.log("phase:", e.phase);
  },
});

// 4. Launch.
const composition = await kit.launch.compose(target, {
  auth: { mode: AuthModes.OFFLINE, username: "Player" },
  memory: { minMb: 1024, maxMb: 4096 },
});
const session = kit.launch.run(composition);
await session.exited;
```

If you want to remember `target` across runs, serialise the value you got back from
`kit.targets.resolve` and pass it back in next time — the kit holds no state of its own
between calls.

See the [library usage guide](../guides/library-usage) for the full facade surface, the
[CLI guide](../guides/cli) for the interactive flow, and the [API reference](../api/) for
generated types.
