# Errors

Every error thrown by a public API is an `MinecraftKitError`:

```ts
import { isMinecraftKitError, isErrorCode } from "@elixir/minecraft-kit";

try {
  await kit.install.run(plan);
} catch (error) {
  if (isErrorCode(error, "INTEGRITY_HASH_MISMATCH")) {
    console.warn("file corrupted:", error.context.url);
  } else if (isMinecraftKitError(error)) {
    console.error(error.code, error.message);
    throw error;
  } else {
    throw error;
  }
}
```

## Codes

The full list of stable codes (`src/types/errors.ts`):

`NETWORK_TIMEOUT`, `NETWORK_HTTP_ERROR`, `NETWORK_ABORTED`, `INTEGRITY_HASH_MISMATCH`,
`INTEGRITY_SIZE_MISMATCH`, `MANIFEST_INVALID`, `MANIFEST_NOT_FOUND`, `METADATA_PARSE_ERROR`,
`FILESYSTEM_PATH_TRAVERSAL`, `FILESYSTEM_WRITE_ERROR`, `FILESYSTEM_READ_ERROR`,
`ARCHIVE_INVALID`, `ARCHIVE_TOO_LARGE`, `ARCHIVE_ENTRY_REJECTED`, `RUNTIME_NOT_FOUND`,
`RUNTIME_UNSUPPORTED_PLATFORM`, `FORGE_PROCESSOR_FAILED`, `FORGE_INSTALLER_INVALID`,
`LAUNCH_JAVA_NOT_FOUND`, `LAUNCH_PROCESS_FAILED`, `LAUNCH_ABORTED`, `VERIFICATION_FAILED`,
`INVALID_INPUT`, `NOT_IMPLEMENTED`, `UNSUPPORTED_VERSION`, `LZMA_DECODE_ERROR`.

Adding new codes is non-breaking. Renaming or removing a code is a breaking change.

## Context

Every error carries a frozen `context` object — typically `{ url, filePath, expectedHash,
actualHash, httpStatus, exitCode, ... }`. Treat this as JSON-safe; `error.toJSON()` returns
a serialisable representation without the prototype chain.
