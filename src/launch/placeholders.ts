import { MinecraftKitError } from "../core/errors";

/** Substitute `${...}` placeholders in a single argument. */
export function substituteArg(raw: string, values: Readonly<Record<string, string>>): string {
  return raw.replaceAll(/\$\{([a-zA-Z0-9_]+)\}/g, (match, key: string) => {
    const value = values[key];
    if (value === undefined) {
      throw new MinecraftKitError("INVALID_INPUT", `Unknown launch placeholder: ${match}`, {
        context: { placeholder: key },
      });
    }
    return value;
  });
}

/** Substitute placeholders in every entry of an arguments list. */
export function substituteArgs(
  args: readonly string[],
  values: Readonly<Record<string, string>>,
): readonly string[] {
  return args.map((arg) => substituteArg(arg, values));
}
