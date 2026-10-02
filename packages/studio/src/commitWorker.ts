import {readFileSync, writeFileSync} from "node:fs";
import {resolve} from "node:path";
import {commitStudioPayload} from "./commitServer";
import type {StudioCommitPayload} from "./cockpitTypes";

const [inputArg, outputArg] = process.argv.slice(2);
if (!inputArg || !outputArg) {
  throw new Error("Usage: commitWorker <request.json> <response.json>");
}

const input = resolve(inputArg);
const output = resolve(outputArg);
const payload = JSON.parse(
  readFileSync(input, "utf8"),
) as StudioCommitPayload;

const result = await commitStudioPayload(payload);
writeFileSync(output, JSON.stringify(result), "utf8");
