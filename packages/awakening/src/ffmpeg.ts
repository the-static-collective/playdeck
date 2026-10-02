import {spawnSync} from "node:child_process";

export const runFfmpeg = (args: string[]) => {
  const result = spawnSync("ffmpeg", ["-v", "error", "-y", ...args], {
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });

  if (result.error) {
    throw new Error(
      `Unable to run ffmpeg for bounded awakening: ${result.error.message}`,
    );
  }

  if (result.status !== 0) {
    throw new Error(
      `ffmpeg awakening failed with status ${String(result.status)}: ${result.stderr ?? "unknown error"}`,
    );
  }
};
