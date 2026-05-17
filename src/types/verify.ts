/** Aspect of an installation a verification result describes. */
export const VerificationKinds = {
  MINECRAFT: "minecraft",
  FABRIC: "fabric",
  FORGE: "forge",
  RUNTIME: "runtime",
} as const;

/** Verification kind literal. */
export type VerificationKind = (typeof VerificationKinds)[keyof typeof VerificationKinds];

/** Status of an individual file checked during verification. */
export const VerifyFileStatuses = {
  OK: "ok",
  MISSING: "missing",
  CORRUPT: "corrupt",
  WRONG_SIZE: "wrong-size",
} as const;

/** File status literal. */
export type VerifyFileStatus = (typeof VerifyFileStatuses)[keyof typeof VerifyFileStatuses];

/** Categories assigned to each verified file for easier filtering. */
export const VerifyFileCategories = {
  CLIENT_JAR: "client-jar",
  LIBRARY: "library",
  ASSET: "asset",
  ASSET_INDEX: "asset-index",
  NATIVE: "native",
  LOADER_LIBRARY: "loader-library",
  RUNTIME_FILE: "runtime-file",
  LOGGING_CONFIG: "logging-config",
} as const;

/** Verification file category literal. */
export type VerifyFileCategory = (typeof VerifyFileCategories)[keyof typeof VerifyFileCategories];

/** A single verified file. */
export type VerificationFileResult = {
  readonly path: string;
  readonly category: VerifyFileCategory;
  readonly status: VerifyFileStatus;
  readonly expectedSha1?: string;
  readonly actualSha1?: string;
  readonly expectedSize?: number;
  readonly actualSize?: number;
  /** Optional URL where the file can be re-downloaded if it's broken. */
  readonly url?: string;
};

/** Aggregate verification result returned by each `verify.<kind>.run` API. */
export type VerificationResult = {
  readonly targetId: string;
  readonly kind: VerificationKind;
  readonly isValid: boolean;
  readonly issues: readonly VerificationFileResult[];
  readonly checkedFiles: number;
  readonly durationMs: number;
};
