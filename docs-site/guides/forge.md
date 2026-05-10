# Forge (modern)

`kit.versions.forge` reads `maven.minecraftforge.net/.../maven-metadata.xml` and the
`promotions_slim.json` mapping. Only modern Forge (1.13+) is supported — see
[Limitations](./limitations) for the legacy story.

```ts
import { Loaders, VersionPreference } from "@elixir/minecraft-kit";

const builds = await kit.versions.forge.list({ minecraftVersion: "1.20.1" });
const resolved = await kit.versions.forge.resolve({
  minecraftVersion: "1.20.1",
  preference: VersionPreference.RECOMMENDED,
});
```

## Install flow

The Forge install is the most involved flow in the library:

1. **Download the installer JAR** to `forge-installers/<full>-installer.jar`.
2. **Open the JAR** and read `install_profile.json` and `version.json`.
3. **Extract the embedded `maven/` entries** into `libraries/<group>/<artifact>/<version>/`.
4. **Resolve the data tokens** — `[g:a:v]` → library path, `'literal` → literal, `/path` →
   extracted file, otherwise → string.
5. **Plan downloads** for every library declared by `install_profile` and `version.json`.
6. **Plan processor invocations** — for each processor entry in `install_profile.processors`
   that applies to the client side, resolve the classpath and substitute every `{KEY}` and
   `[coord]` token in the args.
7. **Run downloads** in parallel; install the runtime; **run processors sequentially** with
   the installed Mojang Java runtime; verify every declared `output` SHA-1.
8. **Write `versions/<forge-id>/<forge-id>.json`** so the launch composer can find the
   merged manifest.

## Built-in processor tokens

| Token              | Resolved value                                           |
|--------------------|----------------------------------------------------------|
| `{SIDE}`           | `"client"`                                               |
| `{MINECRAFT_JAR}`  | `<directory>/versions/<mc>/<mc>.jar`                     |
| `{MINECRAFT_VERSION}` | `<mc>`                                               |
| `{ROOT}`           | `<directory>` (the per-target root)                       |
| `{INSTALLER}`      | Absolute path to the downloaded installer JAR             |
| `{LIBRARY_DIR}`    | `<directory>/libraries`                                   |

`[g:a:v[:c][@e]]` references are resolved to absolute paths under `LIBRARY_DIR`.
