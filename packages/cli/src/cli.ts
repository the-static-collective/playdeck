#!/usr/bin/env node
import {readFileSync} from "node:fs";
import {basename, resolve} from "node:path";
import type {WorldRule} from "@playdeck/core";
import {runPlaydeck} from "./runPlaydeck";

const args = process.argv.slice(2);

const positional = args.filter((arg, index) => {
  if (arg.startsWith("-")) return false;
  const previous = args[index - 1];
  if (
    previous &&
    [
      "--id",
      "--out",
      "--title",
      "--world",
      "--fps",
      "--width",
      "--height",
    ].includes(previous)
  ) {
    return false;
  }
  return true;
});

const valueAfter = (flag: string): string | undefined => {
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : undefined;
};

const [images, audio] = positional;

if (!images || !audio) {
  throw new Error(
    "Usage: playdeck <image-folder> <audio-file> [--id deck-id] [--out ./out/deck-id] [--world world-rule.json] [--no-render]",
  );
}

const slug = (value: string) =>
  value
    .toLowerCase()
    .replace(/\.[^.]+$/, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const id =
  valueAfter("--id") ??
  `${slug(basename(resolve(images)))}-${slug(basename(resolve(audio)))}`;

const worldPath = valueAfter("--world");
const worldRule = worldPath
  ? (JSON.parse(readFileSync(resolve(worldPath), "utf8")) as WorldRule)
  : undefined;

const fpsValue = Number(valueAfter("--fps") ?? 24);
if (![24, 30, 60].includes(fpsValue)) {
  throw new Error("--fps must be 24, 30, or 60.");
}

const outputDir = resolve(
  valueAfter("--out") ?? `./out/${id}`,
);

const result = await runPlaydeck({
  id,
  images,
  audio,
  outputDir,
  title: valueAfter("--title"),
  worldRule,
  fps: fpsValue as 24 | 30 | 60,
  width: Number(valueAfter("--width") ?? 1280),
  height: Number(valueAfter("--height") ?? 720),
  render: !args.includes("--no-render"),
  keepStage: args.includes("--keep-stage"),
});

console.log(JSON.stringify(result, null, 2));
