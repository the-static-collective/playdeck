import type {
  DeckSpec,
  PerformanceReceipt,
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

export type StudioSessionArchive = {
  kind: "playdeck-studio-session";
  schemaVersion: "0.1";
  session: StudioBundle;
  assets: Record<string, StudioAssetPayload>;
  queue: StudioQueuedSong[];
  receipts: PerformanceReceipt[];
  checkpoint?: StudioSessionCheckpoint;
  branch?: StudioSessionBranch;
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

    if (
      archive.branch.forkedFromReceipt !==
      archive.checkpoint.receipt.id
    ) {
      throw new Error(
        "Branch origin must match the checkpoint receipt.",
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
};

export const createStudioSessionArchive = ({
  session,
  assets,
  queue,
  receipts,
  checkpoint,
  branch,
  inheritAfterRender,
  dirty,
}: {
  session: StudioBundle;
  assets: Record<string, StudioAssetPayload>;
  queue: StudioQueuedSong[];
  receipts: PerformanceReceipt[];
  checkpoint?: StudioSessionCheckpoint;
  branch?: StudioSessionBranch;
  inheritAfterRender: boolean;
  dirty: boolean;
}): StudioSessionArchive => {
  const history = uniqueReceipts([
    ...receipts,
    ...(session.receipt ? [session.receipt] : []),
    ...(checkpoint ? [checkpoint.receipt] : []),
  ]);

  const archive: StudioSessionArchive = {
    kind: "playdeck-studio-session",
    schemaVersion: "0.1",
    session,
    assets,
    queue,
    receipts: history,
    checkpoint,
    branch,
    preferences: {
      inheritAfterRender,
    },
    dirty,
  };

  assertPortableStudioSession(archive);
  return archive;
};

export const parseStudioSessionArchive = (
  text: string,
): StudioSessionArchive => {
  const archive = JSON.parse(text) as StudioSessionArchive;
  assertPortableStudioSession(archive);
  return archive;
};

export const serializeStudioSessionArchive = (
  archive: StudioSessionArchive,
): string => {
  assertPortableStudioSession(archive);
  return JSON.stringify(archive, null, 2) + "\n";
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

export const forkStudioSessionArchive = (
  source: StudioSessionArchive,
  label: string,
): StudioSessionArchive => {
  assertPortableStudioSession(source);

  const checkpoint = source.checkpoint;
  if (!checkpoint?.inheritedDeck) {
    throw new Error(
      "Forking requires a sealed checkpoint with an inherited deck.",
    );
  }

  const cleanLabel = label.trim();
  if (!cleanLabel) {
    throw new Error("Branch label cannot be empty.");
  }

  const parentId = source.branch?.id;
  const ancestorReceiptIds = source.receipts.map(
    (receipt) => receipt.id,
  );
  const id =
    `${branchSlug(cleanLabel)}-${branchHash(
      [
        parentId ?? "root",
        checkpoint.receipt.id,
        cleanLabel,
      ].join(":"),
    )}`;

  const branch: StudioSessionBranch = {
    id,
    label: cleanLabel,
    ...(parentId ? {parentId} : {}),
    forkedFromReceipt: checkpoint.receipt.id,
    ancestorReceiptIds,
  };

  const inheritedDeck: DeckSpec = {
    ...checkpoint.inheritedDeck,
    metadata: {
      ...(checkpoint.inheritedDeck.metadata ?? {}),
      studioBranch: branch,
    },
  };

  const forked: StudioSessionArchive = {
    ...source,
    checkpoint: {
      ...checkpoint,
      inheritedDeck,
    },
    branch,
  };

  assertPortableStudioSession(forked);
  return forked;
};
