# Getting started

`@elixir/minecraft-kit` is a stateless Minecraft launcher kit for Node 20+. It ships:

- a TypeScript library — install / verify / repair / launch vanilla, Fabric, and modern Forge;
- an interactive `emk` CLI built on the same library.

The library never writes launcher-private state. The only files produced on disk are the ones
the Minecraft client itself expects: `versions/`, `libraries/`, `assets/`, and (optionally)
`runtime/`.

- [Installation →](./installation)
- [Quickstart →](./quickstart)
