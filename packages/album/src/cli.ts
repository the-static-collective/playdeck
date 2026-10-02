#!/usr/bin/env node
import {basename, resolve} from "node:path";
import {runAlbum} from "./index";

const args = process.argv.slice(2);

const valueAfter = (flag: string): string | undefined => {
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : undefined;
};

const valuesTakenByFlags = new Set([
  "--id",
  "--out",
  "--title",
  "--fps",
  "--width",
  "--height",
]);

const positional = args.filter((arg, index) => {
  if (arg.startsWith("-")) return false;
  const previous = args[index - 1];
  return !previous || !valuesTakenByFlags.has(previous);
});

const [images, ...tracks] = positional;

if (!images || tracks.length === 0) {
  throw new Error(
    "Usage: playdeck-album <image-folder> <track-1> [track-2 ...] --id <album-id> [--out ./out/album-id]",
  );
}

const id = valueAfter("--id");
if (!id) throw new Error("--id is required.");

const fpsValue = Number(valueAfter("--fps") ?? 24);
if (![24, 30, 60].includes(fpsValue)) {
  throw new Error("--fps must be 24, 30, or 60.");
}

const result = await runAlbum({
  id,
  images: resolve(images),
  tracks: tracks.map((audio) => ({audio: resolve(audio)})),
  outputDir: resolve(valueAfter("--out") ?? `./out/${id}`),
  title: valueAfter("--title") ?? basename(resolve(images)),
  fps: fpsValue as 24 | 30 | 60,
  width: Number(valueAfter("--width") ?? 1280),
  height: Number(valueAfter("--height") ?? 720),
});

console.log(JSON.stringify(result, null, 2));
