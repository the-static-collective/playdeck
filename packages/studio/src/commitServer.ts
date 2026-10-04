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
import type {CompositionPlan} from "@playdeck/core";
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

const record = (value: unknown): Record<string, unknown> | undefined =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;

export const assertFrankenMediaBindings = (
  plan: CompositionPlan,
  assets: Record<string, StudioAssetPayload>,
): void => {
  const media = record(plan.metadata?.studioFrankenMedia);
  if (!media) return;

  const bindings = media.bindings;
  if (!Array.isArray(bindings)) {
    throw new Error("Franken media metadata requires a bindings array.");
  }

  const franken = record(plan.metadata?.studioFranken);
  const sourceCapsules = franken?.sourceCapsules;
  if (!Array.isArray(sourceCapsules)) {
    throw new Error(
      "Franken media binding requires source capsule provenance.",
    );
  }

  const expected = new Map<string, string>();
  for (const rawCapsule of sourceCapsules) {
    const capsule = record(rawCapsule);
    const summary = record(capsule?.summary);
    const id = capsule?.id;
    const role = capsule?.role;
    const authorityClass = capsule?.authorityClass;
    const digest = summary?.outputSha256;

    if (
      typeof id === "string" &&
      (role === "time-slice-material" ||
        role === "memory-feedback-material") &&
      authorityClass === "evidence" &&
      typeof digest === "string"
    ) {
      expected.set(id, digest);
    }
  }

  const boundByCapsule = new Map<string, string>();
  for (const rawBinding of bindings) {
    const binding = record(rawBinding);
    const capsuleId = binding?.capsuleId;
    const source = binding?.source;
    if (
      typeof capsuleId !== "string" ||
      typeof source !== "string"
    ) {
      throw new Error("Malformed Franken media binding.");
    }
    if (boundByCapsule.has(capsuleId)) {
      throw new Error(
        `Duplicate Franken media binding for "${capsuleId}".`,
      );
    }

    const expectedDigest = expected.get(capsuleId);
    if (!expectedDigest) {
      throw new Error(
        `Franken media binding "${capsuleId}" lacks admitted evidence provenance.`,
      );
    }

    const asset = assets[source];
    if (!asset) {
      throw new Error(
        `Franken media binding "${capsuleId}" is missing asset "${source}".`,
      );
    }
    const actualDigest = createHash("sha256")
      .update(Buffer.from(asset.base64, "base64"))
      .digest("hex");
    if (actualDigest !== expectedDigest) {
      throw new Error(
        `Franken media SHA-256 mismatch for "${capsuleId}".`,
      );
    }
    boundByCapsule.set(capsuleId, source);
  }

  for (const event of plan.events) {
    if (event.params?.externalMaterial !== true) continue;
    const capsuleId = event.params?.frankenCapsuleId;
    const source =
      typeof event.params?.videoSource === "string"
        ? event.params.videoSource
        : typeof event.params?.freezeSource === "string"
          ? event.params.freezeSource
          : undefined;
    if (
      typeof capsuleId !== "string" ||
      !source ||
      boundByCapsule.get(capsuleId) !== source
    ) {
      throw new Error(
        `External derived-media event "${event.id}" is not backed by its verified Franken binding.`,
      );
    }
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
  assertFrankenMediaBindings(payload.plan, payload.assets);
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
