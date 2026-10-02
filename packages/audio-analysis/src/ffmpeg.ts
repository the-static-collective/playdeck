import {spawnSync} from "node:child_process";

const assertCommand = (
  command: string,
  args: string[],
  options: {encoding?: BufferEncoding; maxBuffer?: number} = {},
) => {
  const result = spawnSync(command, args, {
    encoding: options.encoding,
    maxBuffer: options.maxBuffer ?? 256 * 1024 * 1024,
  });

  if (result.error) {
    throw new Error(
      `Unable to run ${command}. Install FFmpeg/ffprobe and ensure it is on PATH. ${result.error.message}`,
    );
  }

  if (result.status !== 0) {
    const stderr =
      typeof result.stderr === "string"
        ? result.stderr
        : result.stderr?.toString("utf8");
    throw new Error(
      `${command} failed with status ${String(result.status)}: ${stderr ?? "unknown error"}`,
    );
  }

  return result;
};

export const probeDuration = (audioFile: string): number => {
  const result = assertCommand(
    "ffprobe",
    [
      "-v",
      "error",
      "-show_entries",
      "format=duration",
      "-of",
      "default=noprint_wrappers=1:nokey=1",
      audioFile,
    ],
    {encoding: "utf8"},
  );

  const duration = Number(String(result.stdout).trim());
  if (!Number.isFinite(duration) || duration <= 0) {
    throw new Error(`Could not determine audio duration for ${audioFile}`);
  }

  return duration;
};

export const decodeMonoFloat32 = (
  audioFile: string,
  sampleRate: number,
): Float32Array => {
  const result = assertCommand(
    "ffmpeg",
    [
      "-v",
      "error",
      "-i",
      audioFile,
      "-vn",
      "-ac",
      "1",
      "-ar",
      String(sampleRate),
      "-f",
      "f32le",
      "pipe:1",
    ],
  );

  const buffer = Buffer.isBuffer(result.stdout)
    ? result.stdout
    : Buffer.from(result.stdout ?? []);

  const count = Math.floor(buffer.length / 4);
  const samples = new Float32Array(count);

  for (let i = 0; i < count; i += 1) {
    samples[i] = buffer.readFloatLE(i * 4);
  }

  return samples;
};
