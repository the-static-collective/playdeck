import type {
  DeckSpec,
  PerformanceReceipt,
  WorldRule,
} from "@playdeck/core";
import type {
  StudioAssetPayload,
  StudioQueuedSong,
} from "./cockpitTypes";
import type {StudioBundle} from "./types";

export type StudioSessionCheckpoint = {
  id: string;
  receipt: PerformanceReceipt;
  inheritedDeck?: DeckSpec;
};

export type StudioSessionBranch = {
  id: string;
  label: string;
  parentId?: string;
  forkedFromReceipt: string;
  ancestorReceiptIds: string[];
};

export type StudioTimelineCheckpointState = {
  session: StudioBundle;
  assets: Record<string, StudioAssetPayload>;
  queue: StudioQueuedSong[];
  receipts: PerformanceReceipt[];
  preferences: {
    inheritAfterRender: boolean;
  };
  dirty: boolean;
};

export type StudioTimelineCheckpoint = {
  id: string;
  receipt: PerformanceReceipt;
  inheritedDeck: DeckSpec;
  parentReceiptId?: string;
  branchId?: string;
  state: StudioTimelineCheckpointState;
};

export type StudioTimelineRelation = {
  id: string;
  kind: "branch-relation";
  left: {
    checkpointId: string;
    receiptId: string;
    branchId: string;
    branchLabel: string;
  };
  right: {
    checkpointId: string;
    receiptId: string;
    branchId: string;
    branchLabel: string;
  };
  common: {
    checkpointId: string;
    receiptId: string;
  };
  resultBranchId: string;
  summary: {
    sharedUnchanged: number;
    sharedDiverged: number;
    leftOnly: number;
    rightOnly: number;
    worldDiverged: number;
  };
};

export type StudioAuthorityClass =
  | "evidence"
  | "uncertainty"
  | "proposal"
  | "influence-only"
  | "continuation-permission"
  | "resolved-execution";

export type StudioHauntCapsule = {
  id: string;
  kind: "static-collective/causal-capsule/v1";
  authorityClass: "influence-only";
  originRelationId: string;
  sourceReceiptIds: string[];
  sourceCheckpointId: string;
  surface: "possibility-search";
  invitation: string;
  residue: string[];
  unresolved: string[];
  refused: string[];
};

export type StudioPossibilityProposal = {
  id: string;
  slot: number;
  authorityClass: "proposal";
  label: string;
  invitation: string;
  seed: string;
  worldPatch: Partial<
    Pick<
      WorldRule,
      "physical" | "surface" | "transition" | "awakening"
    >
  >;
  traits: string[];
};

export type StudioPossibilityDisposition =
  | {
      kind: "KEEP";
      proposalId: string;
      authorityClass: "continuation-permission";
      resultBranchId: string;
    }
  | {
      kind: "SCRAPE";
    };

export type StudioPossibilityEcology = {
  id: string;
  kind: "haunted-possibility-ecology";
  relationId: string;
  commonCheckpointId: string;
  generation: number;
  capsule: StudioHauntCapsule;
  proposals: StudioPossibilityProposal[];
  disposition?: StudioPossibilityDisposition;
};

export type StudioTimelineLedger = {
  schemaVersion: "0.1";
  checkpoints: StudioTimelineCheckpoint[];
  branches: StudioSessionBranch[];
  relations?: StudioTimelineRelation[];
  ecologies?: StudioPossibilityEcology[];
};

export type StudioTimelineNode = {
  id: string;
  kind:
    | "receipt"
    | "branch"
    | "relation"
    | "capsule"
    | "proposal";
  label: string;
  receiptId?: string;
  branchId?: string;
  relationId?: string;
  ecologyId?: string;
  proposalId?: string;
  authorityClass?: StudioAuthorityClass;
  checkpointId?: string;
  phase?: "projected" | "rendered";
};

export type StudioTimelineEdge = {
  id: string;
  from: string;
  to: string;
  kind:
    | "continuity"
    | "fork"
    | "observes"
    | "composes"
    | "haunts"
    | "proposes"
    | "keeps";
};

export type StudioTimelineGraph = {
  nodes: StudioTimelineNode[];
  edges: StudioTimelineEdge[];
};

