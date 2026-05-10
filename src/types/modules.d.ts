declare module "lzma" {
  /** Minimal type surface for the pure-JS `lzma` package (LZMA1 alone). */
  const lzma: {
    decompress(
      bytes: Uint8Array | number[],
      callback: (result: Uint8Array | number[] | null, error: unknown) => void,
    ): void;
  };
  export default lzma;
}
