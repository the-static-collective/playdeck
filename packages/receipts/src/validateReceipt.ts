import type {
  DeckSpec,
  PerformanceReceipt,
} from "@playdeck/core";
import {canInheritReceipt} from "./sealReceipt";

export type ReceiptValidation = {
  valid: boolean;
  inheritable: boolean;
  errors: string[];
};

export const validateReceipt = (
  receipt: PerformanceReceipt,
  deck?: DeckSpec,
): ReceiptValidation => {
  const errors: string[] = [];
  const cardIds = deck
    ? new Set(deck.cards.map((card) => card.id))
    : undefined;

  if (!receipt.id) errors.push("receipt.id is required");
  if (!receipt.source.planId) errors.push("receipt.source.planId is required");

  const eventIds = new Set<string>();
  for (const event of receipt.events) {
    if (eventIds.has(event.id)) {
      errors.push(`duplicate receipt event id "${event.id}"`);
    }
    eventIds.add(event.id);

    if (event.at < 0) {
      errors.push(`receipt event "${event.id}" has a negative timestamp`);
    }

    if (cardIds) {
      for (const cardId of [...event.cards, ...event.with]) {
        if (!cardIds.has(cardId)) {
          errors.push(
            `receipt event "${event.id}" references missing card "${cardId}"`,
          );
        }
      }
    }
  }

  if (cardIds) {
    for (const cardId of [
      ...receipt.carry.held,
      ...receipt.carry.missing,
    ]) {
      if (!cardIds.has(cardId)) {
        errors.push(`receipt carry references missing card "${cardId}"`);
      }
    }
  }

  if (receipt.phase === "rendered" && !canInheritReceipt(receipt)) {
    errors.push(
      "rendered receipt lacks explicit full-performance evidence",
    );
  }

  return {
    valid: errors.length === 0,
    inheritable: errors.length === 0 && canInheritReceipt(receipt),
    errors,
  };
};

export const assertValidReceipt = (
  receipt: PerformanceReceipt,
  deck?: DeckSpec,
): void => {
  const result = validateReceipt(receipt, deck);

  if (!result.valid) {
    throw new Error(
      ["Invalid playdeck receipt:", ...result.errors.map((e) => `- ${e}`)].join("\n"),
    );
  }
};
