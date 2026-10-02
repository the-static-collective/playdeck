import {
  readdirSync,
  readFileSync,
  statSync,
} from "node:fs";
import {join, relative} from "node:path";
import {fileURLToPath} from "node:url";
import type {StudioAssetPayload, StudioCommitPayload} from "./cockpitTypes";
import {parseBundleStrings} from "./bundle";
import {commitStudioPayload} from "./commitServer";
import {recomposeStudioPlan} from "./recompose";

const repoRoot = fileURLToPath(new URL("../../../", import.meta.url));
const bundleRoot = join(repoRoot, "out", "command-001");
const proofOutput = join(repoRoot, "out", "studio-cockpit-proof");
const proofScratch = join(repoRoot, ".playdeck-studio-proof");

if (!statSync(bundleRoot).isDirectory()) {
  throw new Error(
    "Studio proof requires out/command-001 from command:proof.",
  );
}

const walk = (root: string): string[] =>
  readdirSync(root, {withFileTypes: true}).flatMap((entry) => {
    const absolute = join(root, entry.name);
    return entry.isDirectory() ? walk(absolute) : [absolute];
  });

const entries: Record<string, string> = {};

for (const file of walk(bundleRoot)) {
  if (/\.(json|txt|md)$/i.test(file)) {
    entries[relative(bundleRoot, file).replaceAll("\\", "/")] =
      readFileSync(file, "utf8");
  }
}

const session = parseBundleStrings(entries, "command-001");

if (session.deck.cards.length !== 4) {
  throw new Error(
    `Studio expected 4 cards, got ${session.deck.cards.length}`,
  );
}

if (session.receipt?.phase !== "rendered") {
  throw new Error(
    "Studio must prefer the rendered receipt from a witnessed bundle.",
  );
}

const recomposed = recomposeStudioPlan({
  deck: session.deck,
  track: {
    ...session.track,
    gates: session.plan.gates,
  },
  worldRule: {
    ...session.worldRule,
    surface: "studio-cockpit-proof",
  },
  priorPlan: session.plan,
});

const assetMapRaw = JSON.parse(
  entries["asset-map.bundle.json"] ?? "{}",
) as Record<string, string>;

const assets: Record<string, StudioAssetPayload> = {};

for (const [logical, uri] of Object.entries(assetMapRaw)) {
  const rel = uri.replace(/^bundle:\/\//, "");
  const local = join(bundleRoot, rel);
  assets[logical] = {
    name: local.split(/[\\/]/).pop() ?? "asset.bin",
    base64: readFileSync(local).toString("base64"),
  };
}

const audioRel = session.assetBindings[session.track.source];
if (!audioRel) {
  throw new Error("Studio proof cannot resolve the bundled audio source.");
}
const audioFile = join(bundleRoot, audioRel);
assets[session.track.source] = {
  name: audioFile.split(/[\\/]/).pop() ?? "audio.bin",
  base64: readFileSync(audioFile).toString("base64"),
};

const payload: StudioCommitPayload = {
  deck: session.deck,
  track: {
    ...session.track,
    gates: session.plan.gates,
  },
  worldRule: {
    ...session.worldRule,
    surface: "studio-cockpit-proof",
  },
  plan: recomposed,
  envelope: session.envelope,
  assets,
  inherit: true,
};

const committed = await commitStudioPayload(payload, {
  outputRoot: proofOutput,
  scratchRoot: proofScratch,
});

if (committed.receipt.phase !== "rendered") {
  throw new Error("Studio cockpit proof did not seal a rendered receipt.");
}

if (!committed.inheritedDeck) {
  throw new Error("Studio cockpit proof did not derive an inherited next deck.");
}

if (
  committed.inheritedDeck.inheritedReceipt !==
  `receipt:${committed.receipt.id}`
) {
  throw new Error("Studio cockpit next deck did not cross from the new receipt.");
}

if (committed.inheritedDeck.cards.length <= session.deck.cards.length) {
  throw new Error(
    "Studio cockpit proof should materialize and inherit its bounded awakening.",
  );
}

console.log(
  JSON.stringify({
    bundle: session.bundleName,
    originalReceipt: session.receipt.id,
    committedReceipt: committed.receipt.id,
    receiptPhase: committed.receipt.phase,
    inputCards: session.deck.cards.length,
    nextDeckCards: committed.inheritedDeck.cards.length,
    outputDir: committed.outputDir,
    newAssets: Object.keys(committed.newAssets).length,
  }),
);
