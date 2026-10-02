import {createHash} from "node:crypto";
import {mkdirSync, rmSync, writeFileSync} from "node:fs";
import {basename, extname, join, resolve} from "node:path";
import {fileURLToPath} from "node:url";
import {analyzeAudio} from "@playdeck/audio-analysis";
import {assertValidCompositionPlan, composeDeck} from "@playdeck/composer";
import type {TrackSpec} from "@playdeck/core";
import type {
  StudioNextSongPayload,
  StudioNextSongResult,
} from "./cockpitTypes";

const repoRoot = fileURLToPath(new URL("../../../", import.meta.url));

const safeName = (value: string) =>
  basename(value).replace(/[^a-zA-Z0-9._-]+/g, "-") || "track.bin";

const stem = (value: string) => {
  const name = basename(value);
  const extension = extname(name);
  return extension ? name.slice(0, -extension.length) : name;
};

const nextHash = (payload: StudioNextSongPayload) =>
  createHash("sha256")
    .update(payload.audio.base64)
    .update("\0")
    .update(payload.deck.id)
    .update("\0")
    .update(payload.deck.inheritedReceipt ?? "fresh")
    .digest("hex")
    .slice(0, 12);

export const prepareNextSong = async (
  payload: StudioNextSongPayload,
  options: {scratchRoot?: string} = {},
): Promise<StudioNextSongResult> => {
  const hash = nextHash(payload);
  const scratchRoot = resolve(
    options.scratchRoot ?? join(repoRoot, ".playdeck-studio-next"),
  );
  const scratch = join(scratchRoot, `${payload.deck.id}-${hash}`);
  const audioFile = join(scratch, safeName(payload.audio.name));

  rmSync(scratch, {recursive: true, force: true});
  mkdirSync(scratch, {recursive: true});

  try {
    writeFileSync(
      audioFile,
      Buffer.from(payload.audio.base64, "base64"),
    );

    const analysis = analyzeAudio(audioFile, {
      sampleRate: 8000,
      envelopeHz: 1,
    });

    const audioSource =
      `asset://${payload.deck.id}/__studio-next/${hash}/${safeName(payload.audio.name)}`;

    const track: TrackSpec = {
      schemaVersion: "0.1",
      id: `${payload.deck.id}-studio-track-${hash}`,
      title: stem(payload.audio.name),
      source: audioSource,
      duration: analysis.duration,
      analysis: {
        envelope: {
          bands: ["low", "mid", "high"],
          artifact: "bundle://envelope.json",
          sampleHz: analysis.envelopeHz,
        },
        notes: [
          analysis.method,
          "Prepared inside PlayDeck Studio against an inherited deck.",
        ],
      },
      metadata: {
        sourceFile: payload.audio.name,
        studioPrepared: true,
        inheritedReceipt: payload.deck.inheritedReceipt,
      },
    };

    const plan = composeDeck({
      deck: payload.deck,
      track,
      worldRule: payload.worldRule,
      options: {
        id: `${track.id}-composed`,
        fps: payload.priorPlan.fps,
        width: payload.priorPlan.width,
        height: payload.priorPlan.height,
      },
    });

    assertValidCompositionPlan(plan, payload.deck);

    return {
      track,
      envelope: analysis.envelope,
      plan,
      audioAsset: payload.audio,
    };
  } finally {
    rmSync(scratch, {recursive: true, force: true});
  }
};
