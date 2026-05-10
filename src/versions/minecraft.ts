import { ApiEndpoints } from "../constants/api";
import { MinecraftKitError } from "../core/errors";
import { fetchJson } from "../http/metadata";
import type {
  MinecraftChannel,
  MinecraftVersionManifest,
  MinecraftVersionSummary,
  ResolvedMinecraft,
} from "../types/minecraft";
import type { ResolverContext } from "./context";

/** Top-level shape returned by `version_manifest_v2.json`. */
interface VersionManifestRoot {
  readonly latest: { readonly release: string; readonly snapshot: string };
  readonly versions: readonly MinecraftVersionSummary[];
}

/** Inputs to {@link MinecraftVersionsApi.list}. */
export interface MinecraftListInput {
  readonly channel?: MinecraftChannel;
  readonly signal?: AbortSignal;
}

/** Inputs to {@link MinecraftVersionsApi.latest}. */
export interface MinecraftLatestInput {
  readonly channel?: MinecraftChannel;
  readonly signal?: AbortSignal;
}

/** Inputs to {@link MinecraftVersionsApi.get} / `.resolve`. */
export interface MinecraftGetInput {
  readonly version: string;
  readonly signal?: AbortSignal;
}

/** Public Minecraft versions API surface. */
export class MinecraftVersionsApi {
  constructor(private readonly ctx: ResolverContext) {}

  /** List all Minecraft versions, optionally filtered by channel. */
  async list(input: MinecraftListInput = {}): Promise<readonly MinecraftVersionSummary[]> {
    const root = await this.fetchManifestRoot(input.signal);
    if (input.channel === undefined) return root.versions;
    return root.versions.filter((v) => v.type === input.channel);
  }

  /** Return the latest version on the given channel (defaults to RELEASE). */
  async latest(input: MinecraftLatestInput = {}): Promise<MinecraftVersionSummary> {
    const root = await this.fetchManifestRoot(input.signal);
    const targetId = input.channel === "snapshot" ? root.latest.snapshot : root.latest.release;
    const summary = root.versions.find((v) => v.id === targetId);
    if (!summary) {
      throw new MinecraftKitError(
        "MANIFEST_NOT_FOUND",
        `Latest version ${targetId} not found in manifest`,
      );
    }
    return summary;
  }

  /** Return a single version summary or throw `MANIFEST_NOT_FOUND`. */
  async get(input: MinecraftGetInput): Promise<MinecraftVersionSummary> {
    const root = await this.fetchManifestRoot(input.signal);
    const summary = root.versions.find((v) => v.id === input.version);
    if (!summary) {
      throw new MinecraftKitError(
        "MANIFEST_NOT_FOUND",
        `Minecraft version not found: ${input.version}`,
        { context: { version: input.version } },
      );
    }
    return summary;
  }

  /** Fetch and parse the per-version manifest in addition to the summary. */
  async resolve(input: MinecraftGetInput): Promise<ResolvedMinecraft> {
    const summary = await this.get(input);
    const manifest = await fetchJson<MinecraftVersionManifest>(this.ctx.http, this.ctx.cache, {
      url: summary.url,
      cacheKey: `minecraft-manifest:${summary.id}:${summary.sha1}`,
      ...(input.signal !== undefined ? { signal: input.signal } : {}),
    });
    if (!manifest.id || !manifest.mainClass) {
      throw new MinecraftKitError(
        "MANIFEST_INVALID",
        `Per-version manifest is missing required fields: ${summary.id}`,
        { context: { version: summary.id, url: summary.url } },
      );
    }
    return {
      version: summary.id,
      channel: summary.type,
      manifest,
      summary,
    };
  }

  private async fetchManifestRoot(signal: AbortSignal | undefined): Promise<VersionManifestRoot> {
    return fetchJson<VersionManifestRoot>(this.ctx.http, this.ctx.cache, {
      url: ApiEndpoints.mojang.versionManifest(),
      cacheKey: "minecraft-version-manifest-v2",
      ...(signal !== undefined ? { signal } : {}),
    });
  }
}
