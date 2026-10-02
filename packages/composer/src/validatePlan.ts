import type {CompositionPlan, DeckSpec} from "@playdeck/core";

export type PlanValidation = {
  valid: boolean;
  errors: string[];
};

export const validateCompositionPlan = (
  plan: CompositionPlan,
  deck: DeckSpec,
): PlanValidation => {
  const errors: string[] = [];
  const cardIds = new Set(deck.cards.map((card) => card.id));

  if (plan.deckId !== deck.id) {
    errors.push(`plan.deckId "${plan.deckId}" does not match deck.id "${deck.id}"`);
  }

  if (plan.duration <= 0) errors.push("plan.duration must be positive");
  if (plan.width <= 0 || plan.height <= 0) {
    errors.push("plan dimensions must be positive");
  }

  for (let i = 1; i < plan.gates.length; i += 1) {
    if (plan.gates[i].at < plan.gates[i - 1].at) {
      errors.push("plan.gates must be chronological");
      break;
    }
  }

  const eventIds = new Set<string>();
  for (const event of plan.events) {
    if (eventIds.has(event.id)) {
      errors.push(`duplicate event id "${event.id}"`);
    }
    eventIds.add(event.id);

    if (event.at < 0 || event.at > plan.duration) {
      errors.push(`event "${event.id}" starts outside the plan duration`);
    }

    for (const cardId of [...(event.cards ?? []), ...(event.with ?? [])]) {
      if (!cardIds.has(cardId)) {
        errors.push(`event "${event.id}" references missing card "${cardId}"`);
      }
    }
  }

  for (const cardId of [
    ...(plan.finalState?.held ?? []),
    ...(plan.finalState?.missing ?? []),
  ]) {
    if (!cardIds.has(cardId)) {
      errors.push(`final state references missing card "${cardId}"`);
    }
  }

  return {valid: errors.length === 0, errors};
};

export const assertValidCompositionPlan = (
  plan: CompositionPlan,
  deck: DeckSpec,
): void => {
  const result = validateCompositionPlan(plan, deck);

  if (!result.valid) {
    throw new Error(
      ["Invalid playdeck composition plan:", ...result.errors.map((e) => `- ${e}`)].join("\n"),
    );
  }
};
