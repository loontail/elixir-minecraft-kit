/** Subset of fetch headers the library actually uses. */
export type HttpHeaders = Readonly<Record<string, string>>;

/** Response delivered by the {@link HttpClient} interface. */
export interface HttpResponse {
  readonly status: number;
  readonly headers: HttpHeaders;
  readonly url: string;
  text(): Promise<string>;
  json<T = unknown>(): Promise<T>;
  bytes(): Promise<Uint8Array>;
  /** Stream the body. The stream may be consumed at most once. */
  stream(): AsyncIterable<Uint8Array>;
}

/** Options for an HTTP request. */
export interface HttpRequestOptions {
  readonly headers?: HttpHeaders;
  readonly signal?: AbortSignal;
  readonly timeoutMs?: number;
  /** When true, do not consult the in-memory cache. */
  readonly noCache?: boolean;
}

/**
 * Pluggable HTTP client. The default implementation uses Node's built-in fetch; consumers
 * can inject a fake (e.g. for tests) by passing an `httpClient` to the {@link MinecraftKit}
 * constructor.
 */
export interface HttpClient {
  request(url: string, options?: HttpRequestOptions): Promise<HttpResponse>;
}
