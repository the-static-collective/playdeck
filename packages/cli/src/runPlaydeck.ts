import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import {
  basename,
  dirname,
  extname,
  join,
  relative,
  resolve,
  sep,
} from "node:path";
import {fileURLToPath} from "node:url";
import {spawnSync} from "node:child_process";
import type {TrackSpec, WorldRule} from "@playdeck/core";
import {analyzeAudio} from "@playdeck/audio-analysis";
import {composeDeck, assertValidCompositionPlan} from "@playdeck/composer";
import {ingestFolder} from "@playdeck/ingest";
import {
  assertValidReceipt,
  projectReceipt,
  sealReceipt,
} from "@playdeck/receipts";
import {defaultWorldRule} from "./defaultWorld";
import {sha256File} from "./hash";

export type RunPlaydeckOptions = {
  id: string;
  images: string;
  audio: string;
  outputDir: string;
  title?: string;
  worldRule?: WorldRule;
  fps?: 24 | 30 | 60;
  width?: number;
  height?: number;
  render?: boolean;
  keepStage?: boolean;
};

const normalizePath = (value: string) => value.split(sep).join("/");

const repoRoot = fileURLToPath(new URL("../../../", import.meta.url));
const renderPackage = join(repoRoot, "packages", "render-remotion");
const renderPublic = join(renderPackage, "public", "playdeck-jobs");

const writeJson = (file: string, value: unknown) => {
  mkdirSync(dirname(file), {recursive: true});
  writeFileSync(file, JSON.stringify(value, null, 2) + "\n", "utf8");
};

const loadWorld = (world: WorldRule | undefined): WorldRule =>
  world ?? defaultWorldRule();

const stageJob = ({
  id,
  images,
  audio,
  deckSources,
}: {
  id: string;
  images: string;
  audio: string;
  deckSources: Array<{source: string; relativePath: string}>;
}) => {
  const stageRoot = join(renderPublic, id);
  rmSync(stageRoot, {recursive: true, force: true});

  const imageRoot = join(stageRoot, "images");
  const audioRoot = join(stageRoot, "audio");
  mkdirSync(imageRoot, {recursive: true});
  mkdirSync(audioRoot, {recursive: true});

  const assets: Record<string, string> = {};

  for (const card of deckSources) {
    const from = join(images, card.relativePath);
    const to = join(imageRoot, card.relativePath);
    mkdirSync(dirname(to), {recursive: true});
    cpSync(from, to);
    assets[card.source] = normalizePath(
      join("playdeck-jobs", id, "images", card.relativePath),
    );
  }

  const audioName = basename(audio);
  const stagedAudio = join(audioRoot, audioName);
  cpSync(audio, stagedAudio);

  return {
    stageRoot,
    assets,
    audioStaticPath: normalizePath(
      join("playdeck-jobs", id, "audio", audioName),
    ),
  };
};

const remotionBinary = () => {
  const name = process.platform === "win32" ? "remotion.cmd" : "remotion";
  const path = join(repoRoot, "node_modules", ".bin", name);

  if (!existsSync(path)) {
    throw new Error(
      "Remotion CLI is not installed. Run npm install at the PlayDeck repository root.",
    );
  }

  return path;
};

