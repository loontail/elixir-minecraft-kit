import { describe, expect, it } from "vitest";
import { createMemoryCache } from "../../src/http/cache";

describe("createMemoryCache", () => {
  it("stores and retrieves values", () => {
    const cache = createMemoryCache();
    cache.set("k", { hello: "world" });
    expect(cache.get<{ hello: string }>("k")).toEqual({ hello: "world" });
  });

  it("returns undefined for missing", () => {
    const cache = createMemoryCache();
    expect(cache.get("missing")).toBeUndefined();
  });

  it("supports custom TTL", () => {
    const cache = createMemoryCache({ ttlMs: 1 });
    cache.set("k", 1, 1);
    expect(cache.get("k")).toBe(1);
  });

  it("delete removes entry", () => {
    const cache = createMemoryCache();
    cache.set("k", 1);
    cache.delete("k");
    expect(cache.get("k")).toBeUndefined();
  });

  it("clear empties cache", () => {
    const cache = createMemoryCache();
    cache.set("k", 1);
    cache.clear();
    expect(cache.get("k")).toBeUndefined();
  });
});
