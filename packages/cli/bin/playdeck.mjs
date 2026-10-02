#!/usr/bin/env node
import {spawnSync} from "node:child_process";
import {existsSync} from "node:fs";
import {dirname, resolve} from "node:path";
import {fileURLToPath} from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "../../..");
const tsx = resolve(
  repoRoot,
  "node_modules",
  ".bin",
  process.platform === "win32" ? "tsx.cmd" : "tsx",
);
const cli = resolve(here, "../src/cli.ts");

if (!existsSync(tsx)) {
  throw new Error(
    "tsx is not installed. Run npm install at the PlayDeck repository root.",
  );
}

const result = spawnSync(tsx, [cli, ...process.argv.slice(2)], {
  cwd: process.cwd(),
  stdio: "inherit",
});

if (result.error) throw result.error;
process.exit(result.status ?? 1);