export type StudioSessionArchive = {
  kind: "playdeck-studio-session";
  schemaVersion: "0.1";
  session: StudioBundle;
  assets: Record<string, StudioAssetPayload>;
  queue: StudioQueuedSong[];
  receipts: PerformanceReceipt[];
  checkpoint?: StudioSessionCheckpoint;
  branch?: StudioSessionBranch;
  timeline?: StudioTimelineLedger;
  preferences: {
    inheritAfterRender: boolean;
  };
  dirty: boolean;
};

const uniqueReceipts = (
  receipts: PerformanceReceipt[],
): PerformanceReceipt[] => {
  const byId = new Map<string, PerformanceReceipt>();
  for (const receipt of receipts) {
    byId.set(receipt.id, receipt);
  }
  return [...byId.values()];
};

const uniqueBranches = (
  branches: StudioSessionBranch[],
): StudioSessionBranch[] => {
  const byId = new Map<string, StudioSessionBranch>();
  for (const branch of branches) {
    byId.set(branch.id, branch);
  }
  return [...byId.values()];
};

const uniqueRelations = (
  relations: StudioTimelineRelation[],
): StudioTimelineRelation[] => {
  const byId = new Map<string, StudioTimelineRelation>();
  for (const relation of relations) {
    byId.set(relation.id, relation);
  }
  return [...byId.values()];
};

const uniqueEcologies = (
  ecologies: StudioPossibilityEcology[],
): StudioPossibilityEcology[] => {
  const byId = new Map<string, StudioPossibilityEcology>();
  for (const ecology of ecologies) {
    byId.set(ecology.id, ecology);
  }
  return [...byId.values()];
};

const uniqueCheckpoints = (
  checkpoints: StudioTimelineCheckpoint[],
): StudioTimelineCheckpoint[] => {
  const byId = new Map<string, StudioTimelineCheckpoint>();
  for (const checkpoint of checkpoints) {
    byId.set(checkpoint.id, checkpoint);
  }
  return [...byId.values()];
};

const receiptIdFromRef = (
  value: string | undefined,
): string | undefined =>
  value?.startsWith("receipt:")
    ? value.slice("receipt:".length)
    : undefined;

const branchMarkerFromDeck = (
  deck: DeckSpec | undefined,
): StudioSessionBranch | undefined => {
  const marker = deck?.metadata?.studioBranch;
  if (!marker || typeof marker !== "object" || Array.isArray(marker)) {
    return undefined;
  }
  const record = marker as Partial<StudioSessionBranch>;
  if (
    typeof record.id !== "string" ||
    typeof record.label !== "string" ||
    typeof record.forkedFromReceipt !== "string" ||
    !Array.isArray(record.ancestorReceiptIds)
  ) {
    return undefined;
  }
  return record as StudioSessionBranch;
};

const requiredSources = (
  session: StudioBundle,
  checkpoint?: StudioSessionCheckpoint,
): string[] => {
  const decks = [
    session.deck,
    checkpoint?.inheritedDeck,
  ].filter((deck): deck is DeckSpec => Boolean(deck));

  return [
    session.track.source,
    ...decks.flatMap((deck) =>
      deck.cards.map((card) => card.front?.source ?? card.source),
    ),
  ];
};

const stateFromArchive = (
  archive: StudioSessionArchive,
): StudioTimelineCheckpointState => ({
  session: archive.session,
  assets: archive.assets,
  queue: archive.queue,
  receipts: archive.receipts,
  preferences: archive.preferences,
  dirty: archive.dirty,
});

const currentTimelineCheckpoint = (
  archive: StudioSessionArchive,
): StudioTimelineCheckpoint | undefined => {
  const checkpoint = archive.checkpoint;
  if (!checkpoint?.inheritedDeck) return undefined;

  const branch =
    archive.branch ??
    branchMarkerFromDeck(checkpoint.inheritedDeck);

  return {
    id: checkpoint.id,
    receipt: checkpoint.receipt,
    inheritedDeck: checkpoint.inheritedDeck,
    parentReceiptId: receiptIdFromRef(
      archive.session.deck.inheritedReceipt,
    ),
    branchId: branch?.id,
    state: stateFromArchive(archive),
  };
};

export const emptyStudioTimeline = (): StudioTimelineLedger => ({
  schemaVersion: "0.1",
  checkpoints: [],
  branches: [],
  relations: [],
  ecologies: [],
});

