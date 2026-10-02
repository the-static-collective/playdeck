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

export type StudioSessionArchive = {
  kind: "playdeck-studio-session";
  schemaVersion: "0.1";
  session: StudioBundle;
  assets: Record<string, StudioAssetPayload>;
  queue: StudioQueuedSong[];
  receipts: PerformanceReceipt[];
  checkpoint?: StudioSessionCheckpoint;
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
  inheritAfterRender,
  dirty,
}: {
  session: StudioBundle;
  assets: Record<string, StudioAssetPayload>;
  queue: StudioQueuedSong[];
  receipts: PerformanceReceipt[];
  checkpoint?: StudioSessionCheckpoint;
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
