import {
  type MinecraftKitErrorCode,
  MinecraftKitErrorCodes,
  type MinecraftKitErrorContext,
} from "../types/errors";

export { MinecraftKitErrorCodes };
export type { MinecraftKitErrorCode };

/**
 * The single error class thrown by every public API in `@loontail/minecraft-kit`.
 *
 * Use {@link isMinecraftKitError} or {@link isErrorCode} for type-narrowing in `catch` blocks.
 */
export class MinecraftKitError extends Error {
  override readonly name = "MinecraftKitError";

  /** Stable discriminator. */
  readonly code: MinecraftKitErrorCode;

  /** Structured context; safe to serialize. */
  readonly context: Readonly<MinecraftKitErrorContext>;

  constructor(
    code: MinecraftKitErrorCode,
    message: string,
    options: { cause?: unknown; context?: MinecraftKitErrorContext } = {},
  ) {
    super(message, options.cause === undefined ? undefined : { cause: options.cause });
    Object.setPrototypeOf(this, new.target.prototype);
    this.code = code;
    this.context = Object.freeze({ ...(options.context ?? {}) });
  }

  /** JSON-friendly representation. */
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      context: this.context,
      cause:
        this.cause instanceof Error
          ? { name: this.cause.name, message: this.cause.message }
          : this.cause,
    };
  }
}

/** True when `e` is an {@link MinecraftKitError}. */
export const isMinecraftKitError = (e: unknown): e is MinecraftKitError => {
  return e instanceof MinecraftKitError;
};

/** True when `e` is an {@link MinecraftKitError} carrying the given code. */
export const isErrorCode = <C extends MinecraftKitErrorCode>(
  e: unknown,
  code: C,
): e is MinecraftKitError & { code: C } => {
  return isMinecraftKitError(e) && e.code === code;
};