export const mergeStudioTimelineLedgers = (
  ...ledgers: Array<StudioTimelineLedger | undefined>
): StudioTimelineLedger => ({
  schemaVersion: "0.1",
  checkpoints: uniqueCheckpoints(
    ledgers.flatMap((ledger) => ledger?.checkpoints ?? []),
  ),
  branches: uniqueBranches(
    ledgers.flatMap((ledger) => ledger?.branches ?? []),
  ),
  relations: uniqueRelations(
    ledgers.flatMap((ledger) => ledger?.relations ?? []),
  ),
  ecologies: uniqueEcologies(
    ledgers.flatMap((ledger) => ledger?.ecologies ?? []),
  ),
});

export const ensureStudioTimeline = (
  archive: StudioSessionArchive,
): StudioTimelineLedger => {
  const current = currentTimelineCheckpoint(archive);
  return mergeStudioTimelineLedgers(
    {
      schemaVersion: "0.1",
      checkpoints: current ? [current] : [],
      branches: archive.branch ? [archive.branch] : [],
      relations: [],
      ecologies: [],
    },
    archive.timeline,
  );
};

export const appendStudioTimelineCheckpoint = (
  timeline: StudioTimelineLedger,
  checkpoint: StudioTimelineCheckpoint,
): StudioTimelineLedger =>
  mergeStudioTimelineLedgers(timeline, {
    schemaVersion: "0.1",
    checkpoints: [checkpoint],
    branches: [],
    relations: [],
    ecologies: [],
  });

export const appendStudioTimelineBranch = (
  timeline: StudioTimelineLedger,
  branch: StudioSessionBranch,
): StudioTimelineLedger =>
  mergeStudioTimelineLedgers(timeline, {
    schemaVersion: "0.1",
    checkpoints: [],
    branches: [branch],
    relations: [],
    ecologies: [],
  });

export const appendStudioTimelineRelation = (
  timeline: StudioTimelineLedger,
  relation: StudioTimelineRelation,
): StudioTimelineLedger =>
  mergeStudioTimelineLedgers(timeline, {
    schemaVersion: "0.1",
    checkpoints: [],
    branches: [],
    relations: [relation],
    ecologies: [],
  });

export const appendStudioPossibilityEcology = (
  timeline: StudioTimelineLedger,
  ecology: StudioPossibilityEcology,
): StudioTimelineLedger =>
  mergeStudioTimelineLedgers(timeline, {
    schemaVersion: "0.1",
    checkpoints: [],
    branches: [],
    relations: [],
    ecologies: [ecology],
  });

