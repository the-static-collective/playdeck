import {
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import {join} from "node:path";
import {fileURLToPath} from "node:url";
import type {CompositionPlan, DeckSpec, PerformanceReceipt} from "@playdeck/core";
import {canInheritReceipt} from "@playdeck/receipts";
import {runAlbum} from "./index";

const writeTestWav = (
  path: string,
  frequencies: [number, number, number],
  durationSeconds = 2,
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
    const [a, b, c] = frequencies;
    const amplitude =
      0.31 * Math.sin(2 * Math.PI * a * t) +
      0.20 * Math.sin(2 * Math.PI * b * t) +
      0.11 * Math.sin(2 * Math.PI * c * t);
    const pulse = Math.sin(2 * Math.PI * (1.5 + a / 300) * t) > 0 ? 1 : 0.48;
    const sample = Math.max(-1, Math.min(1, amplitude * pulse));
    buffer.writeInt16LE(Math.round(sample * 32767), 44 + i * 2);
  }

  writeFileSync(path, buffer);
};

const readJson = <T>(path: string): T =>
  JSON.parse(readFileSync(path, "utf8")) as T;

const imageFolder = fileURLToPath(
  new URL("../../../examples/ingest-001/images/", import.meta.url),
);
const outputDir = fileURLToPath(
  new URL("../../../out/album-001/", import.meta.url),
);
const audioDir = fileURLToPath(
  new URL("../../../out/album-001-inputs/", import.meta.url),
);

rmSync(outputDir, {recursive: true, force: true});
rmSync(audioDir, {recursive: true, force: true});
mkdirSync(audioDir, {recursive: true});

const tracks = [
  {name: "01-arrival.wav", frequencies: [88, 440, 2200] as [number, number, number]},
  {name: "02-answer.wav", frequencies: [130, 730, 3100] as [number, number, number]},
  {name: "03-room.wav", frequencies: [55, 520, 2700] as [number, number, number]},
].map(({name, frequencies}) => {
  const audio = join(audioDir, name);
  writeTestWav(audio, frequencies);
  return {audio, title: name.replace(/\.wav$/, "")};
});

const album = await runAlbum({
  id: "album-001",
  title: "Album 001 — Persistent Deck Proof",
  images: imageFolder,
  tracks,
  outputDir,
  fps: 24,
  width: 640,
  height: 360,
});

if (album.tracks.length !== 3) {
  throw new Error(`Expected 3 album tracks, got ${album.tracks.length}`);
}

const finalDeckState = readJson<DeckSpec>(
  join(outputDir, "final-deck.json"),
);

if (finalDeckState.cards.length !== 7) {
  throw new Error(
    `Expected 4 original + 3 awakened cards, got ${finalDeckState.cards.length}`,
  );
}

const awakenedCards = finalDeckState.cards.filter((card) =>
  card.temperament?.includes("born-from-prior-performance"),
);
if (awakenedCards.length !== 3) {
  throw new Error(
    `Expected 3 inherited awakened descendants, got ${awakenedCards.length}`,
  );
}

if (album.continuityDepth !== 3) {
  throw new Error(
    `Expected continuity depth 3, got ${album.continuityDepth}`,
  );
}

if (album.tracks[0].introFrom !== "stack") {
  throw new Error(
    `Track 1 should begin from stack, got ${String(album.tracks[0].introFrom)}`,
  );
}

for (const track of album.tracks.slice(1)) {
  if (track.introFrom !== "inherited-room") {
    throw new Error(
      `Track ${track.index} should begin from inherited-room, got ${String(track.introFrom)}`,
    );
  }
}

for (const track of album.tracks) {
  const receipt = readJson<PerformanceReceipt>(track.receipt);
  if (!canInheritReceipt(receipt)) {
    throw new Error(`Track ${track.index} receipt is not inheritable.`);
  }
  if (!receipt.evidence?.[0]?.sha256) {
    throw new Error(`Track ${track.index} is missing hashed render evidence.`);
  }
}

const track2Deck = readJson<DeckSpec>(
  join(outputDir, "tracks", "02", "deck.json"),
);
const track3Deck = readJson<DeckSpec>(
  join(outputDir, "tracks", "03", "deck.json"),
);

const historyDepth = (deck: DeckSpec) => {
  const continuity = deck.metadata?.continuity as
    | {history?: unknown[]}
    | undefined;
  return continuity?.history?.length ?? 0;
};

if (historyDepth(track2Deck) !== 1) {
  throw new Error("Track 2 input deck must carry exactly one prior receipt.");
}

if (historyDepth(track3Deck) !== 2) {
  throw new Error("Track 3 input deck must carry exactly two prior receipts.");
}

const track3Plan = readJson<CompositionPlan>(
  join(outputDir, "tracks", "03", "plan.json"),
);
const track3FirstVerse = track3Plan.events.find((event) => event.type === "hinge");
if (!track3FirstVerse?.cards?.length) {
  throw new Error("Track 3 should still have addressable carried cards.");
}

console.log(
  JSON.stringify({
    tracks: album.tracks.map((track) => ({
      index: track.index,
      introFrom: track.introFrom,
      outputInheritedReceipt: track.outputInheritedReceipt,
    })),
    continuityDepth: album.continuityDepth,
    track2InputHistory: historyDepth(track2Deck),
    track3InputHistory: historyDepth(track3Deck),
    track3FirstVerseCards: track3FirstVerse.cards,
    finalCardCount: finalDeckState.cards.length,
    awakenedCards: awakenedCards.map((card) => card.id),
  }),
);
