import type {IncomingMessage, ServerResponse} from "node:http";
import type {Plugin} from "vite";
import {commitStudioPayload} from "./commitServer";
import type {StudioCommitPayload} from "./cockpitTypes";

const MAX_BODY = 512 * 1024 * 1024;

const readJsonBody = async (
  request: IncomingMessage,
): Promise<StudioCommitPayload> =>
  await new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;

    request.on("data", (chunk: Buffer) => {
      size += chunk.length;
      if (size > MAX_BODY) {
        reject(new Error("Studio commit payload exceeds 512 MB."));
        request.destroy();
        return;
      }
      chunks.push(chunk);
    });

    request.on("end", () => {
      try {
        resolve(
          JSON.parse(Buffer.concat(chunks).toString("utf8")) as StudioCommitPayload,
        );
      } catch (error) {
        reject(error);
      }
    });

    request.on("error", reject);
  });

const send = (
  response: ServerResponse,
  status: number,
  value: unknown,
) => {
  response.statusCode = status;
  response.setHeader("content-type", "application/json; charset=utf-8");
  response.end(JSON.stringify(value));
};

export const studioCockpitPlugin = (): Plugin => ({
  name: "playdeck-studio-cockpit",
  configureServer(server) {
    server.middlewares.use(
      "/api/studio/commit",
      async (request, response) => {
        if (request.method !== "POST") {
          send(response, 405, {error: "POST required"});
          return;
        }

        try {
          const payload = await readJsonBody(request);
          const result = await commitStudioPayload(payload);
          send(response, 200, result);
        } catch (error) {
          send(response, 500, {
            error: error instanceof Error ? error.message : String(error),
          });
        }
      },
    );
  },
});