const assertTimeline = (
  timeline: StudioTimelineLedger,
): void => {
  if (timeline.schemaVersion !== "0.1") {
    throw new Error("Unsupported Studio timeline version.");
  }

  const checkpointIds = new Set<string>();
  for (const checkpoint of timeline.checkpoints) {
    if (checkpointIds.has(checkpoint.id)) {
      throw new Error(
        `Duplicate timeline checkpoint "${checkpoint.id}".`,
      );
    }
    checkpointIds.add(checkpoint.id);

    if (checkpoint.receipt.phase !== "rendered") {
      throw new Error(
        `Timeline checkpoint "${checkpoint.id}" is not rendered.`,
      );
    }

    if (
      checkpoint.inheritedDeck.inheritedReceipt !==
      `receipt:${checkpoint.receipt.id}`
    ) {
      throw new Error(
        `Timeline checkpoint "${checkpoint.id}" deck does not cite its receipt.`,
      );
    }

    if (
      !checkpoint.state.receipts.some(
        (receipt) => receipt.id === checkpoint.receipt.id,
      )
    ) {
      throw new Error(
        `Timeline checkpoint "${checkpoint.id}" state is missing its receipt.`,
      );
    }
  }

  const branchIds = new Set<string>();
  for (const branch of timeline.branches) {
    if (branchIds.has(branch.id)) {
      throw new Error(
        `Duplicate timeline branch "${branch.id}".`,
      );
    }
    branchIds.add(branch.id);
  }

  const relationIds = new Set<string>();
  for (const relation of timeline.relations ?? []) {
    if (relationIds.has(relation.id)) {
      throw new Error(
        `Duplicate timeline relation "${relation.id}".`,
      );
    }
    relationIds.add(relation.id);

    const left = timeline.checkpoints.find(
      (checkpoint) =>
        checkpoint.id === relation.left.checkpointId &&
        checkpoint.receipt.id === relation.left.receiptId,
    );
    const right = timeline.checkpoints.find(
      (checkpoint) =>
        checkpoint.id === relation.right.checkpointId &&
        checkpoint.receipt.id === relation.right.receiptId,
    );
    const common = timeline.checkpoints.find(
      (checkpoint) =>
        checkpoint.id === relation.common.checkpointId &&
        checkpoint.receipt.id === relation.common.receiptId,
    );

    if (!left || !right || !common) {
      throw new Error(
        `Timeline relation "${relation.id}" cites missing checkpoints.`,
      );
    }

    if (!branchIds.has(relation.resultBranchId)) {
      throw new Error(
        `Timeline relation "${relation.id}" cites missing result branch "${relation.resultBranchId}".`,
      );
    }
  }

  const ecologyIds = new Set<string>();
  for (const ecology of timeline.ecologies ?? []) {
    if (ecologyIds.has(ecology.id)) {
      throw new Error(
        `Duplicate possibility ecology "${ecology.id}".`,
      );
    }
    ecologyIds.add(ecology.id);

    if (!relationIds.has(ecology.relationId)) {
      throw new Error(
        `Possibility ecology "${ecology.id}" cites missing relation "${ecology.relationId}".`,
      );
    }

    if (
      !timeline.checkpoints.some(
        (checkpoint) =>
          checkpoint.id === ecology.commonCheckpointId,
      )
    ) {
      throw new Error(
        `Possibility ecology "${ecology.id}" cites missing common checkpoint.`,
      );
    }

    if (
      ecology.capsule.kind !==
        "static-collective/causal-capsule/v1" ||
      ecology.capsule.authorityClass !== "influence-only" ||
      ecology.capsule.originRelationId !== ecology.relationId ||
      ecology.capsule.sourceCheckpointId !==
        ecology.commonCheckpointId
    ) {
      throw new Error(
        `Possibility ecology "${ecology.id}" has an invalid influence capsule.`,
      );
    }

    if (ecology.proposals.length !== 6) {
      throw new Error(
        `Possibility ecology "${ecology.id}" must contain exactly six proposals.`,
      );
    }

    const proposalIds = new Set<string>();
    const slots = new Set<number>();
    for (const proposal of ecology.proposals) {
      if (
        proposal.authorityClass !== "proposal" ||
        proposal.slot < 1 ||
        proposal.slot > 6 ||
        proposalIds.has(proposal.id) ||
        slots.has(proposal.slot)
      ) {
        throw new Error(
          `Possibility ecology "${ecology.id}" has an invalid proposal family.`,
        );
      }
      proposalIds.add(proposal.id);
      slots.add(proposal.slot);
    }

    if (ecology.disposition?.kind === "KEEP") {
      if (
        !proposalIds.has(ecology.disposition.proposalId) ||
        ecology.disposition.authorityClass !==
          "continuation-permission" ||
        !branchIds.has(ecology.disposition.resultBranchId)
      ) {
        throw new Error(
          `Possibility ecology "${ecology.id}" has an invalid KEEP disposition.`,
        );
      }
    }
  }
};

