import {createHash} from "node:crypto";
import {spawnSync} from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import {
  dirname,
  extname,
  join,
  relative,
  resolve,
  sep,
} from "node:path";
import {fileURLToPath} from "node:url";
import type {
  CompositionPlan,
  DeckSpec,
  PerformanceReceipt,
  TrackSpec,
  WorldRule,
} from "@playdeck/core";
import {materializeAwakenings} from "@playdeck/awakening";
import {assertValidCompositionPlan} from "@playdeck/composer";
import {
  assertValidReceipt,
  projectReceipt,
  sealReceipt,
} from "@playdeck/receipts";
import {sha256File} from "./hash";

export type RunPreparedPlaydeckOptions = {
  id: string;
  deck: DeckSpec;
  track: TrackSpec;
  worldRule: WorldRule;
  plan: CompositionPlan;
  envelope: Array<[number, number, number, number]>;
  assetSources: Record<string, string>;
  outputDir: string;
  render?: boolean;
  keepStage?: boolean;
};

export type RunPreparedPlaydeckResult = {
  outputDir: string;
  video?: string;
  projectedReceiptPath: string;
  renderedReceiptPath?: string;
  renderedReceipt?: PerformanceReceipt;
  assetSources: Record<string, string>;
};

const normalizePath = (value: string) => value.split(sep).join("/");

const repoRoot = fileURLToPath(new URL("../../../", import.meta.url));
const renderPackage = join(repoRoot, "packages", "render-remotion");
const renderPublic = join(renderPackage, "public", "playdeck-jobs");

const writeJson = (file: string, value: unknown) => {
  mkdirSync(dirname(file), {recursive: true});
  writeFileSync(file, JSON.stringify(value, null, 2) + "\n", "utf8");
};

const safeAssetName = (logical: string, local: string) => {
  const digest = createHash("sha1").update(logical).digest("hex").slice(0, 12);
  return `${digest}${extname(local).toLowerCase() || ".bin"}`;
};

const requiredLogicalAssets = (
  deck: DeckSpec,
  track: TrackSpec,
): string[] => [
  track.source,
  ...deck.cards.map((card) => card.front?.source ?? card.source),
];

const assertAssets = (
  deck: DeckSpec,
  track: TrackSpec,
  assetSources: Record<string, string>,
) => {
  for (const logical of requiredLogicalAssets(deck, track)) {
    const local = assetSources[logical];
    if (!local) {
      throw new Error(`Prepared render is missing local binding for "${logical}".`);
    }
    if (!existsSync(local)) {
      throw new Error(
        `Prepared render asset for "${logical}" does not exist: ${local}`,
      );
    }
  }
};

const stageAssets = (
  id: string,
  assetSources: Record<string, string>,
) => {
  const stageRoot = join(renderPublic, id);
  rmSync(stageRoot, {recursive: true, force: true});
  const stagedAssets = join(stageRoot, "assets");
  mkdirSync(stagedAssets, {recursive: true});

  const assets: Record<string, string> = {};

  for (const [logical, local] of Object.entries(assetSources).sort(([a], [b]) =>
    a.localeCompare(b),
  )) {
    if (!existsSync(local)) continue;
    const name = safeAssetName(logical, local);
    cpSync(local, join(stagedAssets, name));
    assets[logical] = normalizePath(
      join("playdeck-jobs", id, "assets", name),
    );
  }

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

export const runPreparedPlaydeck = async (
  options: RunPreparedPlaydeckOptions,
): Promise<RunPreparedPlaydeckResult> => {
  const outputDir = resolve(options.outputDir);
  const render = options.render ?? true;
  mkdirSync(outputDir, {recursive: true});

  if (options.plan.deckId !== options.deck.id) {
    throw new Error("Prepared plan deckId does not match the supplied deck.");
  }
  if (options.plan.trackId !== options.track.id) {
    throw new Error("Prepared plan trackId does not match the supplied track.");
  }
  if (options.plan.worldRuleId !== options.worldRule.id) {
    throw new Error(
      "Prepared plan worldRuleId does not match the supplied world rule.",
    );
  }

  assertValidCompositionPlan(options.plan, options.deck);
  assertAssets(options.deck, options.track, options.assetSources);

  const awakening = materializeAwakenings({
    deck: options.deck,
    plan: options.plan,
    sourceFiles: options.assetSources,
    outputDir: join(outputDir, "awakenings"),
  });

  const plan = awakening.plan;
  const assetSources = {
    ...options.assetSources,
    ...awakening.assetSources,
  };

  const projected = projectReceipt(
    plan,
    `${options.id}-receipt`,
    {newCardSpecs: awakening.newCards},
  );
  assertValidReceipt(projected, options.deck);

  writeJson(join(outputDir, "deck.json"), options.deck);
  writeJson(join(outputDir, "track.json"), options.track);
  writeJson(join(outputDir, "world-rule.json"), options.worldRule);
  writeJson(join(outputDir, "plan.json"), plan);
  writeJson(join(outputDir, "envelope.json"), options.envelope);
  writeJson(join(outputDir, "awakening.json"), awakening.artifacts);
  writeJson(
    join(outputDir, "asset-map.bundle.json"),
    bundleAssets(outputDir, assetSources),
  );

  const projectedReceiptPath = join(outputDir, "receipt.projected.json");
  writeJson(projectedReceiptPath, projected);

  if (!render) {
    return {
      outputDir,
      projectedReceiptPath,
      assetSources,
    };
  }

  const staged = stageAssets(options.id, assetSources);
  const renderProps = {
    deck: options.deck,
    track: options.track,
    worldRule: options.worldRule,
    plan,
    assets: staged.assets,
    envelope: options.envelope,
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
          uri: `bundle://${normalizePath(
            relative(outputDir, artifact.videoFile),
          )}`,
          scope: "checkpoint" as const,
          renderer: artifact.provider,
          sha256: await sha256File(artifact.videoFile),
          notes: [`Bounded awakening for ${artifact.sourceCardId}.`],
        },
        {
          kind: "still" as const,
          uri: `bundle://${normalizePath(
            relative(outputDir, artifact.freezeFile),
          )}`,
          scope: "checkpoint" as const,
          renderer: artifact.provider,
          sha256: await sha256File(artifact.freezeFile),
          notes: [`Frozen descendant ${artifact.newCard.id}.`],
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
          "Rendered from an explicit prepared PlayDeck state.",
          "Prepared state may originate from PlayDeck Studio.",
        ],
      },
      ...artifactEvidence,
    ]);

    assertValidReceipt(rendered, options.deck);
    const renderedReceiptPath = join(outputDir, "receipt.rendered.json");
    writeJson(renderedReceiptPath, rendered);

    return {
      outputDir,
      video,
      projectedReceiptPath,
      renderedReceiptPath,
      renderedReceipt: rendered,
      assetSources,
    };
  } finally {
    if (!options.keepStage) {
      rmSync(staged.stageRoot, {recursive: true, force: true});
    }
  }
};
