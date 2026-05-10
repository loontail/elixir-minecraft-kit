import { ApiEndpoints } from "../constants/api";
import { MinecraftKitError } from "../core/errors";
import { fetchJson } from "../http/metadata";
import type {
  FabricCompatibilityEntry,
  FabricLoaderSummary,
  FabricProfile,
  ResolvedFabricLoader,
} from "../types/fabric";
import { Loaders, VersionPreference, type VersionPreferenceKind } from "../types/loader";
import type { ResolverContext } from "./context";

/** Inputs to {@link FabricVersionsApi.list}. */
export interface FabricListInput {
  readonly minecraftVersion?: string;
  readonly signal?: AbortSignal;
}

/** Inputs to {@link FabricVersionsApi.resolve}. */
export interface FabricResolveInput {
  readonly minecraftVersion: string;
  readonly preference?: VersionPreferenceKind;
  readonly loaderVersion?: string;
  readonly signal?: AbortSignal;
}

/** Public Fabric versions API surface. */
export class FabricVersionsApi {
  constructor(private readonly ctx: ResolverContext) {}

  /** List Fabric loader versions, optionally constrained to a Minecraft version. */
  async list(input: FabricListInput = {}): Promise<readonly FabricLoaderSummary[]> {
    if (input.minecraftVersion === undefined) {
      return fetchJson<readonly FabricLoaderSummary[]>(this.ctx.http, this.ctx.cache, {
        url: ApiEndpoints.fabric.loaderVersions(),
        cacheKey: "fabric-loader-all",
        ...(input.signal !== undefined ? { signal: input.signal } : {}),
      });
    }
    const compat = await fetchJson<readonly FabricCompatibilityEntry[]>(
      this.ctx.http,
      this.ctx.cache,
      {
        url: ApiEndpoints.fabric.loaderForGame(input.minecraftVersion),
        cacheKey: `fabric-loader-mc:${input.minecraftVersion}`,
        ...(input.signal !== undefined ? { signal: input.signal } : {}),
      },
    );
    return compat.map((c) => c.loader);
  }

  /** Resolve a Fabric loader version against a Minecraft version. */
  async resolve(input: FabricResolveInput): Promise<ResolvedFabricLoader> {
    const loaders = await this.list({
      minecraftVersion: input.minecraftVersion,
      ...(input.signal !== undefined ? { signal: input.signal } : {}),
    });
    if (loaders.length === 0) {
      throw new MinecraftKitError(
        "MANIFEST_NOT_FOUND",
        `No Fabric loader available for Minecraft ${input.minecraftVersion}`,
        { context: { version: input.minecraftVersion } },
      );
    }
    const chosen = pickFabricLoader(loaders, input);
    if (!chosen) {
      throw new MinecraftKitError(
        "MANIFEST_NOT_FOUND",
        `Fabric loader version not found: ${input.loaderVersion ?? "(none matched)"}`,
        { context: { version: input.loaderVersion } },
      );
    }
    const profile = await fetchJson<FabricProfile>(this.ctx.http, this.ctx.cache, {
      url: ApiEndpoints.fabric.profile(input.minecraftVersion, chosen.version),
      cacheKey: `fabric-profile:${input.minecraftVersion}:${chosen.version}`,
      ...(input.signal !== undefined ? { signal: input.signal } : {}),
    });
    return {
      type: Loaders.FABRIC,
      minecraftVersion: input.minecraftVersion,
      loaderVersion: chosen.version,
      profile,
    };
  }
}

function pickFabricLoader(
  loaders: readonly FabricLoaderSummary[],
  input: FabricResolveInput,
): FabricLoaderSummary | undefined {
  if (input.loaderVersion !== undefined) {
    return loaders.find((l) => l.version === input.loaderVersion);
  }
  const preference = input.preference ?? VersionPreference.LATEST;
  if (preference === VersionPreference.RECOMMENDED) {
    const stable = loaders.find((l) => l.stable);
    if (stable) return stable;
  }
  return loaders[0];
}
