import crypto from "node:crypto";

/** SHA-1 of an in-memory body — used by tests that build fake HTTP responses. */
export const sha1OfBytes = (input: Uint8Array | string): string => {
  const buf =
    typeof input === "string"
      ? Buffer.from(input, "utf8")
      : Buffer.from(input.buffer, input.byteOffset, input.byteLength);
  return crypto.createHash("sha1").update(buf).digest("hex");
};