export const assertPortableStudioSession = (
  archive: StudioSessionArchive,
): void => {
  if (archive.kind !== "playdeck-studio-session") {
    throw new Error("Not a PlayDeck Studio Session.");
  }

  if (archive.schemaVersion !== "0.1") {
    throw new Error(
      `Unsupported PlayDeck Studio Session version "${String(
        archive.schemaVersion,
      )}".`,
    );
  }

  if (archive.session.plan.deckId !== archive.session.deck.id) {
    throw new Error("Session plan/deck identity mismatch.");
  }

  if (archive.session.plan.trackId !== archive.session.track.id) {
    throw new Error("Session plan/track identity mismatch.");
  }

  if (
    archive.session.plan.worldRuleId !==
    archive.session.worldRule.id
  ) {
    throw new Error("Session plan/world-rule identity mismatch.");
  }

  const receiptIds = new Set(
    archive.receipts.map((receipt) => receipt.id),
  );

  if (
    archive.session.receipt &&
    !receiptIds.has(archive.session.receipt.id)
  ) {
    throw new Error(
      "Current witnessed receipt is missing from session receipt history.",
    );
  }

  if (archive.branch) {
    if (!archive.checkpoint?.inheritedDeck) {
      throw new Error(
        "A branched session requires an inherited checkpoint deck.",
      );
    }

    if (!receiptIds.has(archive.branch.forkedFromReceipt)) {
      throw new Error(
        "Branch origin receipt is missing from session ancestry.",
      );
    }

    const branchMarker =
      archive.checkpoint.inheritedDeck.metadata?.studioBranch;
    if (
      !branchMarker ||
      typeof branchMarker !== "object" ||
      Array.isArray(branchMarker) ||
      (branchMarker as Record<string, unknown>).id !==
        archive.branch.id
    ) {
      throw new Error(
        "Branch checkpoint deck is missing its branch identity.",
      );
    }

    for (const receiptId of archive.branch.ancestorReceiptIds) {
      if (!receiptIds.has(receiptId)) {
        throw new Error(
          `Branch ancestor receipt "${receiptId}" is missing from session history.`,
        );
      }
    }
  }

  if (archive.checkpoint) {
    if (archive.checkpoint.receipt.phase !== "rendered") {
      throw new Error(
        "A resumable continuity checkpoint must be a rendered receipt.",
      );
    }

    if (!receiptIds.has(archive.checkpoint.receipt.id)) {
      throw new Error(
        "Continuity checkpoint receipt is missing from session history.",
      );
    }

    if (
      archive.checkpoint.inheritedDeck &&
      archive.checkpoint.inheritedDeck.inheritedReceipt !==
        `receipt:${archive.checkpoint.receipt.id}`
    ) {
      throw new Error(
        "Continuity checkpoint deck does not cite its rendered receipt.",
      );
    }
  }

  for (const source of new Set(
    requiredSources(archive.session, archive.checkpoint),
  )) {
    if (!archive.assets[source]) {
      throw new Error(
        `Portable session is missing media for "${source}".`,
      );
    }
  }

  for (const queued of archive.queue) {
    if (!queued.audio.base64 || !queued.audio.name) {
      throw new Error(
        `Queued song "${queued.id}" is missing portable audio bytes.`,
      );
    }
  }

  if (archive.timeline) {
    assertTimeline(archive.timeline);
  }
};

export const createStudioSessionArchive = ({
  session,
  assets,
  queue,
  receipts,
  checkpoint,
  branch,
  timeline,
  inheritAfterRender,
  dirty,
}: {
  session: StudioBundle;
  assets: Record<string, StudioAssetPayload>;
  queue: StudioQueuedSong[];
  receipts: PerformanceReceipt[];
  checkpoint?: StudioSessionCheckpoint;
  branch?: StudioSessionBranch;
  timeline?: StudioTimelineLedger;
  inheritAfterRender: boolean;
  dirty: boolean;
}): StudioSessionArchive => {
  const history = uniqueReceipts([
    ...receipts,
    ...(session.receipt ? [session.receipt] : []),
    ...(checkpoint ? [checkpoint.receipt] : []),
  ]);

  const base: StudioSessionArchive = {
    kind: "playdeck-studio-session",
    schemaVersion: "0.1",
    session,
    assets,
    queue,
    receipts: history,
    checkpoint,
    branch,
    timeline,
    preferences: {
      inheritAfterRender,
    },
    dirty,
  };

  base.timeline = ensureStudioTimeline(base);
  assertPortableStudioSession(base);
  return base;
};

export const parseStudioSessionArchive = (
  text: string,
): StudioSessionArchive => {
  const archive = JSON.parse(text) as StudioSessionArchive;
  archive.timeline = ensureStudioTimeline(archive);
  assertPortableStudioSession(archive);
  return archive;
};

export const serializeStudioSessionArchive = (
  archive: StudioSessionArchive,
): string => {
  const normalized = {
    ...archive,
    timeline: ensureStudioTimeline(archive),
  };
  assertPortableStudioSession(normalized);
  return JSON.stringify(normalized, null, 2) + "\n";
};

const branchSlug = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 36) || "branch";

const branchHash = (value: string): string => {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
};

