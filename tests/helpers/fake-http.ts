import type {
  HttpClient,
  HttpHeaders,
  HttpRequestOptions,
  HttpResponse,
} from "../../src/types/http";

/** A scripted response for {@link FakeHttpClient}. */
export interface FakeResponseSpec {
  readonly status?: number;
  readonly headers?: HttpHeaders;
  readonly body: string | Uint8Array | (() => Uint8Array);
}

/** Test-only HttpClient that returns scripted responses keyed by URL. */
export class FakeHttpClient implements HttpClient {
  readonly requests: { url: string; options?: HttpRequestOptions }[] = [];
  private readonly responses = new Map<string, FakeResponseSpec>();

  on(url: string, response: FakeResponseSpec): this {
    this.responses.set(url, response);
    return this;
  }

  async request(url: string, options?: HttpRequestOptions): Promise<HttpResponse> {
    this.requests.push({ url, ...(options !== undefined ? { options } : {}) });
    const spec = this.responses.get(url);
    if (!spec) {
      throw new Error(`Unmocked URL: ${url}`);
    }
    const status = spec.status ?? 200;
    const headers = spec.headers ?? {};
    const bodyBytes =
      typeof spec.body === "function"
        ? spec.body()
        : typeof spec.body === "string"
          ? new TextEncoder().encode(spec.body)
          : spec.body;
    return {
      status,
      headers,
      url,
      async text() {
        return new TextDecoder().decode(bodyBytes);
      },
      async json<T = unknown>() {
        return JSON.parse(new TextDecoder().decode(bodyBytes)) as T;
      },
      async bytes() {
        return bodyBytes;
      },
      async *stream() {
        const chunkSize = 4096;
        for (let offset = 0; offset < bodyBytes.length; offset += chunkSize) {
          yield bodyBytes.slice(offset, offset + chunkSize);
        }
      },
    };
  }
}
