/**
 * Exhaustiveness sentinel for discriminated unions. Drop into the `default` of a switch on
 * `kind` / `type` / `status` so the compiler errors when a new variant is added but the
 * switch is not updated.
 *
 * ```ts
 * switch (action.kind) {
 *   case "download-file": return ...;
 *   case "write-version-json": return ...;
 *   default: return assertNever(action);
 * }
 * ```
 */
export const assertNever = (value: never): never => {
  throw new Error(`Unhandled variant: ${JSON.stringify(value)}`);
};
