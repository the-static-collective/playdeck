import type {CardSpec, DeckSpec} from "@playdeck/core";

const has = (values: string[] | undefined, value: string) =>
  values?.includes(value) ?? false;

export const orderedCards = (deck: DeckSpec): CardSpec[] => {
  if (!deck.order?.length) {
    return deck.cards;
  }

  const byId = new Map(deck.cards.map((card) => [card.id, card]));
  const fromOrder = deck.order
    .map((id) => byId.get(id))
    .filter((card): card is CardSpec => Boolean(card));

  const seen = new Set(fromOrder.map((card) => card.id));
  return [...fromOrder, ...deck.cards.filter((card) => !seen.has(card.id))];
};

export const scoreCard = (
  card: CardSpec,
  signals: string[],
): number => {
  let score = 0;

  for (const signal of signals) {
    if (has(card.traits, signal)) score += 3;
    if (has(card.temperament, signal)) score += 3;
    if (card.permissions?.[signal as keyof NonNullable<CardSpec["permissions"]>]) {
      score += 2;
    }
  }

  if (has(card.temperament, "held")) score -= 1;
  if (has(card.traits, "rough-edge")) score -= 0.25;

  return score;
};

export const selectCards = (
  deck: DeckSpec,
  count: number,
  signals: string[],
): string[] => {
  const ordered = orderedCards(deck);
  const index = new Map(ordered.map((card, i) => [card.id, i]));

  return [...ordered]
    .sort((a, b) => {
      const delta = scoreCard(b, signals) - scoreCard(a, signals);
      return delta || (index.get(a.id) ?? 0) - (index.get(b.id) ?? 0);
    })
    .slice(0, Math.max(1, Math.min(count, ordered.length)))
    .map((card) => card.id);
};

export const selectPortalCard = (deck: DeckSpec): string => {
  const selected = selectCards(
    deck,
    1,
    ["portal", "doorway", "door", "late-awakening", "awaken"],
  );

  return selected[0] ?? orderedCards(deck).at(-1)?.id ?? deck.cards[0]?.id ?? "";
};
