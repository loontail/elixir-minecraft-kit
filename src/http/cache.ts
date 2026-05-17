import { LRUCache } from "lru-cache";
import { CACHE_MAX_ENTRIES, CACHE_TTL_MS } from "../constants/defaults";
import type { MetadataCache } from "../types/cache";

/** Inputs to {@link createMemoryCache}. */
export type MemoryCacheOptions = {
  readonly maxEntries?: number;
  readonly ttlMs?: number;
};

/** In-memory metadata cache backed by `lru-cache`. */
export const createMemoryCache = (options: MemoryCacheOptions = {}): MetadataCache => {
  const cache = new LRUCache<string, object>({
    max: options.maxEntries ?? CACHE_MAX_ENTRIES,
    ttl: options.ttlMs ?? CACHE_TTL_MS,
  });
  return {
    get<T>(key: string): T | undefined {
      const wrapped = cache.get(key) as { value: T } | undefined;
      return wrapped === undefined ? undefined : wrapped.value;
    },
    set<T>(key: string, value: T, ttlMs?: number): void {
      const wrapped = { value };
      if (ttlMs === undefined) {
        cache.set(key, wrapped);
      } else {
        cache.set(key, wrapped, { ttl: ttlMs });
      }
    },
    delete(key: string): void {
      cache.delete(key);
    },
    clear(): void {
      cache.clear();
    },
  };
};
