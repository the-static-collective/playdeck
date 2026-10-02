import type {DeckSpec, PerformanceReceipt} from "@playdeck/core";
import {canInheritReceipt} from "@playdeck/receipts";

const unique = (values: string[]) => [...new Set(values)];

type ContinuityHistoryEntry = {
  receiptId: string;
  sourcePlanId: string;
  assembledAs?: string;
  held: string[];
  missing: string[];
  newCards: string[];
};

const priorDeckHistory = (deck: DeckSpec): ContinuityHistoryEntry[] => {
  const continuity = deck.metadata?.continuity;
  if (!continuity || typeof continuity !== "object" || Array.isArray(continuity)) {
    return [];
  }

  const history = (continuity as Record<string, unknown>).history;
  return Array.isArray(history)
    ? (history.filter(
        (entry): entry is ContinuityHistoryEntry =>
          Boolean(entry) && typeof entry === "object" && !Array.isArray(entry),
      ))
    : [];
};

const priorCardHistory = (
  metadata: Record<string, unknown> | undefined,
): Array<Record<string, unknown>> => {
  const continuity = metadata?.continuity;
  if (!continuity || typeof continuity !== "object" || Array.isArray(continuity)) {
    return [];
  }

  const history = (continuity as Record<string, unknown>).history;
  return Array.isArray(history)
    ? history.filter(
        (entry): entry is Record<string, unknown> =>
          Boolean(entry) && typeof entry === "object" && !Array.isArray(entry),
      )
    : [];
};

export const applyReceiptToDeck = (
  deck: DeckSpec,
  receipt: PerformanceReceipt,
): DeckSpec => {
  if (!canInheritReceipt(receipt)) {
    throw new Error(
      `Receipt "${receipt.id}" is not inheritable. A sealed rendered receipt with full-performance evidence is required.`,
    );
  }

  if (receipt.source.deckId !== deck.id) {
    throw new Error(
      `Receipt deck "${receipt.source.deckId}" does not match deck "${deck.id}".`,
    );
  }

  const held = new Set(receipt.carry.held);
  const missing = new Set(receipt.carry.missing);

  const cards = deck.cards.map((card) => {
    const temperament = [...(card.temperament ?? [])];
    const history = priorCardHistory(card.metadata);

    if (held.has(card.id)) {
      temperament.push("carried", "held-from-prior-performance");
    }

    if (missing.has(card.id)) {
      temperament.push("absent-from-prior-performance");
    }

    const crossing = {
      inheritedFromReceipt: receipt.id,
      wasHeld: held.has(card.id),
      wasMissing: missing.has(card.id),
    };

    return {
      ...card,
      temperament: unique(temperament),
      metadata: {
        ...(card.metadata ?? {}),
        continuity: {
          ...crossing,
          history: [...history, crossing],
        },
      },
    };
  });

  const currentOrder = deck.order?.length
    ? deck.order
    : deck.cards.map((card) => card.id);

  const nextOrder = [
    ...receipt.carry.held.filter((id) => currentOrder.includes(id)),
    ...currentOrder.filter((id) => !held.has(id)),
  ];

  const historyEntry: ContinuityHistoryEntry = {
    receiptId: receipt.id,
    sourcePlanId: receipt.source.planId,
    assembledAs: receipt.carry.assembledAs,
    held: [...receipt.carry.held],
    missing: [...receipt.carry.missing],
    newCards: [...receipt.carry.newCards],
  };

  return {
    ...deck,
    cards,
    order: unique(nextOrder),
    inheritedReceipt: `receipt:${receipt.id}`,
    metadata: {
      ...(deck.metadata ?? {}),
      continuity: {
        ...historyEntry,
        history: [...priorDeckHistory(deck), historyEntry],
      },
    },
  };
};
