# Stateless model

The kit writes only **real** Minecraft / Fabric / Forge / runtime files inside the target
directory:

```
<target.directory>/
  versions/
    <id>/<id>.jar
    <id>/<id>.json
    <id>/natives/                  (extracted on demand)
  libraries/
    <maven path>/<artifact>.jar
  assets/
    indexes/<id>.json
    objects/<aa>/<full hash>
    log_configs/<id>.xml
  runtime/
    <component>/...
  forge-installers/
    forge-<full>-installer.jar     (Forge only)
```

The only transient artefact is the download temp file (`*.download`), atomically renamed to
its final path on success.

## Why stateless?

- **No drift.** The truth is the filesystem plus official metadata. There is no second
  source to keep in sync.
- **Composable.** Consumers (Electron launchers, CI scripts, web back-ends) keep their own
  preferred persistence — a database, an Electron store, a JSON file. The kit doesn't
  prescribe one.
- **Easy to verify.** `kit.verify.<aspect>.run` is deterministic: same inputs, same output.
  Nothing it reads has been mutated by a prior `install.run`.

## What you, the consumer, are responsible for

- Storing the user's chosen Minecraft version, loader preference, memory settings, and auth
  token. The kit re-resolves a target from those inputs each time.
- Mapping a "profile" or "instance" name to a target id. The kit only sees ids when you
  tell it.
- Persisting per-installation metadata you care about (mod list, world overrides). The kit
  ignores everything inside the target directory that isn't a Minecraft artefact.
