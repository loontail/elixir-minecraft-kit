import crypto from "node:crypto";
import { createReadStream } from "node:fs";

/** Compute the SHA-1 of a file on disk. Streams to keep memory usage flat. */
export async function sha1OfFile(filePath: string): Promise<string> {
  const hash = crypto.createHash("sha1");
  await new Promise<void>((resolve, reject) => {
    const stream = createReadStream(filePath);
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("end", resolve);
    stream.on("error", reject);
  });
  return hash.digest("hex");
}
