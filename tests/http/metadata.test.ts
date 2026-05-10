import { describe, expect, it } from "vitest";
import { createMemoryCache } from "../../src/http/cache";
import { fetchJson, fetchText } from "../../src/http/metadata";
import { FakeHttpClient } from "../helpers/fake-http";

describe("metadata fetchers", () => {
  it("fetches and caches JSON", async () => {
    const http = new FakeHttpClient().on("https://x/", { body: '{"a":1}' });
    const cache = createMemoryCache();
    const value = await fetchJson<{ a: number }>(http, cache, { url: "https://x/" });
    expect(value).toEqual({ a: 1 });
    const second = await fetchJson<{ a: number }>(http, cache, { url: "https://x/" });
    expect(second).toEqual({ a: 1 });
    expect(http.requests.length).toBe(1);
  });

  it("uses custom cache key", async () => {
    const http = new FakeHttpClient().on("https://x/", { body: '{"a":2}' });
    const cache = createMemoryCache();
    cache.set("custom", { a: 99 });
    const value = await fetchJson<{ a: number }>(http, cache, {
      url: "https://x/",
      cacheKey: "custom",
    });
    expect(value).toEqual({ a: 99 });
    expect(http.requests.length).toBe(0);
  });

  it("fetches and caches text", async () => {
    const http = new FakeHttpClient().on("https://t/", { body: "plain" });
    const cache = createMemoryCache();
    expect(await fetchText(http, cache, { url: "https://t/" })).toBe("plain");
    expect(await fetchText(http, cache, { url: "https://t/" })).toBe("plain");
    expect(http.requests.length).toBe(1);
  });

  it("forwards abort signal", async () => {
    const http = new FakeHttpClient().on("https://a/", { body: '{"a":1}' });
    const cache = createMemoryCache();
    const controller = new AbortController();
    await fetchJson(http, cache, { url: "https://a/", signal: controller.signal });
    expect(http.requests[0]?.options?.signal).toBe(controller.signal);
  });
});
