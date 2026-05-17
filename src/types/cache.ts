/** Pluggable in-memory cache for HTTP metadata responses. */
export type MetadataCache = {
  get<T>(key: string): T | undefined;
  set<T>(key: string, value: T, ttlMs?: number): void;
  delete(key: string): void;
  clear(): void;
};
