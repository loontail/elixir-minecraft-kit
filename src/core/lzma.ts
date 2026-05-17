import lzmaModule from "lzma";
import { MinecraftKitError } from "./errors";

interface LzmaApi {
  decompress(
    bytes: Uint8Array | number[],
    callback: (result: Uint8Array | number[] | null, error: unknown) => void,
  ): void;
}

const lzma = lzmaModule as unknown as LzmaApi;

/**
 * Decompress a raw LZMA1 (`.lzma` "alone" / `format=alone`) stream into a Buffer.
 *
 * Mojang's runtime LZMA sidecars use this format — not `.xz`, not `.zip`. Decompression is
 * pure-JS so no native build is required.
 */
export const decodeLzma = (input: Uint8Array): Promise<Uint8Array> => {
  return new Promise((resolve, reject) => {
    lzma.decompress(input, (result, error) => {
      if (error) {
        reject(
          new MinecraftKitError("LZMA_DECODE_ERROR", "Failed to decompress LZMA1 stream", {
            cause: error,
          }),
        );
        return;
      }
      if (result === null || result === undefined) {
        reject(new MinecraftKitError("LZMA_DECODE_ERROR", "LZMA decoder returned no output"));
        return;
      }
      resolve(result instanceof Uint8Array ? result : Uint8Array.from(result));
    });
  });
};
