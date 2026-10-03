import {
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
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
  compareStudioBranchCheckpoints,
  composeStudioRelationBranch,
} from "./branchRelation";
import {
  createStudioPossibilityEcology,
  keepStudioPossibility,
  scrapeStudioPossibilityEcology,
} from "./possibilityEcology";
import {
  appendStudioPossibilityEcology,
  appendStudioTimelineCheckpoint,
  buildStudioTimelineGraph,
  createStudioSessionArchive,
  ensureStudioTimeline,
  forkStudioSessionArchive,
  mergeStudioSessionTimelines,
  parseStudioSessionArchive,
  restoreStudioSessionAtCheckpoint,
  serializeStudioSessionArchive,
} from "./sessionArchive";
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

const portableSession = createStudioSessionArchive({
  session: {
    ...session,
    deck: first.inheritedDeck,
    track: next.track,
    worldRule: firstPayload.worldRule,
    plan: next.plan,
    envelope: next.envelope,
    receipt: second.receipt,
  },
  assets: {
    ...secondAssets,
    ...second.newAssets,
  },
  queue: [secondTake.next],
  receipts: [
    ...(session.receipt ? [session.receipt] : []),
    first.receipt,
    second.receipt,
  ],
  checkpoint: {
    id: second.id,
    receipt: second.receipt,
    inheritedDeck: second.inheritedDeck,
  },
  inheritAfterRender: true,
  dirty: false,
});

const sessionPath = join(
  proofOutput,
  "studio-005-session.playdeck-session.json",
);
writeFileSync(
  sessionPath,
  serializeStudioSessionArchive(portableSession),
  "utf8",
);

const resumed = parseStudioSessionArchive(
  readFileSync(sessionPath, "utf8"),
);

if (resumed.session.receipt?.id !== second.receipt.id) {
  throw new Error(
    "Resumed session did not preserve the current witnessed receipt.",
  );
}

if (resumed.receipts.length !== 3) {
  throw new Error(
    `Expected three preserved receipts at resume checkpoint, got ${resumed.receipts.length}`,
  );
}

if (
  resumed.checkpoint?.inheritedDeck?.cards.length !== 6 ||
  resumed.checkpoint.receipt.id !== second.receipt.id
) {
  throw new Error(
    "Resumed session did not preserve the six-card continuity checkpoint.",
  );
}

if (
  resumed.queue.length !== 1 ||
  resumed.queue[0].name !== "03-room.wav"
) {
  throw new Error(
    "Resumed session did not preserve the still-unborn future queue.",
  );
}

if (
  resumed.queue.some(
    (queued) =>
      "plan" in
      (queued as unknown as Record<string, unknown>),
  )
) {
  throw new Error(
    "A saved future queue must not contain pre-composed plans.",
  );
}

const branchAmber = forkStudioSessionArchive(
  resumed,
  "amber-world",
);
const branchBlue = forkStudioSessionArchive(
  resumed,
  "blue-world",
);

if (
  branchAmber.branch?.forkedFromReceipt !== second.receipt.id ||
  branchBlue.branch?.forkedFromReceipt !== second.receipt.id
) {
  throw new Error(
    "Sibling branches must cite the same witnessed fork receipt.",
  );
}

if (branchAmber.branch?.id === branchBlue.branch?.id) {
  throw new Error("Sibling branch identities must be distinct.");
}

if (
  JSON.stringify(branchAmber.receipts) !==
  JSON.stringify(branchBlue.receipts)
) {
  throw new Error(
    "Sibling branches must preserve identical receipt ancestry at fork time.",
  );
}

const amberDeck = branchAmber.checkpoint?.inheritedDeck;
const blueDeck = branchBlue.checkpoint?.inheritedDeck;
if (!amberDeck || !blueDeck) {
  throw new Error("Sibling branches are missing forked checkpoint decks.");
}

const restoredThird = resumed.queue[0];
const restoredDeck = resumed.checkpoint.inheritedDeck;

