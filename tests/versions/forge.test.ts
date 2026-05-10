import { describe, expect, it } from "vitest";
import { ApiEndpoints } from "../../src/constants/api";
import { silentLogger } from "../../src/core/logger";
import { createMemoryCache } from "../../src/http/cache";
import { VersionPreference } from "../../src/types/loader";
import { ForgeVersionsApi } from "../../src/versions/forge";
import { FakeHttpClient } from "../helpers/fake-http";

const xml = `<metadata><versioning><versions>
<version>1.20.1-47.2.0</version>
<version>1.20.1-47.2.5</version>
<version>1.19.4-45.1.0</version>
</versions></versioning></metadata>`;

const promotions = {
  promos: {
    "1.20.1-recommended": "47.2.0",
    "1.20.1-latest": "47.2.5",
  },
};

function buildKit(): { api: ForgeVersionsApi; http: FakeHttpClient } {
  const http = new FakeHttpClient()
    .on(ApiEndpoints.forge.mavenMetadata(), { body: xml })
    .on(ApiEndpoints.forge.promotions(), { body: JSON.stringify(promotions) });
  const api = new ForgeVersionsApi({ http, cache: createMemoryCache(), logger: silentLogger });
  return { api, http };
}

describe("ForgeVersionsApi", () => {
  it("lists all builds", async () => {
    const { api } = buildKit();
    const list = await api.list();
    expect(list.length).toBe(3);
  });

  it("filters by minecraft version", async () => {
    const { api } = buildKit();
    const list = await api.list({ minecraftVersion: "1.20.1" });
    expect(list.length).toBe(2);
  });

  it("resolves recommended", async () => {
    const { api } = buildKit();
    const resolved = await api.resolve({
      minecraftVersion: "1.20.1",
      preference: VersionPreference.RECOMMENDED,
    });
    expect(resolved.forgeVersion).toBe("47.2.0");
  });

  it("resolves latest", async () => {
    const { api } = buildKit();
    const resolved = await api.resolve({
      minecraftVersion: "1.20.1",
      preference: VersionPreference.LATEST,
    });
    expect(resolved.forgeVersion).toBe("47.2.5");
  });

  it("resolves explicit version", async () => {
    const { api } = buildKit();
    const resolved = await api.resolve({
      minecraftVersion: "1.20.1",
      forgeVersion: "47.2.5",
    });
    expect(resolved.forgeVersion).toBe("47.2.5");
  });

  it("rejects when no builds for MC version", async () => {
    const { api } = buildKit();
    await expect(api.resolve({ minecraftVersion: "9.9" })).rejects.toBeTruthy();
  });

  it("rejects unknown forgeVersion", async () => {
    const { api } = buildKit();
    await expect(
      api.resolve({ minecraftVersion: "1.20.1", forgeVersion: "0.0" }),
    ).rejects.toBeTruthy();
  });
});
