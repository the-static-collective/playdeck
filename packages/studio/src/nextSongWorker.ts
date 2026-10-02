import {readFileSync, writeFileSync} from "node:fs";
import {resolve} from "node:path";
import type {StudioNextSongPayload} from "./cockpitTypes";
import {prepareNextSong} from "./nextSongServer";

const [inputArg, outputArg] = process.argv.slice(2);
if (!inputArg || !outputArg) {
  throw new Error("Usage: nextSongWorker <request.json> <response.json>");
}

const payload = JSON.parse(
  readFileSync(resolve(inputArg), "utf8"),
) as StudioNextSongPayload;

const result = await prepareNextSong(payload);
writeFileSync(resolve(outputArg), JSON.stringify(result), "utf8");
