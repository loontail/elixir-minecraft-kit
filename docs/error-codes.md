# Error codes (internal)

Every public API throws `MinecraftKitError`. The `code` field is the stable
discriminator. New codes are added to `src/types/errors.ts` — never invent ad-hoc strings.

## Network

| Code | Thrown when | Context fields |
|---|---|---|
| `NETWORK_TIMEOUT` | HTTP request exceeded `HTTP_TIMEOUT_MS`. | `url`, `timeoutMs` |
| `NETWORK_HTTP_ERROR` | HTTP response status was not 2xx, or `fetch` rejected for a reason other than abort/timeout. | `url`, `httpStatus` (when known) |
| `NETWORK_ABORTED` | The caller's `AbortSignal` aborted the request. | `url`, `reason` |

## Filesystem

| Code | Thrown when | Context fields |
|---|---|---|
| `FILESYSTEM_WRITE_ERROR` | `mkdir`, `writeFile`, or rename during `atomicWrite` failed. Also raised by `runtime-extras` when symlink and copy both fail. | `filePath`, optional `linkTarget`, `symlinkError` |
| `FILESYSTEM_READ_ERROR` | `readFile` failed in `readText` / `readBytes`. | `filePath` |
| `FILESYSTEM_PATH_TRAVERSAL` | `assertWithinRoot` detected a path that escapes the extraction root (zip-slip). | `filePath`, `rootDirectory` |

## Integrity

| Code | Thrown when | Context fields |
|---|---|---|
| `INTEGRITY_HASH_MISMATCH` | Downloaded file's sha1 did not match the manifest. | `url`, `expectedHash`, `actualHash` |
| `INTEGRITY_SIZE_MISMATCH` | Downloaded byte count did not match the manifest's `expectedSize`. | `url`, `expectedSize`, `actualSize` |

## Archives

| Code | Thrown when | Context fields |
|---|---|---|
| `ARCHIVE_INVALID` | `yauzl` failed to open or read an archive; or `extractSingleEntry` could not find the entry. | `filePath`, `entryName` (when applicable) |
| `ARCHIVE_TOO_LARGE` | Per-entry / total-size / compression-ratio / entry-count limit exceeded. | `filePath`, `entryName`, `size` |
| `ARCHIVE_ENTRY_REJECTED` | An entry name was empty, contained a null byte, was absolute, used `..`, was a reserved Windows name, or ended in dot/whitespace. | `entryName`, `reason` |

## Manifests

| Code | Thrown when | Context fields |
|---|---|---|
| `MANIFEST_NOT_FOUND` | Version / loader / runtime metadata was not found upstream, or the on-disk version JSON used for launch could not be located. | `version`, `targetId`, `loaderType` |
| `MANIFEST_INVALID` | The manifest parsed but is missing required fields (`id` or `mainClass`), or a Maven coordinate was malformed. | `version`, `url`, `input` |
| `METADATA_PARSE_ERROR` | A metadata document failed to JSON-parse outside the Forge installer (Forge JSON-parse failures throw `FORGE_INSTALLER_INVALID`). | `url` |

## Runtime

| Code | Thrown when | Context fields |
|---|---|---|
| `RUNTIME_NOT_FOUND` | The requested runtime component is not available on the host platform. | `platform`, `version` |
| `RUNTIME_UNSUPPORTED_PLATFORM` | Host OS / arch combination is not recognised, or Mojang publishes no runtimes for it. | `platform`, `arch` |

## Forge

| Code | Thrown when | Context fields |
|---|---|---|
| `FORGE_INSTALLER_INVALID` | Installer JAR is missing required entries, the entries are not valid JSON, or a processor JAR has no `Main-Class`. | `filePath`, `entryName`, `token` |
| `FORGE_PROCESSOR_FAILED` | A processor exited non-zero, or its declared output sha1 mismatched. | `exitCode`, `mainClass`, `stderr`, `expectedHash`, `actualHash` |

## Launch

| Code | Thrown when | Context fields |
|---|---|---|
| `LAUNCH_JAVA_NOT_FOUND` | The configured `javaPath` does not exist or is not executable. | `filePath` |
| `LAUNCH_PROCESS_FAILED` | Minecraft exited with a non-zero code without being aborted. | `exitCode` |
| `LAUNCH_ABORTED` | The install or launch was cancelled via signal. | — |

## Misc

| Code | Thrown when | Context fields |
|---|---|---|
| `INVALID_INPUT` | A public API was called with an obviously wrong argument (empty username, wrong loader type for an aspect verifier, malformed coordinate). | varies |
| `VERIFICATION_FAILED` | Reserved for future use. | — |
| `NOT_IMPLEMENTED` | A code path is intentionally not implemented yet. | — |
| `UNSUPPORTED_VERSION` | The selected Minecraft version is outside the supported range (e.g. legacy Forge < 1.13). | `version` |
| `LZMA_DECODE_ERROR` | Mojang runtime sidecar LZMA stream failed to decompress. | — |

## Conventions

- All thrown errors must extend `MinecraftKitError`. Wrapping a lower-level error
  preserves it as `cause`.
- Context fields are *additive* — adding a new field is non-breaking, removing one is breaking.
- Field names follow the union in `MinecraftKitErrorContext` (`url`, `filePath`, `expectedHash`,
  `actualHash`, `expectedSize`, `actualSize`, `httpStatus`, `exitCode`, `platform`, `version`).
  Anything else lives under the catch-all index signature.
- Catch sites in CLI / domain code use `isMinecraftKitError` / `isErrorCode` for narrowing.
