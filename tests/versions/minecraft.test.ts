import { describe, expect, it } from "vitest";
import { ApiEndpoints } from "../../src/constants/api";
import { silentLogger } from "../../src/core/logger";
import { createMemoryCache } from "../../src/http/cache";
import type { MinecraftVersionManifest } from "../../src/types/minecraft";
import { MinecraftVersionsApi } from "../../src/versions/minecraft";
import { FakeHttpClient } from "../helpers/fake-http";

const manifestRoot = {
  latest: { release: "1.20.1", snapshot: "23w14a" },
  versions: [
    {
      id: "1.20.1",
      type: "release",
      url: "https://manifests/1.20.1",
      time: "t",
      releaseTime: "r",
      sha1: "x",
      complianceLevel: 1,
    },
    {
      id: "23w14a",
      type: "snapshot",
      url: "https://manifests/23w14a",
      time: "t",
      releaseTime: "r",
      sha1: "x",
      complianceLevel: 1,
    },
  ],
};

const versionManifest: MinecraftVersionManifest = {
  id: "1.20.1",
  type: "release",
  mainClass: "net.minecraft.client.main.Main",
  assetIndex: { id: "5", sha1: "x", size: 1, totalSize: 1, url: "https://assets/" },
  assets: "5",
  downloads: { client: { sha1: "x", size: 1, url: "https://client/" } },
  libraries: [],
};

const buildKit = (): { api: MinecraftVersionsApi; http: FakeHttpClient } => {
  const http = new FakeHttpClient()
    .on(ApiEndpoints.mojang.versionManifest(), { body: JSON.stringify(manifestRoot) })
    .on("https://manifests/1.20.1", { body: JSON.stringify(versionManifest) });
  const api = new MinecraftVersionsApi({ http, cache: createMemoryCache(), logger: silentLogger });
  return { api, http };
};

describe("MinecraftVersionsApi", () => {
  it("lists all versions", async () => {
    const { api } = buildKit();
    const list = await api.list();
    expect(list).toHaveLength(2);
  });

  it("filters by channel", async () => {
    const { api } = buildKit();
    const releases = await api.list({ channel: "release" });
    expect(releases).toHaveLength(1);
  });

  it("returns latest release", async () => {
    const { api } = buildKit();
    expect((await api.latest()).id).toBe("1.20.1");
  });

  it("returns latest snapshot", async () => {
    const { api } = buildKit();
    expect((await api.latest({ channel: "snapshot" })).id).toBe("23w14a");
  });

  it("rejects unknown version", async () => {
    const { api } = buildKit();
    await expect(api.get({ version: "99.0.0" })).rejects.toBeTruthy();
  });

  it("resolves a version manifest", async () => {
    const { api } = buildKit();
    const resolved = await api.resolve({ version: "1.20.1" });
    expect(resolved.manifest.mainClass).toBe("net.minecraft.client.main.Main");
  });

  it("rejects manifests with missing fields", async () => {
    const http = new FakeHttpClient()
      .on(ApiEndpoints.mojang.versionManifest(), { body: JSON.stringify(manifestRoot) })
      .on("https://manifests/1.20.1", { body: '{"id":""}' });
    const api = new MinecraftVersionsApi({
      http,
      cache: createMemoryCache(),
      logger: silentLogger,
    });
    await expect(api.resolve({ version: "1.20.1" })).rejects.toBeTruthy();
  });
});