export const restoreStudioSessionAtCheckpoint = (
  source: StudioSessionArchive,
  checkpointId: string,
): StudioSessionArchive => {
  const timeline = ensureStudioTimeline(source);
  const checkpoint = timeline.checkpoints.find(
    (item) => item.id === checkpointId,
  );

  if (!checkpoint) {
    throw new Error(
      `Timeline checkpoint "${checkpointId}" was not found.`,
    );
  }

  const state = checkpoint.state;
  const branch = checkpoint.branchId
    ? timeline.branches.find(
        (candidate) => candidate.id === checkpoint.branchId,
      )
    : undefined;

  const restored = createStudioSessionArchive({
    session: state.session,
    assets: state.assets,
    queue: state.queue,
    receipts: state.receipts,
    checkpoint: {
      id: checkpoint.id,
      receipt: checkpoint.receipt,
      inheritedDeck: checkpoint.inheritedDeck,
    },
    branch,
    timeline,
    inheritAfterRender:
      state.preferences.inheritAfterRender,
    dirty: state.dirty,
  });

  return restored;
};

export const forkStudioSessionArchive = (
  source: StudioSessionArchive,
  label: string,
  checkpointId?: string,
): StudioSessionArchive => {
  assertPortableStudioSession(source);
  const timeline = ensureStudioTimeline(source);

  const selected = checkpointId
    ? timeline.checkpoints.find(
        (candidate) => candidate.id === checkpointId,
      )
    : currentTimelineCheckpoint(source);

  if (!selected?.inheritedDeck) {
    throw new Error(
      "Forking requires a sealed checkpoint with an inherited deck.",
    );
  }

  const cleanLabel = label.trim();
  if (!cleanLabel) {
    throw new Error("Branch label cannot be empty.");
  }

  const sourceBranch = selected.branchId
    ? timeline.branches.find(
        (candidate) => candidate.id === selected.branchId,
      )
    : undefined;
  const parentId = sourceBranch?.id;
  const ancestorReceiptIds = selected.state.receipts.map(
    (receipt) => receipt.id,
  );
  const id =
    `${branchSlug(cleanLabel)}-${branchHash(
      [
        parentId ?? "root",
        selected.receipt.id,
        cleanLabel,
      ].join(":"),
    )}`;

  const branch: StudioSessionBranch = {
    id,
    label: cleanLabel,
    ...(parentId ? {parentId} : {}),
    forkedFromReceipt: selected.receipt.id,
    ancestorReceiptIds,
  };

  const inheritedDeck: DeckSpec = {
    ...selected.inheritedDeck,
    metadata: {
      ...(selected.inheritedDeck.metadata ?? {}),
      studioBranch: branch,
    },
  };

  const branchedTimeline = appendStudioTimelineBranch(
    timeline,
    branch,
  );
  const state = selected.state;

  const forked: StudioSessionArchive = {
    kind: "playdeck-studio-session",
    schemaVersion: "0.1",
    session: state.session,
    assets: state.assets,
    queue: state.queue,
    receipts: state.receipts,
    checkpoint: {
      id: selected.id,
      receipt: selected.receipt,
      inheritedDeck,
    },
    branch,
    timeline: branchedTimeline,
    preferences: state.preferences,
    dirty: state.dirty,
  };

  assertPortableStudioSession(forked);
  return forked;
};

export const mergeStudioSessionTimelines = (
  current: StudioSessionArchive,
  peers: StudioSessionArchive[],
): StudioTimelineLedger =>
  mergeStudioTimelineLedgers(
    ensureStudioTimeline(current),
    ...peers.map((peer) => ensureStudioTimeline(peer)),
  );

