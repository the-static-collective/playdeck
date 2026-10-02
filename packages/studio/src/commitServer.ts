import {createHash} from "node:crypto";
import {
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import {basename, extname, join, resolve} from "node:path";
import {fileURLToPath} from "node:url";
import {runPreparedPlaydeck} from "@playdeck/cli";
import {applyReceiptToDeck} from "@playdeck/continuity";
import type {
  StudioAssetPayload,
  StudioCommitPayload,
  StudioCommitResult,
} from "./cockpitTypes";

const repoRoot = fileURLToPath(new URL("../../../", import.meta.url));

const safeName = (value: string) =>
  basename(value).replace(/[^a-zA-Z0-9._-]+/g, "-") || "asset.bin";

const mimeFor = (path: string): string => {
  switch (extname(path).toLowerCase()) {
    case ".png":
      return "image/png";
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".webp":
      return "image/webp";
    case ".svg":
      return "image/svg+xml";
    case ".mp4":
      return "video/mp4";
    case ".wav":
      return "audio/wav";
    case ".mp3":
      return "audio/mpeg";
    default:
      return "application/octet-stream";
  }
};

const payloadHash = (payload: StudioCommitPayload) =>
  createHash("sha256")
    .update(
      JSON.stringify({
        deck: payload.deck,
        track: payload.track,
        worldRule: payload.worldRule,
        plan: payload.plan,
        envelope: payload.envelope,
        assets: Object.entries(payload.assets)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([logical, asset]) => [
            logical,
            createHash("sha256")
              .update(asset.base64)
              .digest("hex"),
          ]),
        inherit: payload.inherit,
      }),
    )
    .digest("hex")
    .slice(0, 12);

const writeAssets = (
  root: string,
  assets: Record<string, StudioAssetPayload>,
): Record<string, string> => {
  mkdirSync(root, {recursive: true});
  const bindings: Record<string, string> = {};
  let index = 0;

  for (const [logical, asset] of Object.entries(assets).sort(([a], [b]) =>
    a.localeCompare(b),
  )) {
    const path = join(
      root,
      `${String(index).padStart(3, "0")}-${safeName(asset.name)}`,
    );
    writeFileSync(path, Buffer.from(asset.base64, "base64"));
    bindings[logical] = path;
    index += 1;
  }

  return bindings;
};

const readAssetPayload = (path: string): StudioAssetPayload => ({
  name: basename(path),
  mime: mimeFor(path),
  base64: readFileSync(path).toString("base64"),
});

export const commitStudioPayload = async (
  payload: StudioCommitPayload,
  options: {
    outputRoot?: string;
    scratchRoot?: string;
  } = {},
): Promise<StudioCommitResult> => {
  const hash = payloadHash(payload);
  const id = `${payload.deck.id}-studio-${hash}`;
  const outputRoot = resolve(
    options.outputRoot ?? join(repoRoot, "out", "studio"),
  );
  const scratchRoot = resolve(
    options.scratchRoot ?? join(repoRoot, ".playdeck-studio"),
  );
  const scratch = join(scratchRoot, id);
  const inputRoot = join(scratch, "inputs");
  const outputDir = join(outputRoot, id);

  rmSync(scratch, {recursive: true, force: true});
  rmSync(outputDir, {recursive: true, force: true});
  mkdirSync(inputRoot, {recursive: true});
  mkdirSync(outputDir, {recursive: true});

  try {
    const inputBindings = writeAssets(inputRoot, payload.assets);

    const rendered = await runPreparedPlaydeck({
      id,
      deck: payload.deck,
      track: payload.track,
      worldRule: payload.worldRule,
      plan: payload.plan,
      envelope: payload.envelope,
      assetSources: inputBindings,
      outputDir,
      render: true,
    });

    if (
      !rendered.video ||
      !rendered.renderedReceipt ||
      !rendered.renderedReceiptPath
    ) {
      throw new Error("Studio commit did not produce a sealed full render.");
    }

    let inheritedDeck;
    if (payload.inherit) {
      inheritedDeck = applyReceiptToDeck(
        payload.deck,
        rendered.renderedReceipt,
      );
      writeFileSync(
        join(outputDir, "deck.after.json"),
        JSON.stringify(inheritedDeck, null, 2) + "\n",
        "utf8",
      );
    }

    const newAssets: Record<string, StudioAssetPayload> = {};
    for (const [logical, local] of Object.entries(rendered.assetSources)) {
      if (inputBindings[logical] === local) continue;
      newAssets[logical] = readAssetPayload(local);
    }

    return {
      id,
      outputDir,
      video: rendered.video,
      receipt: rendered.renderedReceipt,
      inheritedDeck,
      newAssets,
    };
  } finally {
    rmSync(scratch, {recursive: true, force: true});
  }
};
