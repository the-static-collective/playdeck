import type {DeckSpec, PerformanceReceipt} from "@playdeck/core";
import {canInheritReceipt} from "@playdeck/receipts";

const unique = (values: string[]) => [...new Set(values)];

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

    if (held.has(card.id)) {
      temperament.push("carried", "held-from-prior-performance");
    }

    if (missing.has(card.id)) {
      temperament.push("absent-from-prior-performance");
    }

    return {
      ...card,
      temperament: unique(temperament),
      metadata: {
        ...(card.metadata ?? {}),
        continuity: {
          inheritedFromReceipt: receipt.id,
          wasHeld: held.has(card.id),
          wasMissing: missing.has(card.id),
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

  return {
    ...deck,
    cards,
    order: unique(nextOrder),
    inheritedReceipt: `receipt:${receipt.id}`,
    metadata: {
      ...(deck.metadata ?? {}),
      continuity: {
        receiptId: receipt.id,
        sourcePlanId: receipt.source.planId,
        assembledAs: receipt.carry.assembledAs,
        held: [...receipt.carry.held],
        missing: [...receipt.carry.missing],
        newCards: [...receipt.carry.newCards],
      },
    },
  };
};