export const buildStudioTimelineGraph = (
  timeline: StudioTimelineLedger,
): StudioTimelineGraph => {
  const receiptById = new Map<string, PerformanceReceipt>();
  const checkpointByReceipt = new Map<
    string,
    StudioTimelineCheckpoint
  >();

  for (const checkpoint of timeline.checkpoints) {
    checkpointByReceipt.set(
      checkpoint.receipt.id,
      checkpoint,
    );
    for (const receipt of checkpoint.state.receipts) {
      receiptById.set(receipt.id, receipt);
    }
    receiptById.set(
      checkpoint.receipt.id,
      checkpoint.receipt,
    );
  }

  const nodes: StudioTimelineNode[] = [
    ...[...receiptById.values()].map((receipt) => {
      const checkpoint = checkpointByReceipt.get(receipt.id);
      return {
        id: `receipt:${receipt.id}`,
        kind: "receipt" as const,
        label: receipt.id,
        receiptId: receipt.id,
        checkpointId: checkpoint?.id,
        phase: receipt.phase,
        authorityClass: "resolved-execution" as const,
      };
    }),
    ...timeline.branches.map((branch) => {
      const kept = (timeline.ecologies ?? []).find(
        (ecology) =>
          ecology.disposition?.kind === "KEEP" &&
          ecology.disposition.resultBranchId === branch.id,
      );
      return {
        id: `branch:${branch.id}`,
        kind: "branch" as const,
        label: branch.label,
        branchId: branch.id,
        ...(kept
          ? {
              authorityClass:
                "continuation-permission" as const,
            }
          : {}),
      };
    }),
    ...(timeline.relations ?? []).map((relation) => ({
      id: `relation:${relation.id}`,
      kind: "relation" as const,
      label: `${relation.left.branchLabel} ↔ ${relation.right.branchLabel}`,
      relationId: relation.id,
    })),
    ...(timeline.ecologies ?? []).flatMap((ecology) => [
      {
        id: `capsule:${ecology.capsule.id}`,
        kind: "capsule" as const,
        label: ecology.capsule.invitation,
        ecologyId: ecology.id,
        authorityClass: "influence-only" as const,
      },
      ...ecology.proposals.map((proposal) => ({
        id: `proposal:${proposal.id}`,
        kind: "proposal" as const,
        label: proposal.label,
        ecologyId: ecology.id,
        proposalId: proposal.id,
        authorityClass: "proposal" as const,
      })),
    ]),
  ];

  const edges: StudioTimelineEdge[] = [];

  for (const branch of timeline.branches) {
    edges.push({
      id: `fork:${branch.forkedFromReceipt}->${branch.id}`,
      from: `receipt:${branch.forkedFromReceipt}`,
      to: `branch:${branch.id}`,
      kind: "fork",
    });
  }

  for (const relation of timeline.relations ?? []) {
    edges.push(
      {
        id: `observes:${relation.left.receiptId}->${relation.id}:left`,
        from: `receipt:${relation.left.receiptId}`,
        to: `relation:${relation.id}`,
        kind: "observes",
      },
      {
        id: `observes:${relation.right.receiptId}->${relation.id}:right`,
        from: `receipt:${relation.right.receiptId}`,
        to: `relation:${relation.id}`,
        kind: "observes",
      },
      {
        id: `composes:${relation.id}->${relation.resultBranchId}`,
        from: `relation:${relation.id}`,
        to: `branch:${relation.resultBranchId}`,
        kind: "composes",
      },
    );
  }

  for (const ecology of timeline.ecologies ?? []) {
    edges.push({
      id: `haunts:${ecology.relationId}->${ecology.capsule.id}`,
      from: `relation:${ecology.relationId}`,
      to: `capsule:${ecology.capsule.id}`,
      kind: "haunts",
    });

    for (const proposal of ecology.proposals) {
      edges.push({
        id: `proposes:${ecology.capsule.id}->${proposal.id}`,
        from: `capsule:${ecology.capsule.id}`,
        to: `proposal:${proposal.id}`,
        kind: "proposes",
      });
    }

    if (ecology.disposition?.kind === "KEEP") {
      edges.push({
        id: `keeps:${ecology.disposition.proposalId}->${ecology.disposition.resultBranchId}`,
        from: `proposal:${ecology.disposition.proposalId}`,
        to: `branch:${ecology.disposition.resultBranchId}`,
        kind: "keeps",
      });
    }
  }

  for (const checkpoint of timeline.checkpoints) {
    const receiptNode = `receipt:${checkpoint.receipt.id}`;
    if (checkpoint.branchId) {
      const branch = timeline.branches.find(
        (candidate) => candidate.id === checkpoint.branchId,
      );
      if (
        branch &&
        checkpoint.parentReceiptId ===
          branch.forkedFromReceipt
      ) {
        edges.push({
          id: `branch-receipt:${branch.id}->${checkpoint.receipt.id}`,
          from: `branch:${branch.id}`,
          to: receiptNode,
          kind: "continuity",
        });
        continue;
      }
    }

    if (checkpoint.parentReceiptId) {
      edges.push({
        id: `continuity:${checkpoint.parentReceiptId}->${checkpoint.receipt.id}`,
        from: `receipt:${checkpoint.parentReceiptId}`,
        to: receiptNode,
        kind: "continuity",
      });
    }
  }

  const validNodeIds = new Set(nodes.map((node) => node.id));

  return {
    nodes,
    edges: edges.filter(
      (edge) =>
        validNodeIds.has(edge.from) &&
        validNodeIds.has(edge.to),
    ),
  };
};
