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
import {
  enqueueStudioSongs,
  moveStudioQueuedSong,
  takeNextStudioQueuedSong,
} from "./sessionQueue";

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
const thirdAudio = join(
  repoRoot,
  "out",
  "album-001-inputs",
  "03-room.wav",
);

if (!statSync(bundleRoot).isDirectory()) {
  throw new Error(
    "Studio proof requires out/command-001 from command:proof.",
  );
}

if (!statSync(secondAudio).isFile() || !statSync(thirdAudio).isFile()) {
  throw new Error(
    "Studio Album Session proof requires album:proof to run first.",
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

const queuedAudio = enqueueStudioSongs([], [
  {
    name: "03-room.wav",
    mime: "audio/wav",
    base64: readFileSync(thirdAudio).toString("base64"),
  },
  {
    name: "02-answer.wav",
    mime: "audio/wav",
    base64: readFileSync(secondAudio).toString("base64"),
  },
]);

const orderedQueue = moveStudioQueuedSong(
  queuedAudio,
  queuedAudio[1].id,
  -1,
);

if (
  orderedQueue.map((item) => item.name).join(",") !==
  "02-answer.wav,03-room.wav"
) {
  throw new Error("Studio Album Session queue reorder failed.");
}

const firstTake = takeNextStudioQueuedSong(orderedQueue);
if (!firstTake.next || firstTake.next.name !== "02-answer.wav") {
  throw new Error("Album Session did not expose the front queued song.");
}

const nextPayload: StudioNextSongPayload = {
  deck: first.inheritedDeck,
  worldRule: firstPayload.worldRule,
  priorPlan: recomposed,
  audio: firstTake.next.audio,
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

const secondTake = takeNextStudioQueuedSong(firstTake.remaining);
if (!secondTake.next || secondTake.next.name !== "03-room.wav") {
  throw new Error(
    "Album Session must keep later songs queued without pre-composing them.",
  );
}

const thirdPrepared = await prepareNextSong(
  {
    deck: second.inheritedDeck,
    worldRule: firstPayload.worldRule,
    priorPlan: next.plan,
    audio: secondTake.next.audio,
  },
  {
    scratchRoot: join(proofScratch, "third"),
  },
);

const thirdArrive = thirdPrepared.plan.events.find(
  (event) => event.type === "arrive",
);
if (thirdArrive?.params?.from !== "inherited-room") {
  throw new Error("Third queued song did not enter from inherited-room.");
}

if (thirdPrepared.plan.deckId !== second.inheritedDeck.id) {
  throw new Error(
    "Third queued song was not composed against the second inherited deck.",
  );
}

const thirdAssets: Record<string, StudioAssetPayload> = {
  ...baseAssets,
  ...first.newAssets,
  ...second.newAssets,
  [thirdPrepared.track.source]: thirdPrepared.audioAsset,
};

const third = await commitStudioPayload(
  {
    deck: second.inheritedDeck,
    track: thirdPrepared.track,
    worldRule: firstPayload.worldRule,
    plan: thirdPrepared.plan,
    envelope: thirdPrepared.envelope,
    assets: thirdAssets,
    inherit: true,
  },
  {
    outputRoot: proofOutput,
    scratchRoot: proofScratch,
  },
);

if (!third.inheritedDeck) {
  throw new Error(
    "Third Album Session crossing did not produce an inherited deck.",
  );
}

if (third.inheritedDeck.cards.length !== 7) {
  throw new Error(
    `Expected 7 cards after the queued three-song Studio session, got ${third.inheritedDeck.cards.length}`,
  );
}

if (secondTake.remaining.length !== 0) {
  throw new Error("Album Session queue should be empty after third song.");
}

const continuity = third.inheritedDeck.metadata?.continuity as
  | {history?: unknown[]}
  | undefined;
if ((continuity?.history?.length ?? 0) !== 3) {
  throw new Error(
    "Album Session final deck should carry all three witnessed Studio crossings.",
  );
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
    thirdTrack: thirdPrepared.track.id,
    thirdIntroFrom: thirdArrive?.params?.from,
    thirdReceipt: third.receipt.id,
    thirdDeckCards: third.inheritedDeck.cards.length,
    sessionContinuityDepth: continuity?.history?.length ?? 0,
    queueRemaining: secondTake.remaining.length,
    firstNewAssets: Object.keys(first.newAssets).length,
    secondNewAssets: Object.keys(second.newAssets).length,
    thirdNewAssets: Object.keys(third.newAssets).length,
  }),
);
