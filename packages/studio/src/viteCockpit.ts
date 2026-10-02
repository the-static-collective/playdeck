import {spawn} from "node:child_process";
import {existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync} from "node:fs";
import type {IncomingMessage, ServerResponse} from "node:http";
import {tmpdir} from "node:os";
import {dirname, join, resolve} from "node:path";
import {fileURLToPath} from "node:url";
import type {Plugin} from "vite";
import type {
  StudioCommitPayload,
  StudioCommitResult,
  StudioNextSongPayload,
  StudioNextSongResult,
} from "./cockpitTypes";

const MAX_BODY = 512 * 1024 * 1024;
const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "../../..");
const tsx = join(
  repoRoot,
  "node_modules",
  ".bin",
  process.platform === "win32" ? "tsx.cmd" : "tsx",
);
const worker = resolve(here, "commitWorker.ts");
const nextSongWorker = resolve(here, "nextSongWorker.ts");

const readJsonBody = async (
  request: IncomingMessage,
): Promise<StudioCommitPayload> =>
  await new Promise((resolveBody, reject) => {
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
        resolveBody(
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

const runJsonWorker = async <TInput, TOutput>(
  workerPath: string,
  prefix: string,
  payload: TInput,
): Promise<TOutput> => {
  if (!existsSync(tsx)) {
    throw new Error(
      "tsx is not installed. Run npm install at the PlayDeck repository root.",
    );
  }

  const scratch = mkdtempSync(join(tmpdir(), prefix));
  const input = join(scratch, "request.json");
  const output = join(scratch, "response.json");
  writeFileSync(input, JSON.stringify(payload), "utf8");

  try {
    await new Promise<void>((resolveWorker, reject) => {
      const child = spawn(tsx, [workerPath, input, output], {
        cwd: repoRoot,
        stdio: ["ignore", "inherit", "inherit"],
      });

      child.on("error", reject);
      child.on("exit", (code) => {
        if (code === 0) resolveWorker();
        else reject(
          new Error(
            `Studio worker failed with status ${String(code)}`,
          ),
        );
      });
    });

    return JSON.parse(
      readFileSync(output, "utf8"),
    ) as TOutput;
  } finally {
    rmSync(scratch, {recursive: true, force: true});
  }
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
          const result = await runJsonWorker<
            StudioCommitPayload,
            StudioCommitResult
          >(
            worker,
            "playdeck-studio-commit-",
            payload,
          );
          send(response, 200, result);
        } catch (error) {
          send(response, 500, {
            error: error instanceof Error ? error.message : String(error),
          });
        }
      },
    );

    server.middlewares.use(
      "/api/studio/next-song",
      async (request, response) => {
        if (request.method !== "POST") {
          send(response, 405, {error: "POST required"});
          return;
        }

        try {
          const payload = (await readJsonBody(
            request,
          )) as unknown as StudioNextSongPayload;
          const result = await runJsonWorker<
            StudioNextSongPayload,
            StudioNextSongResult
          >(
            nextSongWorker,
            "playdeck-studio-next-",
            payload,
          );
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
