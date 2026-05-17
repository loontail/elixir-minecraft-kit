import os from "node:os";
import { NODE_ARCH_TO_MOJANG_ARCH, NODE_PLATFORM_TO_MOJANG_OS } from "../constants/platform";
import type { Architecture, OperatingSystem, RuntimeSystem } from "../types/system";
import { MinecraftKitError } from "./errors";

/** Inputs allowing the host system to be derived from current Node values or overrides. */
export type DetectSystemInput = {
  readonly platform?: NodeJS.Platform;
  readonly arch?: NodeJS.Architecture;
  readonly osVersion?: string;
};

/**
 * Resolve the current host system identifiers.
 *
 * @throws {@link MinecraftKitError} with code `RUNTIME_UNSUPPORTED_PLATFORM` when the
 * platform/arch combination is not understood.
 */
export const detectSystem = (input: DetectSystemInput = {}): RuntimeSystem => {
  const platform = input.platform ?? process.platform;
  const arch = input.arch ?? process.arch;
  const osVersion = input.osVersion ?? os.release();
  const mojangOs = (NODE_PLATFORM_TO_MOJANG_OS as Record<string, OperatingSystem | undefined>)[
    platform
  ];
  const mojangArch = (NODE_ARCH_TO_MOJANG_ARCH as Record<string, Architecture | undefined>)[arch];
  if (mojangOs === undefined || mojangArch === undefined) {
    throw new MinecraftKitError(
      "RUNTIME_UNSUPPORTED_PLATFORM",
      `Unsupported platform/arch combination: ${platform}/${arch}`,
      { context: { platform, arch: String(arch) } },
    );
  }
  return { os: mojangOs, arch: mojangArch, osVersion };
};
