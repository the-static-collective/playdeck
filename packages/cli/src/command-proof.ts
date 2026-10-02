import {mkdirSync, readFileSync, rmSync, writeFileSync} from "node:fs";
import {spawnSync} from "node:child_process";
import {join} from "node:path";
import {fileURLToPath} from "node:url";
import type {PerformanceReceipt} from "@playdeck/core";
import {canInheritReceipt} from "@playdeck/receipts";

const writeTestWav = (
  path: string,
  durationSeconds = 4,
  sampleRate = 16000,
) => {
  const frames = Math.floor(durationSeconds * sampleRate);
  const dataBytes = frames * 2;
  const buffer = Buffer.alloc(44 + dataBytes);

  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + dataBytes, 4);
  buffer.write("WAVE", 8);
  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write("data", 36);
  buffer.writeUInt32LE(dataBytes, 40);

  for (let i = 0; i < frames; i += 1) {
    const t = i / sampleRate;
    const amplitude =
      0.34 * Math.sin(2 * Math.PI * 90 * t) +
      0.22 * Math.sin(2 * Math.PI * 620 * t) +
      0.12 * Math.sin(2 * Math.PI * 3100 * t);
    const pulse = Math.sin(2 * Math.PI * 2 * t) > 0 ? 1 : 0.55;
    const sample = Math.max(-1, Math.min(1, amplitude * pulse));
    buffer.writeInt16LE(Math.round(sample * 32767), 44 + i * 2);
  }

  writeFileSync(path, buffer);
};

const repoRoot = fileURLToPath(new URL("../../../", import.meta.url));
const imageFolder = fileURLToPath(
  new URL("../../../examples/ingest-001/images/", import.meta.url),
);
const outputDir = fileURLToPath(
  new URL("../../../out/command-001/", import.meta.url),
);
const inputAudio = fileURLToPath(
  new URL("../../../out/command-001-input.wav", import.meta.url),
);

mkdirSync(fileURLToPath(new URL("../../../out/", import.meta.url)), {
  recursive: true,
});
rmSync(outputDir, {recursive: true, force: true});
writeTestWav(inputAudio);

const command = join(
  repoRoot,
  "node_modules",
  ".bin",
  process.platform === "win32" ? "playdeck.cmd" : "playdeck",
);

const result = spawnSync(
  command,
  [
    imageFolder,
    inputAudio,
    "--id",
    "command-001",
    "--out",
    outputDir,
    "--title",
    "Command 001",
    "--fps",
    "24",
    "--width",
    "640",
    "--height",
    "360",
  ],
  {
    cwd: repoRoot,
    stdio: "inherit",
  },
);

if (result.error) throw result.error;
if (result.status !== 0) {
  throw new Error(
    `Literal playdeck CLI failed with status ${String(result.status)}`,
  );
}

const renderedReceiptPath = join(outputDir, "receipt.rendered.json");
const rendered = JSON.parse(
  readFileSync(renderedReceiptPath, "utf8"),
) as PerformanceReceipt;

if (!canInheritReceipt(rendered)) {
  throw new Error("Full CLI render receipt should be inheritable.");
}

const evidence = rendered.evidence?.[0];
if (!evidence?.sha256 || evidence.scope !== "full-performance") {
  throw new Error("Rendered receipt is missing hashed full-performance evidence.");
}

console.log(
  JSON.stringify({
    command,
    video: join(outputDir, "final.mp4"),
    receipt: renderedReceiptPath,
    phase: rendered.phase,
    inheritable: canInheritReceipt(rendered),
    sha256: evidence.sha256,
  }),
);
