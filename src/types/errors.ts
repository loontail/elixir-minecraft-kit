/**
 * Stable error code discriminator. Consumers can `switch (e.code)` exhaustively.
 *
 * Codes are stable across releases — adding new codes is non-breaking; removing or renaming
 * a code is a breaking change.
 */
export type MinecraftKitErrorCode =
  | "NETWORK_TIMEOUT"
  | "NETWORK_HTTP_ERROR"
  | "NETWORK_ABORTED"
  | "INTEGRITY_HASH_MISMATCH"
  | "INTEGRITY_SIZE_MISMATCH"
  | "MANIFEST_INVALID"
  | "MANIFEST_NOT_FOUND"
  | "METADATA_PARSE_ERROR"
  | "FILESYSTEM_PATH_TRAVERSAL"
  | "FILESYSTEM_WRITE_ERROR"
  | "FILESYSTEM_READ_ERROR"
  | "ARCHIVE_INVALID"
  | "ARCHIVE_TOO_LARGE"
  | "ARCHIVE_ENTRY_REJECTED"
  | "RUNTIME_NOT_FOUND"
  | "RUNTIME_UNSUPPORTED_PLATFORM"
  | "FORGE_PROCESSOR_FAILED"
  | "FORGE_INSTALLER_INVALID"
  | "LAUNCH_JAVA_NOT_FOUND"
  | "LAUNCH_PROCESS_FAILED"
  | "LAUNCH_ABORTED"
  | "VERIFICATION_FAILED"
  | "INVALID_INPUT"
  | "NOT_IMPLEMENTED"
  | "UNSUPPORTED_VERSION"
  | "LZMA_DECODE_ERROR"
  | "AUTH_DEVICE_CODE_EXPIRED"
  | "AUTH_DEVICE_CODE_DECLINED"
  | "AUTH_DEVICE_CODE_FAILED"
  | "AUTH_REFRESH_FAILED"
  | "AUTH_XBOX_FAILED"
  | "AUTH_XSTS_FAILED"
  | "AUTH_MINECRAFT_FAILED"
  | "AUTH_NO_GAME_OWNERSHIP"
  | "AUTH_MISSING_CLIENT_ID"
  | "AUTH_CANCELLED";

/** Structured context attached to errors. */
export interface MinecraftKitErrorContext {
  readonly url?: string;
  readonly filePath?: string;
  readonly expectedHash?: string;
  readonly actualHash?: string;
  readonly expectedSize?: number;
  readonly actualSize?: number;
  readonly httpStatus?: number;
  readonly exitCode?: number;
  readonly platform?: string;
  readonly version?: string;
  readonly [key: string]: unknown;
}
