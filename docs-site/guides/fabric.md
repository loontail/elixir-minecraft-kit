# Fabric

`kit.versions.fabric` reads the official Fabric meta API at `meta.fabricmc.net`.

```ts
import { Loaders, VersionPreference } from "@elixir/minecraft-kit";

const loaders = await kit.versions.fabric.list({ minecraftVersion: "1.20.1" });
const resolved = await kit.versions.fabric.resolve({
  minecraftVersion: "1.20.1",
  preference: VersionPreference.LATEST,
});
```

`resolve` fetches the **profile JSON** (the same one the official Fabric installer uses) and
returns a `ResolvedFabricLoader` ready to be plugged into `kit.targets.create`.

## Targets

```ts
const target = kit.targets.create({
  id: "fabric-client",
  directory: "./minecrafts/fabric-client",
  minecraft: resolvedMinecraft,
  loader: resolvedFabricLoader,
  runtime: resolvedRuntime,
});
```

When you install this target the kit downloads:

1. The vanilla client jar, libraries, assets, natives, asset index, logging config.
2. The Mojang Java runtime referenced by the manifest.
3. Every Fabric library declared in the profile.
4. `versions/<fabric-id>/<fabric-id>.json` containing the profile.

Nothing else lands on disk — no Fabric installer JAR, no profile entries elsewhere.