const thirdPrepared = await prepareNextSong(
  {
    deck: restoredDeck,
    worldRule: resumed.session.worldRule,
    priorPlan: resumed.session.plan,
    audio: restoredThird.audio,
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
  ...resumed.assets,
  [thirdPrepared.track.source]: thirdPrepared.audioAsset,
};

const third = await commitStudioPayload(
  {
    deck: restoredDeck,
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

if (resumed.queue.slice(1).length !== 0) {
  throw new Error("Resumed Album Session queue should empty after third song.");
}

const continuity = third.inheritedDeck.metadata?.continuity as
  | {history?: unknown[]}
  | undefined;
if ((continuity?.history?.length ?? 0) !== 3) {
  throw new Error(
    "Album Session final deck should carry all three witnessed Studio crossings.",
  );
}


const prepareBranchFuture = async (
  archive: typeof branchAmber,
  surface: string,
) => {
  const deck = archive.checkpoint?.inheritedDeck;
  const queued = archive.queue[0];
  if (!deck || !queued) {
    throw new Error("Branch future is missing deck or queued audio.");
  }

  const prepared = await prepareNextSong(
    {
      deck,
      worldRule: {
        ...archive.session.worldRule,
        surface,
      },
      priorPlan: archive.session.plan,
      audio: queued.audio,
    },
    {
      scratchRoot: join(
        proofScratch,
        `branch-${archive.branch?.id ?? surface}`,
      ),
    },
  );

  const committed = await commitStudioPayload(
    {
      deck,
      track: prepared.track,
      worldRule: {
        ...archive.session.worldRule,
        surface,
      },
      plan: prepared.plan,
      envelope: prepared.envelope,
      assets: {
        ...archive.assets,
        [prepared.track.source]: prepared.audioAsset,
      },
      inherit: true,
    },
    {
      outputRoot: proofOutput,
      scratchRoot: proofScratch,
    },
  );

  const inheritedDeck = committed.inheritedDeck;
  if (!inheritedDeck) {
    throw new Error("Branched future failed to inherit.");
  }

  return {prepared, committed, inheritedDeck};
};

const amberFuture = await prepareBranchFuture(
  branchAmber,
  "amber-branch-surface",
);
const blueFuture = await prepareBranchFuture(
  branchBlue,
  "blue-branch-surface",
);

if (amberFuture.committed.receipt.id === blueFuture.committed.receipt.id) {
  throw new Error(
    "Divergent sibling futures must seal distinct receipts.",
  );
}

for (const [archive, future] of [
  [branchAmber, amberFuture],
  [branchBlue, blueFuture],
] as const) {
  const marker =
    future.inheritedDeck.metadata?.studioBranch;
  if (
    !marker ||
    typeof marker !== "object" ||
    Array.isArray(marker) ||
    (marker as Record<string, unknown>).id !== archive.branch?.id
  ) {
    throw new Error(
      "Branch identity did not survive its future continuity crossing.",
    );
  }

  const continuity =
    future.inheritedDeck.metadata?.continuity as
      | {history?: unknown[]}
      | undefined;
  if ((continuity?.history?.length ?? 0) !== 3) {
    throw new Error(
      "Each sibling future should extend the shared two-crossing past by exactly one.",
    );
  }
}

const archiveAfterBranchFuture = (
  archive: typeof branchAmber,
  future: typeof amberFuture,
  surface: string,
) => {
  const inputDeck = archive.checkpoint?.inheritedDeck;
  if (!inputDeck || !future.committed.inheritedDeck) {
    throw new Error("Cannot snapshot branch future without both decks.");
  }

  const futureWorld = {
    ...archive.session.worldRule,
    surface,
  };
  const futureSession = {
    ...archive.session,
    deck: inputDeck,
    track: future.prepared.track,
    worldRule: futureWorld,
    plan: future.prepared.plan,
    envelope: future.prepared.envelope,
    receipt: future.committed.receipt,
  };
  const futureReceipts = [
    ...archive.receipts.filter(
      (receipt) =>
        receipt.id !== future.committed.receipt.id,
    ),
    future.committed.receipt,
  ];
  const futureAssets = {
    ...archive.assets,
    [future.prepared.track.source]:
      future.prepared.audioAsset,
    ...future.committed.newAssets,
  };
  const futureQueue = archive.queue.slice(1);

  const timeline = appendStudioTimelineCheckpoint(
    ensureStudioTimeline(archive),
    {
      id: future.committed.id,
      receipt: future.committed.receipt,
      inheritedDeck: future.committed.inheritedDeck,
      parentReceiptId:
        archive.checkpoint?.receipt.id,
      branchId: archive.branch?.id,
      state: {
        session: futureSession,
        assets: futureAssets,
        queue: futureQueue,
        receipts: futureReceipts,
        preferences: archive.preferences,
        dirty: false,
      },
    },
  );

  return createStudioSessionArchive({
    session: futureSession,
    assets: futureAssets,
    queue: futureQueue,
    receipts: futureReceipts,
    checkpoint: {
      id: future.committed.id,
      receipt: future.committed.receipt,
      inheritedDeck: future.committed.inheritedDeck,
    },
    branch: archive.branch,
    timeline,
    inheritAfterRender:
      archive.preferences.inheritAfterRender,
    dirty: false,
  });
};

const amberArchive = archiveAfterBranchFuture(
  branchAmber,
  amberFuture,
  "amber-branch-surface",
);
const blueArchive = archiveAfterBranchFuture(
  branchBlue,
  blueFuture,
  "blue-branch-surface",
);

const mergedTimeline = mergeStudioSessionTimelines(
  amberArchive,
  [blueArchive],
);
const timelineGraph = buildStudioTimelineGraph(
  mergedTimeline,
);

const requiredTimelineNodes = [
  `receipt:${second.receipt.id}`,
  `branch:${branchAmber.branch?.id}`,
  `branch:${branchBlue.branch?.id}`,
  `receipt:${amberFuture.committed.receipt.id}`,
  `receipt:${blueFuture.committed.receipt.id}`,
];

for (const nodeId of requiredTimelineNodes) {
  if (!timelineGraph.nodes.some((node) => node.id === nodeId)) {
    throw new Error(
      `Timeline graph is missing required node "${nodeId}".`,
    );
  }
}

for (const branchArchive of [amberArchive, blueArchive]) {
  const branchId = branchArchive.branch?.id;
  if (!branchId) {
    throw new Error("Merged timeline branch lacks identity.");
  }

  const forkEdge = timelineGraph.edges.find(
    (edge) =>
      edge.kind === "fork" &&
      edge.from === `receipt:${second.receipt.id}` &&
      edge.to === `branch:${branchId}`,
  );
  if (!forkEdge) {
    throw new Error(
      `Timeline graph is missing fork edge for "${branchId}".`,
    );
  }
}

for (const [archive, future] of [
  [amberArchive, amberFuture],
  [blueArchive, blueFuture],
] as const) {
  const branchId = archive.branch?.id;
  const futureEdge = timelineGraph.edges.find(
    (edge) =>
      edge.from === `branch:${branchId}` &&
      edge.to ===
        `receipt:${future.committed.receipt.id}`,
  );
  if (!futureEdge) {
    throw new Error(
      `Timeline graph is missing branch future edge for "${branchId}".`,
    );
  }
}

const jumpedAmber = restoreStudioSessionAtCheckpoint(
  amberArchive,
  amberFuture.committed.id,
);
if (
  jumpedAmber.checkpoint?.receipt.id !==
    amberFuture.committed.receipt.id ||
  jumpedAmber.branch?.id !== branchAmber.branch?.id
) {
  throw new Error(
    "Timeline jump failed to restore the selected Amber checkpoint.",
  );
}

const violetSibling = forkStudioSessionArchive(
  amberArchive,
  "violet-world",
  second.id,
);
if (
  violetSibling.branch?.forkedFromReceipt !==
    second.receipt.id ||
  violetSibling.branch?.parentId
) {
  throw new Error(
    "Forking from the older shared graph node must create a sibling, not a child of Amber.",
  );
}

const comparisonSource = {
  ...amberArchive,
  timeline: mergedTimeline,
};

const branchRelation = compareStudioBranchCheckpoints(
  mergedTimeline,
  amberFuture.committed.id,
  blueFuture.committed.id,
);

if (
  branchRelation.common.receiptId !== second.receipt.id ||
  branchRelation.common.checkpointId !== second.id
) {
  throw new Error(
    "Cross-branch comparison did not resolve the latest shared witnessed checkpoint.",
  );
}

if (
  !branchRelation.world.diverged.some(
    (difference) => difference.field === "surface",
  )
) {
  throw new Error(
    "Cross-branch relation did not preserve the divergent world surfaces.",
  );
}

const relationPath = join(
  proofOutput,
  "studio-008-branch-relation.json",
);
writeFileSync(
  relationPath,
  JSON.stringify(branchRelation, null, 2) + "\n",
  "utf8",
);

const relationBranch = composeStudioRelationBranch(
  comparisonSource,
  branchRelation,
  "relation-world",
);

if (
  relationBranch.branch?.forkedFromReceipt !== second.receipt.id ||
  relationBranch.branch?.parentId
) {
  throw new Error(
    "Relation future must fork as a sibling from the shared checkpoint.",
  );
}

if (
  relationBranch.receipts.some(
    (receipt) =>
      receipt.id === amberFuture.committed.receipt.id ||
      receipt.id === blueFuture.committed.receipt.id,
  )
) {
  throw new Error(
    "Relation future must observe sibling receipts without inheriting them as ancestry.",
  );
}

const relationDeck = relationBranch.checkpoint?.inheritedDeck;
const relationQueued = relationBranch.queue[0];
if (!relationDeck || !relationQueued) {
  throw new Error(
    "Relation future is missing its common deck or unborn queued song.",
  );
}

const relationMetadata =
  relationDeck.metadata?.studioBranchRelation as
    | {id?: string}
    | undefined;
if (relationMetadata?.id !== branchRelation.id) {
  throw new Error(
    "Relation artifact was not carried onto the composed future deck.",
  );
}

const relationPrepared = await prepareNextSong(
  {
    deck: relationDeck,
    worldRule: relationBranch.session.worldRule,
    priorPlan: relationBranch.session.plan,
    audio: relationQueued.audio,
  },
  {
    scratchRoot: join(proofScratch, "branch-relation"),
  },
);

const relationArrive = relationPrepared.plan.events.find(
  (event) => event.type === "arrive",
);
if (
  relationArrive?.params?.from !== "cross-branch-relation"
) {
  throw new Error(
    "Relation-born composition did not enter from cross-branch-relation.",
  );
}

const relationFuture = await commitStudioPayload(
  {
    deck: relationDeck,
    track: relationPrepared.track,
    worldRule: relationBranch.session.worldRule,
    plan: relationPrepared.plan,
    envelope: relationPrepared.envelope,
    assets: {
      ...relationBranch.assets,
      [relationPrepared.track.source]:
        relationPrepared.audioAsset,
    },
    inherit: true,
  },
  {
    outputRoot: proofOutput,
    scratchRoot: proofScratch,
  },
);

if (!relationFuture.inheritedDeck) {
  throw new Error(
    "Relation-born future did not produce an inherited deck.",
  );
}

if (
  relationFuture.receipt.id === amberFuture.committed.receipt.id ||
  relationFuture.receipt.id === blueFuture.committed.receipt.id
) {
  throw new Error(
    "Relation-born future must seal as a distinct witnessed performance.",
  );
}

const relationBranchMarker =
  relationFuture.inheritedDeck.metadata?.studioBranch as
    | {id?: string}
    | undefined;
const relationCarry =
  relationFuture.inheritedDeck.metadata?.studioBranchRelation as
    | {id?: string}
    | undefined;
if (
  relationBranchMarker?.id !== relationBranch.branch?.id ||
  relationCarry?.id !== branchRelation.id
) {
  throw new Error(
    "Relation and branch provenance must survive the witnessed relation crossing.",
  );
}

const relationContinuity =
  relationFuture.inheritedDeck.metadata?.continuity as
    | {history?: unknown[]}
    | undefined;
if ((relationContinuity?.history?.length ?? 0) !== 3) {
  throw new Error(
    "Relation future must extend the common two-crossing past by exactly one.",
  );
}

const relationFutureSession = {
  ...relationBranch.session,
  deck: relationDeck,
  track: relationPrepared.track,
  worldRule: relationBranch.session.worldRule,
  plan: relationPrepared.plan,
  envelope: relationPrepared.envelope,
  receipt: relationFuture.receipt,
};
const relationFutureReceipts = [
  ...relationBranch.receipts.filter(
    (receipt) => receipt.id !== relationFuture.receipt.id,
  ),
  relationFuture.receipt,
];
const relationFutureAssets: Record<string, StudioAssetPayload> = {
  ...relationBranch.assets,
  [relationPrepared.track.source]: relationPrepared.audioAsset,
  ...relationFuture.newAssets,
};
const relationFutureTimeline = appendStudioTimelineCheckpoint(
  ensureStudioTimeline(relationBranch),
  {
    id: relationFuture.id,
    receipt: relationFuture.receipt,
    inheritedDeck: relationFuture.inheritedDeck,
    parentReceiptId: relationBranch.checkpoint?.receipt.id,
    branchId: relationBranch.branch?.id,
    state: {
      session: relationFutureSession,
      assets: relationFutureAssets,
      queue: relationBranch.queue.slice(1),
      receipts: relationFutureReceipts,
      preferences: relationBranch.preferences,
      dirty: false,
    },
  },
);

const relationFutureArchive = createStudioSessionArchive({
  session: relationFutureSession,
  assets: relationFutureAssets,
  queue: relationBranch.queue.slice(1),
  receipts: relationFutureReceipts,
  checkpoint: {
    id: relationFuture.id,
    receipt: relationFuture.receipt,
    inheritedDeck: relationFuture.inheritedDeck,
  },
  branch: relationBranch.branch,
  timeline: relationFutureTimeline,
  inheritAfterRender:
    relationBranch.preferences.inheritAfterRender,
  dirty: false,
});

const causalGraph = buildStudioTimelineGraph(
  ensureStudioTimeline(relationFutureArchive),
);

const relationNodeId = `relation:${branchRelation.id}`;
const relationBranchNodeId =
  `branch:${relationBranch.branch?.id}`;
const commonReceiptNodeId =
  `receipt:${second.receipt.id}`;
const amberReceiptNodeId =
  `receipt:${amberFuture.committed.receipt.id}`;
const blueReceiptNodeId =
  `receipt:${blueFuture.committed.receipt.id}`;
const relationReceiptNodeId =
  `receipt:${relationFuture.receipt.id}`;

const requiredCausalEdges = [
  {
    kind: "fork",
    from: commonReceiptNodeId,
    to: relationBranchNodeId,
  },
  {
    kind: "observes",
    from: amberReceiptNodeId,
    to: relationNodeId,
  },
  {
    kind: "observes",
    from: blueReceiptNodeId,
    to: relationNodeId,
  },
  {
    kind: "composes",
    from: relationNodeId,
    to: relationBranchNodeId,
  },
  {
    kind: "continuity",
    from: relationBranchNodeId,
    to: relationReceiptNodeId,
  },
] as const;

for (const expected of requiredCausalEdges) {
  if (
    !causalGraph.edges.some(
      (edge) =>
        edge.kind === expected.kind &&
        edge.from === expected.from &&
        edge.to === expected.to,
    )
  ) {
    throw new Error(
      `Creative causal graph is missing ${expected.kind} edge ${expected.from} -> ${expected.to}.`,
    );
  }
}

if (
  causalGraph.edges.some(
    (edge) =>
      (edge.kind === "fork" || edge.kind === "continuity") &&
      (edge.from === amberReceiptNodeId ||
        edge.from === blueReceiptNodeId) &&
      (edge.to === relationBranchNodeId ||
        edge.to === relationReceiptNodeId)
  )
) {
  throw new Error(
    "Observed sibling futures leaked into relation-world ancestry edges.",
  );
}

const causalRelation = (
  relationFutureArchive.timeline?.relations ?? []
).find((relation) => relation.id === branchRelation.id);
if (
  !causalRelation ||
  causalRelation.resultBranchId !== relationBranch.branch?.id
) {
  throw new Error(
    "Relation artifact was not promoted into first-class causal graph provenance.",
  );
}

const ecologyOne = createStudioPossibilityEcology(
  ensureStudioTimeline(relationBranch),
  branchRelation.id,
);
if (
  ecologyOne.proposals.length !== 6 ||
  ecologyOne.capsule.authorityClass !== "influence-only" ||
  ecologyOne.proposals.some(
    (proposal) => proposal.authorityClass !== "proposal",
  )
) {
  throw new Error(
    "Haunted Possibility Ecology did not produce one influence-only capsule and six proposal-only futures.",
  );
}

const ecologyOneOpen = createStudioSessionArchive({
  session: relationBranch.session,
  assets: relationBranch.assets,
  queue: relationBranch.queue,
  receipts: relationBranch.receipts,
  checkpoint: relationBranch.checkpoint,
  branch: relationBranch.branch,
  timeline: appendStudioPossibilityEcology(
    ensureStudioTimeline(relationBranch),
    ecologyOne,
  ),
  inheritAfterRender:
    relationBranch.preferences.inheritAfterRender,
  dirty: relationBranch.dirty,
});

const branchesBeforeScrape =
  ensureStudioTimeline(ecologyOneOpen).branches.length;
const receiptsBeforeScrape = ecologyOneOpen.receipts.length;
const scraped = scrapeStudioPossibilityEcology(
  ecologyOneOpen,
  ecologyOne.id,
);
const scrapedEcology = (
  ensureStudioTimeline(scraped).ecologies ?? []
).find((ecology) => ecology.id === ecologyOne.id);

if (
  scrapedEcology?.disposition?.kind !== "SCRAPE" ||
  ensureStudioTimeline(scraped).branches.length !==
    branchesBeforeScrape ||
  scraped.receipts.length !== receiptsBeforeScrape
) {
  throw new Error(
    "SCRAPE must close a proposal family without creating ancestry or a receipt.",
  );
}

const ecologyTwo = createStudioPossibilityEcology(
  ensureStudioTimeline(scraped),
  branchRelation.id,
);
if (
  ecologyTwo.generation !== ecologyOne.generation + 1 ||
  ecologyTwo.id === ecologyOne.id
) {
  throw new Error(
    "SCRAPE should permit a distinct deterministic next generation.",
  );
}

const ecologyTwoOpen = createStudioSessionArchive({
  session: scraped.session,
  assets: scraped.assets,
  queue: scraped.queue,
  receipts: scraped.receipts,
  checkpoint: scraped.checkpoint,
  branch: scraped.branch,
  timeline: appendStudioPossibilityEcology(
    ensureStudioTimeline(scraped),
    ecologyTwo,
  ),
  inheritAfterRender:
    scraped.preferences.inheritAfterRender,
  dirty: scraped.dirty,
});

const keptProposal = ecologyTwo.proposals[2];
const kept = keepStudioPossibility(
  ecologyTwoOpen,
  ecologyTwo.id,
  keptProposal.id,
);
const keptTimeline = ensureStudioTimeline(kept);
const keptEcology = (keptTimeline.ecologies ?? []).find(
  (ecology) => ecology.id === ecologyTwo.id,
);

if (
  keptEcology?.disposition?.kind !== "KEEP" ||
  keptEcology.disposition.proposalId !== keptProposal.id ||
  kept.branch?.id !== keptEcology.disposition.resultBranchId
) {
  throw new Error(
    "KEEP must promote exactly the selected proposal into one branch.",
  );
}

if (
  kept.receipts.some(
    (receipt) =>
      receipt.id === amberFuture.committed.receipt.id ||
      receipt.id === blueFuture.committed.receipt.id ||
      receipt.id === relationFuture.receipt.id,
  )
) {
  throw new Error(
    "Kept possibility must fork from shared history without inheriting alternate future receipts.",
  );
}

const keptDeck = kept.checkpoint?.inheritedDeck;
const keptQueued = kept.queue[0];
if (!keptDeck || !keptQueued) {
  throw new Error(
    "Kept possibility branch is missing its inherited deck or next song.",
  );
}

const keepMarker =
  keptDeck.metadata?.studioPossibilityKeep as
    | {
        proposalId?: string;
        authorityClass?: string;
      }
    | undefined;
const hauntMarker =
  keptDeck.metadata?.studioHauntCapsule as
    | {
        id?: string;
        authorityClass?: string;
      }
    | undefined;

if (
  keepMarker?.proposalId !== keptProposal.id ||
  keepMarker?.authorityClass !== "continuation-permission" ||
  hauntMarker?.id !== ecologyTwo.capsule.id ||
  hauntMarker?.authorityClass !== "influence-only"
) {
  throw new Error(
    "KEEP branch did not preserve proposal permission and influence-only capsule provenance.",
  );
}

const keptPrepared = await prepareNextSong(
  {
    deck: keptDeck,
    worldRule: kept.session.worldRule,
    priorPlan: kept.session.plan,
    audio: keptQueued.audio,
  },
  {
    scratchRoot: join(proofScratch, "kept-possibility"),
  },
);
const keptArrive = keptPrepared.plan.events.find(
  (event) => event.type === "arrive",
);
if (keptArrive?.params?.from !== "kept-possibility") {
  throw new Error(
    "KEEP-authorized future did not enter composition from kept-possibility.",
  );
}

const keptFuture = await commitStudioPayload(
  {
    deck: keptDeck,
    track: keptPrepared.track,
    worldRule: kept.session.worldRule,
    plan: keptPrepared.plan,
    envelope: keptPrepared.envelope,
    assets: {
      ...kept.assets,
      [keptPrepared.track.source]:
        keptPrepared.audioAsset,
    },
    inherit: true,
  },
  {
    outputRoot: proofOutput,
    scratchRoot: proofScratch,
  },
);

if (!keptFuture.inheritedDeck) {
  throw new Error(
    "KEEP-authorized proposal did not produce a witnessed inherited deck.",
  );
}

const keptContinuity =
  keptFuture.inheritedDeck.metadata?.continuity as
    | {history?: unknown[]}
    | undefined;
if ((keptContinuity?.history?.length ?? 0) !== 3) {
  throw new Error(
    "Kept proposal future must extend the common two-crossing past by exactly one.",
  );
}

const keptFutureSession = {
  ...kept.session,
  deck: keptDeck,
  track: keptPrepared.track,
  worldRule: kept.session.worldRule,
  plan: keptPrepared.plan,
  envelope: keptPrepared.envelope,
  receipt: keptFuture.receipt,
};
const keptFutureReceipts = [
  ...kept.receipts.filter(
    (receipt) => receipt.id !== keptFuture.receipt.id,
  ),
  keptFuture.receipt,
];
const keptFutureAssets: Record<string, StudioAssetPayload> = {
  ...kept.assets,
  [keptPrepared.track.source]: keptPrepared.audioAsset,
  ...keptFuture.newAssets,
};
const keptTimelineWithReceipt =
  appendStudioTimelineCheckpoint(
    ensureStudioTimeline(kept),
    {
      id: keptFuture.id,
      receipt: keptFuture.receipt,
      inheritedDeck: keptFuture.inheritedDeck,
      parentReceiptId: kept.checkpoint?.receipt.id,
      branchId: kept.branch?.id,
      state: {
        session: keptFutureSession,
        assets: keptFutureAssets,
        queue: kept.queue.slice(1),
        receipts: keptFutureReceipts,
        preferences: kept.preferences,
        dirty: false,
      },
    },
  );

const keptArchive = createStudioSessionArchive({
  session: keptFutureSession,
  assets: keptFutureAssets,
  queue: kept.queue.slice(1),
  receipts: keptFutureReceipts,
  checkpoint: {
    id: keptFuture.id,
    receipt: keptFuture.receipt,
    inheritedDeck: keptFuture.inheritedDeck,
  },
  branch: kept.branch,
  timeline: keptTimelineWithReceipt,
  inheritAfterRender:
    kept.preferences.inheritAfterRender,
  dirty: false,
});

const ecologyGraph = buildStudioTimelineGraph(
  ensureStudioTimeline(keptArchive),
);
const keptBranchNode =
  `branch:${kept.branch?.id}`;
const keptProposalNode =
  `proposal:${keptProposal.id}`;
const capsuleNode =
  `capsule:${ecologyTwo.capsule.id}`;
const keptReceiptNode =
  `receipt:${keptFuture.receipt.id}`;

const requiredEcologyEdges = [
  {
    kind: "haunts",
    from: relationNodeId,
    to: capsuleNode,
  },
  ...ecologyTwo.proposals.map((proposal) => ({
    kind: "proposes" as const,
    from: capsuleNode,
    to: `proposal:${proposal.id}`,
  })),
  {
    kind: "keeps",
    from: keptProposalNode,
    to: keptBranchNode,
  },
  {
    kind: "fork",
    from: commonReceiptNodeId,
    to: keptBranchNode,
  },
  {
    kind: "continuity",
    from: keptBranchNode,
    to: keptReceiptNode,
  },
] as const;

for (const expected of requiredEcologyEdges) {
  if (
    !ecologyGraph.edges.some(
      (edge) =>
        edge.kind === expected.kind &&
        edge.from === expected.from &&
        edge.to === expected.to,
    )
  ) {
    throw new Error(
      `Possibility ecology graph is missing ${expected.kind} edge ${expected.from} -> ${expected.to}.`,
    );
  }
}

const unkeptProposalIds = ecologyTwo.proposals
  .filter((proposal) => proposal.id !== keptProposal.id)
  .map((proposal) => proposal.id);

if (
  ecologyGraph.edges.some(
    (edge) =>
      edge.kind === "keeps" &&
      unkeptProposalIds.some(
        (proposalId) =>
          edge.from === `proposal:${proposalId}`,
      ),
  )
) {
  throw new Error(
    "An unkept proposal acquired continuation permission.",
  );
}

for (const proposal of ecologyTwo.proposals) {
  const node = ecologyGraph.nodes.find(
    (candidate) =>
      candidate.id === `proposal:${proposal.id}`,
  );
  if (
    !node ||
    node.authorityClass !== "proposal" ||
    node.receiptId ||
    node.checkpointId
  ) {
    throw new Error(
      "Proposal nodes must remain proposal-only and non-witnessed.",
    );
  }
}

const capsuleGraphNode = ecologyGraph.nodes.find(
  (node) => node.id === capsuleNode,
);
const keptBranchGraphNode = ecologyGraph.nodes.find(
  (node) => node.id === keptBranchNode,
);
const keptReceiptGraphNode = ecologyGraph.nodes.find(
  (node) => node.id === keptReceiptNode,
);
if (
  capsuleGraphNode?.authorityClass !== "influence-only" ||
  keptBranchGraphNode?.authorityClass !==
    "continuation-permission" ||
  keptReceiptGraphNode?.authorityClass !==
    "resolved-execution"
) {
  throw new Error(
    "Authority classes collapsed across capsule, KEEP, and witnessed execution.",
  );
}

const ecologyPath = join(
  proofOutput,
  "studio-010-haunted-possibility-ecology.json",
);
writeFileSync(
  ecologyPath,
  JSON.stringify(
    {
      scraped: ecologyOne,
      kept: keptEcology,
      graph: ecologyGraph,
    },
    null,
    2,
  ) + "\n",
  "utf8",
);

const keptSessionPath = join(
  proofOutput,
  "studio-010-kept-possibility.playdeck-session.json",
);
writeFileSync(
  keptSessionPath,
  serializeStudioSessionArchive(keptArchive),
  "utf8",
);

const causalGraphPath = join(
  proofOutput,
  "studio-009-creative-causal-graph.json",
);
writeFileSync(
  causalGraphPath,
  JSON.stringify(causalGraph, null, 2) + "\n",
  "utf8",
);

const relationSessionPath = join(
  proofOutput,
  "studio-008-relation-world.playdeck-session.json",
);
writeFileSync(
  relationSessionPath,
  serializeStudioSessionArchive(relationBranch),
  "utf8",
);


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
    queueRemaining: resumed.queue.slice(1).length,
    resumedReceiptCount: resumed.receipts.length,
    resumedQueue: resumed.queue.map((item) => item.name),
    resumedCheckpointCards:
      resumed.checkpoint?.inheritedDeck?.cards.length ?? 0,
    sessionFile: sessionPath,
    branchForkReceipt: second.receipt.id,
    amberBranch: branchAmber.branch?.id,
    blueBranch: branchBlue.branch?.id,
    amberReceipt: amberFuture.committed.receipt.id,
    blueReceipt: blueFuture.committed.receipt.id,
    siblingSharedReceiptCount: branchAmber.receipts.length,
    timelineNodes: timelineGraph.nodes.length,
    timelineEdges: timelineGraph.edges.length,
    timelineCheckpointCount:
      mergedTimeline.checkpoints.length,
    jumpedAmberReceipt:
      jumpedAmber.checkpoint?.receipt.id,
    violetSibling:
      violetSibling.branch?.id,
    relationId: branchRelation.id,
    relationCommonReceipt:
      branchRelation.common.receiptId,
    relationWorldDifferences:
      branchRelation.world.diverged.length,
    relationSharedCards:
      branchRelation.cards.sharedUnchanged.length,
    relationDivergedCards:
      branchRelation.cards.sharedDiverged.length,
    relationBranch:
      relationBranch.branch?.id,
    relationIntroFrom:
      relationArrive?.params?.from,
    relationReceipt:
      relationFuture.receipt.id,
    relationContinuityDepth:
      relationContinuity?.history?.length ?? 0,
    relationInheritedSiblingReceipts:
      relationBranch.receipts.filter(
        (receipt) =>
          receipt.id === amberFuture.committed.receipt.id ||
          receipt.id === blueFuture.committed.receipt.id,
      ).length,
    causalGraphNodes: causalGraph.nodes.length,
    causalGraphEdges: causalGraph.edges.length,
    causalRelationNodes:
      causalGraph.nodes.filter(
        (node) => node.kind === "relation",
      ).length,
    causalObservationEdges:
      causalGraph.edges.filter(
        (edge) => edge.kind === "observes",
      ).length,
    causalCompositionEdges:
      causalGraph.edges.filter(
        (edge) => edge.kind === "composes",
      ).length,
    falseSiblingAncestryEdges:
      causalGraph.edges.filter(
        (edge) =>
          (edge.kind === "fork" || edge.kind === "continuity") &&
          (edge.from === amberReceiptNodeId ||
            edge.from === blueReceiptNodeId) &&
          (edge.to === relationBranchNodeId ||
            edge.to === relationReceiptNodeId),
      ).length,
    causalGraphPath,
    ecologyOneDisposition:
      scrapedEcology?.disposition?.kind,
    ecologyOneGeneration: ecologyOne.generation,
    ecologyTwoGeneration: ecologyTwo.generation,
    ecologyProposalCount: ecologyTwo.proposals.length,
    ecologyCapsuleAuthority:
      ecologyTwo.capsule.authorityClass,
    keptProposal: keptProposal.id,
    keptProposalAuthority:
      keptProposal.authorityClass,
    keptBranch: kept.branch?.id,
    keptIntroFrom: keptArrive?.params?.from,
    keptReceipt: keptFuture.receipt.id,
    keptContinuityDepth:
      keptContinuity?.history?.length ?? 0,
    ecologyGraphNodes: ecologyGraph.nodes.length,
    ecologyGraphEdges: ecologyGraph.edges.length,
    ecologyKeepEdges:
      ecologyGraph.edges.filter(
        (edge) => edge.kind === "keeps",
      ).length,
    ecologyUnkeptKeepEdges:
      ecologyGraph.edges.filter(
        (edge) =>
          edge.kind === "keeps" &&
          unkeptProposalIds.some(
            (proposalId) =>
              edge.from === `proposal:${proposalId}`,
          ),
      ).length,
    ecologyProposalReceipts:
      ecologyGraph.nodes.filter(
        (node) =>
          node.kind === "proposal" &&
          Boolean(node.receiptId),
      ).length,
    ecologyPath,
    keptSessionPath,
    relationPath,
    relationSessionPath,
    firstNewAssets: Object.keys(first.newAssets).length,
    secondNewAssets: Object.keys(second.newAssets).length,
    thirdNewAssets: Object.keys(third.newAssets).length,
  }),
);
