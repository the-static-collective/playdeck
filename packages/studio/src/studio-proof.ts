import {
  readdirSync,
  readFileSync,
  statSync,
} from "node:fs";
import {join, relative} from "node:path";
import {fileURLToPath} from "node:url";
import type {
  StudioAssetPayload,
  StudioCommitPayload,
  StudioNextSongPayload,
} from "./cockpitTypes";
import {parseBundleStrings} from "./bundle";
import {commitStudioPayload} from "./commitServer";
import {prepareNextSong} from "./nextSongServer";
import {recomposeStudioPlan} from "./recompose";

const repoRoot = fileURLToPath(new URL("../../../", import.meta.url));
const bundleRoot = join(repoRoot, "out", "command-001");
const proofOutput = join(repoRoot, "out", "studio-cockpit-proof");
const proofScratch = join(repoRoot, ".playdeck-studio-proof");
const secondAudio = join(
  repoRoot,
  "out",
  "album-001-inputs",
  "02-answer.wav",
);

if (!statSync(bundleRoot).isDirectory()) {
  throw new Error(
    "Studio proof requires out/command-001 from command:proof.",
  );
}

if (!statSync(secondAudio).isFile()) {
  throw new Error(
    "Studio Next Song proof requires album:proof to run first.",
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

const baseAssets: Record<string, StudioAssetPayload> = {};

for (const [logical, uri] of Object.entries(assetMapRaw)) {
  const rel = uri.replace(/^bundle:\/\//, "");
  const local = join(bundleRoot, rel);
  baseAssets[logical] = {
    name: local.split(/[\\/]/).pop() ?? "asset.bin",
    base64: readFileSync(local).toString("base64"),
  };
}

const audioRel = session.assetBindings[session.track.source];
if (!audioRel) {
  throw new Error("Studio proof cannot resolve the bundled audio source.");
}
const audioFile = join(bundleRoot, audioRel);
baseAssets[session.track.source] = {
  name: audioFile.split(/[\\/]/).pop() ?? "audio.bin",
  base64: readFileSync(audioFile).toString("base64"),
};

const firstPayload: StudioCommitPayload = {
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
  assets: baseAssets,
  inherit: true,
};

const first = await commitStudioPayload(firstPayload, {
  outputRoot: proofOutput,
  scratchRoot: proofScratch,
});

if (!first.inheritedDeck || first.inheritedDeck.cards.length !== 5) {
  throw new Error(
    "Studio 002 crossing must yield the 5-card inherited deck.",
  );
}

const nextPayload: StudioNextSongPayload = {
  deck: first.inheritedDeck,
  worldRule: firstPayload.worldRule,
  priorPlan: recomposed,
  audio: {
    name: "02-answer.wav",
    mime: "audio/wav",
    base64: readFileSync(secondAudio).toString("base64"),
  },
};

const next = await prepareNextSong(nextPayload, {
  scratchRoot: join(proofScratch, "next"),
});

if (next.plan.deckId !== first.inheritedDeck.id) {
  throw new Error("Next Song was not composed against the inherited deck.");
}

const arrive = next.plan.events.find((event) => event.type === "arrive");
if (arrive?.params?.from !== "inherited-room") {
  throw new Error(
    `Next Song should enter from inherited-room, got ${String(arrive?.params?.from)}`,
  );
}

if (next.track.id === session.track.id) {
  throw new Error("Next Song must receive a distinct track identity.");
}

const secondAssets: Record<string, StudioAssetPayload> = {
  ...baseAssets,
  ...first.newAssets,
  [next.track.source]: next.audioAsset,
};

const second = await commitStudioPayload(
  {
    deck: first.inheritedDeck,
    track: next.track,
    worldRule: firstPayload.worldRule,
    plan: next.plan,
    envelope: next.envelope,
    assets: secondAssets,
    inherit: true,
  },
  {
    outputRoot: proofOutput,
    scratchRoot: proofScratch,
  },
);

if (!second.inheritedDeck) {
  throw new Error("Next Song render did not derive another inherited deck.");
}

if (second.inheritedDeck.cards.length !== 6) {
  throw new Error(
    `Expected 6 cards after second cockpit crossing, got ${second.inheritedDeck.cards.length}`,
  );
}

if (
  second.inheritedDeck.inheritedReceipt !==
  `receipt:${second.receipt.id}`
) {
  throw new Error("Second inherited deck does not cite the second receipt.");
}

console.log(
  JSON.stringify({
    bundle: session.bundleName,
    firstReceipt: first.receipt.id,
    firstDeckCards: first.inheritedDeck.cards.length,
    nextTrack: next.track.id,
    nextIntroFrom: arrive?.params?.from,
    secondReceipt: second.receipt.id,
    secondDeckCards: second.inheritedDeck.cards.length,
    firstNewAssets: Object.keys(first.newAssets).length,
    secondNewAssets: Object.keys(second.newAssets).length,
  }),
);
