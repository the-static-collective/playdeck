import {createHash} from "node:crypto";
import {createReadStream} from "node:fs";

export const sha256File = async (file: string): Promise<string> =>
  await new Promise((resolve, reject) => {
    const hash = createHash("sha256");
    const stream = createReadStream(file);

    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("error", reject);
    stream.on("end", () => resolve(hash.digest("hex")));
  });
