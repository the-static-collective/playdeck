import {
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import {
  basename,
  dirname,
  extname,
  join,
  resolve,
} from "node:path";
import type {
  CompositionPlan,
  DeckSpec,
  PerformanceReceipt,
} from "@playdeck/core";
import {runPlaydeck} from "@playdeck/cli";
import {applyReceiptToDeck} from "@playdeck/continuity";
import {ingestFolder} from "@playdeck/ingest";
import {canInheritReceipt} from "@playdeck/receipts";
import type {
  AlbumManifest,
  AlbumTrackResult,
  RunAlbumOptions,
} from "./types";

const writeJson = (file: string, value: unknown) => {
  mkdirSync(dirname(file), {recursive: true});
  writeFileSync(file, JSON.stringify(value, null, 2) + "\n", "utf8");
};

const readJson = <T>(file: string): T =>
  JSON.parse(readFileSync(file, "utf8")) as T;

const slug = (value: string) =>
  value
    .toLowerCase()
    .replace(/\.[^.]+$/, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "track";

const continuityDepth = (deck: DeckSpec): number => {
  const continuity = deck.metadata?.continuity;
  if (!continuity || typeof continuity !== "object" || Array.isArray(continuity)) {
    return 0;
  }

  const history = (continuity as Record<string, unknown>).history;
  return Array.isArray(history) ? history.length : 0;
};

export const runAlbum = async (
  options: RunAlbumOptions,
): Promise<AlbumManifest> => {
  if (options.tracks.length === 0) {
    throw new Error("An album requires at least one track.");
  }

  const images = resolve(options.images);
  const outputDir = resolve(options.outputDir);
  const deckId = options.id;

  let deck = ingestFolder(images, {
    deckId,
    title: options.title ?? options.id,
    sourcePrefix: `asset://${deckId}`,
  });

  mkdirSync(outputDir, {recursive: true});
  writeJson(join(outputDir, "initial-deck.json"), deck);

  const results: AlbumTrackResult[] = [];
  let assetSources: Record<string, string> = {};

  for (let index = 0; index < options.tracks.length; index += 1) {
    const track = options.tracks[index];
    const number = String(index + 1).padStart(2, "0");
    const title =
      track.title ?? basename(track.audio, extname(track.audio));
    const performanceId =
      track.id ?? `${options.id}-${number}-${slug(title)}`;
    const trackOutput = join(outputDir, "tracks", number);

    const inputInheritedReceipt = deck.inheritedReceipt;

    const run = await runPlaydeck({
      id: performanceId,
      deckId,
      deck,
      assetSources,
      images,
      audio: track.audio,
      outputDir: trackOutput,
      title,
      worldRule: track.worldRule ?? options.worldRule,
      fps: options.fps ?? 24,
      width: options.width ?? 1280,
      height: options.height ?? 720,
      render: true,
    });

    if (!run.video || !run.renderedReceipt) {
      throw new Error(
        `Album track ${number} did not produce a full render and sealed receipt.`,
      );
    }

    assetSources = run.assetSources;

    const receipt = readJson<PerformanceReceipt>(run.renderedReceipt);
    if (!canInheritReceipt(receipt)) {
      throw new Error(
        `Album track ${number} receipt is not inheritable.`,
      );
    }

    const plan = readJson<CompositionPlan>(join(trackOutput, "plan.json"));
    const intro = plan.events.find((event) => event.type === "arrive");

    deck = applyReceiptToDeck(deck, receipt);
    const deckAfter = join(trackOutput, "deck.after.json");
    writeJson(deckAfter, deck);

    results.push({
      index: index + 1,
      performanceId,
      title,
      outputDir: trackOutput,
      video: run.video,
      receipt: run.renderedReceipt,
      inputInheritedReceipt,
      outputInheritedReceipt: deck.inheritedReceipt ?? "",
      introFrom:
        typeof intro?.params?.from === "string"
          ? intro.params.from
          : undefined,
    });
  }

  const finalDeck = join(outputDir, "final-deck.json");
  writeJson(finalDeck, deck);
  writeJson(
    join(outputDir, "asset-sources.json"),
    assetSources,
  );

  const manifest: AlbumManifest = {
    schemaVersion: "0.1",
    id: options.id,
    title: options.title,
    deckId,
    tracks: results,
    finalDeck,
    continuityDepth: continuityDepth(deck),
  };

  writeJson(join(outputDir, "album.json"), manifest);
  return manifest;
};
