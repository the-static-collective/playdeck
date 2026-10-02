import {
  cpSync,
  existsSync,
  mkdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import {createHash} from "node:crypto";
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
import type {DeckSpec, TrackSpec, WorldRule} from "@playdeck/core";
import {analyzeAudio} from "@playdeck/audio-analysis";
import {materializeAwakenings} from "@playdeck/awakening";
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
  /**
   * Unique performance/job id.
   */
  id: string;

  /**
   * Stable deck identity. Defaults to id for one-off performances.
   */
  deckId?: string;

  /**
   * Optional already-existing deck. Album runtimes use this to carry
   * witnessed state forward without re-ingesting the folder.
   */
  deck?: DeckSpec;

  /**
   * Local source bindings for carried/generated cards.
   * Logical card identity stays asset://; this map is transport only.
   */
  assetSources?: Record<string, string>;

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

const safeAssetName = (logical: string, local: string) => {
  const digest = createHash("sha1").update(logical).digest("hex").slice(0, 12);
  return `${digest}${extname(local).toLowerCase() || ".bin"}`;
};

const resolveDeckAssetSources = (
  deck: DeckSpec,
  images: string,
  supplied: Record<string, string> = {},
): Record<string, string> => {
  const resolved: Record<string, string> = {...supplied};

  for (const card of deck.cards) {
    const logical = card.front?.source ?? card.source;
    if (resolved[logical]) continue;

    const ingest = card.metadata?.ingest as
      | {relativePath?: string}
      | undefined;

    if (ingest?.relativePath) {
      resolved[logical] = join(images, ingest.relativePath);
    }
  }

  return resolved;
};

const stageJob = ({
  id,
  assetSources,
  audio,
  audioSource,
}: {
  id: string;
  assetSources: Record<string, string>;
  audio: string;
  audioSource: string;
}) => {
  const stageRoot = join(renderPublic, id);
  rmSync(stageRoot, {recursive: true, force: true});
  const stagedAssets = join(stageRoot, "assets");
  mkdirSync(stagedAssets, {recursive: true});

  const assets: Record<string, string> = {};

  for (const [logical, local] of Object.entries(assetSources).sort(([a], [b]) =>
    a.localeCompare(b),
  )) {
    if (!existsSync(local)) {
      throw new Error(
        `Local asset binding for "${logical}" does not exist: ${local}`,
      );
    }
    const name = safeAssetName(logical, local);
    cpSync(local, join(stagedAssets, name));
    assets[logical] = normalizePath(
      join("playdeck-jobs", id, "assets", name),
    );
  }

  const audioName = `audio-${basename(audio)}`;
  cpSync(audio, join(stagedAssets, audioName));
  assets[audioSource] = normalizePath(
    join("playdeck-jobs", id, "assets", audioName),
  );

  return {stageRoot, assets};
};

const bundleAssets = (
  outputDir: string,
  assetSources: Record<string, string>,
): Record<string, string> => {
  const target = join(outputDir, "assets", "resolved");
  mkdirSync(target, {recursive: true});
  const map: Record<string, string> = {};

  for (const [logical, local] of Object.entries(assetSources).sort(([a], [b]) =>
    a.localeCompare(b),
  )) {
    if (!existsSync(local)) continue;
    const name = safeAssetName(logical, local);
    cpSync(local, join(target, name));
    map[logical] = `bundle://assets/resolved/${name}`;
  }

  return map;
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
  assetSources: Record<string, string>;
}> => {
  const images = resolve(options.images);
  const audio = resolve(options.audio);
  const outputDir = resolve(options.outputDir);
  const render = options.render ?? true;

  if (!existsSync(audio)) {
    throw new Error(`Audio file not found: ${audio}`);
  }

  mkdirSync(outputDir, {recursive: true});

  const stableDeckId = options.deck?.id ?? options.deckId ?? options.id;

  const deck = options.deck ?? ingestFolder(images, {
    deckId: stableDeckId,
    title: options.title,
    sourcePrefix: `asset://${stableDeckId}`,
  });

  let assetSources = resolveDeckAssetSources(
    deck,
    images,
    options.assetSources,
  );

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

  const composedPlan = composeDeck({
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

  assertValidCompositionPlan(composedPlan, deck);

  const awakening = materializeAwakenings({
    deck,
    plan: composedPlan,
    sourceFiles: assetSources,
    outputDir: join(outputDir, "awakenings"),
  });

  const plan = awakening.plan;
  assetSources = {
    ...assetSources,
    ...awakening.assetSources,
  };

  const projected = projectReceipt(
    plan,
    `${options.id}-receipt`,
    {newCardSpecs: awakening.newCards},
  );
  assertValidReceipt(projected, deck);

  writeJson(join(outputDir, "deck.json"), deck);
  writeJson(join(outputDir, "track.json"), track);
  writeJson(join(outputDir, "world-rule.json"), worldRule);
  writeJson(join(outputDir, "plan.json"), plan);
  writeJson(join(outputDir, "envelope.json"), analysis.envelope);
  writeJson(
    join(outputDir, "awakening.json"),
    awakening.artifacts,
  );
  const projectedReceiptPath = join(outputDir, "receipt.projected.json");
  writeJson(projectedReceiptPath, projected);

  const assetsRoot = join(outputDir, "assets");
  const bundleImages = join(assetsRoot, "images");
  const bundleAudio = join(assetsRoot, "audio");
  mkdirSync(bundleImages, {recursive: true});
  mkdirSync(bundleAudio, {recursive: true});
  cpSync(images, bundleImages, {recursive: true});
  cpSync(audio, join(bundleAudio, basename(audio)));
  writeJson(
    join(outputDir, "asset-map.bundle.json"),
    bundleAssets(outputDir, assetSources),
  );

  if (!render) {
    return {
      outputDir,
      projectedReceipt: projectedReceiptPath,
      assetSources,
    };
  }

  const staged = stageJob({
    id: options.id,
    assetSources,
    audio,
    audioSource,
  });

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

    const artifactEvidence = [];
    for (const artifact of awakening.artifacts) {
      artifactEvidence.push(
        {
          kind: "video" as const,
          uri: `bundle://${normalizePath(relative(outputDir, artifact.videoFile))}`,
          scope: "checkpoint" as const,
          renderer: artifact.provider,
          sha256: await sha256File(artifact.videoFile),
          notes: [
            `Bounded awakening for ${artifact.sourceCardId}.`,
          ],
        },
        {
          kind: "still" as const,
          uri: `bundle://${normalizePath(relative(outputDir, artifact.freezeFile))}`,
          scope: "checkpoint" as const,
          renderer: artifact.provider,
          sha256: await sha256File(artifact.freezeFile),
          notes: [
            `Frozen descendant ${artifact.newCard.id}.`,
          ],
        },
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
      ...artifactEvidence,
    ]);

    assertValidReceipt(rendered, deck);
    const renderedReceiptPath = join(outputDir, "receipt.rendered.json");
    writeJson(renderedReceiptPath, rendered);

    return {
      outputDir,
      video,
      projectedReceipt: projectedReceiptPath,
      renderedReceipt: renderedReceiptPath,
      assetSources,
    };
  } finally {
    if (!options.keepStage) {
      rmSync(staged.stageRoot, {recursive: true, force: true});
    }
  }
};
