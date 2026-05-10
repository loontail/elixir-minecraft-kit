# Runtime

`kit.versions.runtime` reads the canonical Mojang index at
`piston-meta.mojang.com/v1/products/java-runtime/.../all.json`.

```ts
import { RuntimePreference, detectSystem } from "@elixir/minecraft-kit";

const system = detectSystem();
const list = await kit.versions.runtime.list({ system });

const runtime = await kit.versions.runtime.resolve({
  system,
  component: "java-runtime-gamma",
  preference: RuntimePreference.RECOMMENDED,
});
```

## Component selection

The Minecraft per-version manifest declares the required component (e.g.
`java-runtime-gamma`, `java-runtime-delta`, `jre-legacy`). `kit.targets.resolve` plumbs that
component into the runtime resolver automatically. You only need to override it if you want
a specific override (e.g. running an older MC version with a newer JDK).

## Install layout

Runtime files land under `<directory>/runtime/<component>/...`. The Java executable lives at:

| OS       | Path                                                  |
|----------|-------------------------------------------------------|
| Windows  | `runtime/<component>/bin/javaw.exe`                   |
| macOS    | `runtime/<component>/jre.bundle/Contents/Home/bin/java` |
| Linux    | `runtime/<component>/bin/java`                        |

Symlinks declared in the per-component manifest are materialized natively on macOS/Linux and
fall back to byte copies on Windows where unprivileged users cannot create symlinks. LZMA1
sidecars are decompressed on demand using a pure-JS decoder — no native build step required.