export const runPlaydeck = async (
  options: RunPlaydeckOptions,
): Promise<{
  outputDir: string;
  video?: string;
  projectedReceipt: string;
  renderedReceipt?: string;
}> => {
  const images = resolve(options.images);
  const audio = resolve(options.audio);
  const outputDir = resolve(options.outputDir);
  const render = options.render ?? true;

  if (!existsSync(audio)) {
    throw new Error(`Audio file not found: ${audio}`);
  }

  mkdirSync(outputDir, {recursive: true});

  const deck = ingestFolder(images, {
    deckId: options.id,
    title: options.title,
    sourcePrefix: `asset://${options.id}`,
  });

  const analysis = analyzeAudio(audio, {
    sampleRate: 8000,
    envelopeHz: 1,
  });

  const audioSource = `asset://${options.id}/__audio/${basename(audio)}`;

  const track: TrackSpec = {
    schemaVersion: "0.1",
    id: `${options.id}-track`,
    title: basename(audio, extname(audio)),
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
        "No semantic section gates were inferred from raw audio.",
      ],
    },
    metadata: {
      sourceFile: basename(audio),
    },
  };

  const worldRule = loadWorld(options.worldRule);

  const plan = composeDeck({
    deck,
    track,
    worldRule,
    options: {
      id: `${options.id}-composed`,
      fps: options.fps ?? 24,
      width: options.width ?? 1280,
      height: options.height ?? 720,
    },
  });

  assertValidCompositionPlan(plan, deck);

  const projected = projectReceipt(plan, `${options.id}-receipt`);
  assertValidReceipt(projected, deck);

  writeJson(join(outputDir, "deck.json"), deck);
  writeJson(join(outputDir, "track.json"), track);
  writeJson(join(outputDir, "world-rule.json"), worldRule);
  writeJson(join(outputDir, "plan.json"), plan);
  writeJson(join(outputDir, "envelope.json"), analysis.envelope);
  const projectedReceiptPath = join(outputDir, "receipt.projected.json");
  writeJson(projectedReceiptPath, projected);

  const assetsRoot = join(outputDir, "assets");
  const bundleImages = join(assetsRoot, "images");
  const bundleAudio = join(assetsRoot, "audio");
  mkdirSync(bundleImages, {recursive: true});
  mkdirSync(bundleAudio, {recursive: true});
  cpSync(images, bundleImages, {recursive: true});
  cpSync(audio, join(bundleAudio, basename(audio)));

  if (!render) {
    return {
      outputDir,
      projectedReceipt: projectedReceiptPath,
    };
  }

  const deckSources = deck.cards.map((card) => {
    const ingest = card.metadata?.ingest as
      | {relativePath?: string}
      | undefined;
    const relativePath = ingest?.relativePath;

    if (!relativePath) {
      throw new Error(
        `Card "${card.id}" lacks ingest.relativePath; generic local staging cannot resolve it.`,
      );
    }

    return {
      source: card.front?.source ?? card.source,
      relativePath,
    };
  });

  const staged = stageJob({
    id: options.id,
    images,
    audio,
    deckSources,
  });
  staged.assets[audioSource] = staged.audioStaticPath;

  const renderProps = {
    deck,
    track,
    worldRule,
    plan,
    assets: staged.assets,
    envelope: analysis.envelope,
    debug: false,
  };

  const propsPath = join(outputDir, "props.render.json");
  writeJson(propsPath, renderProps);

  const video = join(outputDir, "final.mp4");

  try {
    const result = spawnSync(
      remotionBinary(),
      [
        "render",
        "src/index.ts",
        "Playdeck",
        video,
        `--props=${propsPath}`,
        "--codec=h264",
        "--log=error",
      ],
      {
        cwd: renderPackage,
        stdio: "inherit",
      },
    );

    if (result.error) throw result.error;
    if (result.status !== 0) {
      throw new Error(
        `Remotion render failed with status ${String(result.status)}`,
      );
    }

    const rendered = sealReceipt(projected, [
      {
        kind: "video",
        uri: "bundle://final.mp4",
        scope: "full-performance",
        renderer: "@playdeck/render-remotion",
        sha256: await sha256File(video),
        notes: [
          "Produced by the generic PlayDeck CLI from the bundled deck, track, world rule, plan, and envelope.",
        ],
      },
    ]);

    assertValidReceipt(rendered, deck);
    const renderedReceiptPath = join(outputDir, "receipt.rendered.json");
    writeJson(renderedReceiptPath, rendered);

    return {
      outputDir,
      video,
      projectedReceipt: projectedReceiptPath,
      renderedReceipt: renderedReceiptPath,
    };
  } finally {
    if (!options.keepStage) {
      rmSync(staged.stageRoot, {recursive: true, force: true});
    }
  }
};
