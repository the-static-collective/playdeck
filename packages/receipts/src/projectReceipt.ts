import type {
  CardSpec,
  CompositionEvent,
  CompositionPlan,
  PerformanceReceipt,
} from "@playdeck/core";

const eventResult = (event: CompositionEvent): string | undefined => {
  if (event.params?.externalMaterial === true) {
    return "external-derived-media";
  }

  switch (event.type) {
    case "assemble":
      return typeof event.params?.shape === "string"
        ? event.params.shape
        : "assembled";
    case "thread":
      return "relation-visible";
    case "contact-sheet":
      return "addressable-parts";
    case "corrupt":
      return event.worldRule ?? "wrong-medium";
    case "hold":
      return "held-open";
    case "residue":
      return "residue";
    case "awaken":
      return "awakened";
    case "freeze":
      return "new-artifact";
    default:
      return undefined;
  }
};

export type ProjectReceiptOptions = {
  newCardSpecs?: CardSpec[];
};

export const projectReceipt = (
  plan: CompositionPlan,
  id = `${plan.id}--receipt`,
  options: ProjectReceiptOptions = {},
): PerformanceReceipt => {
  const finalState = {
    assembledAs: plan.finalState?.assembledAs,
    held: [...(plan.finalState?.held ?? [])],
    missing: [...(plan.finalState?.missing ?? [])],
    newCards: [...(plan.finalState?.newCards ?? [])],
    notes: [...(plan.finalState?.notes ?? [])],
  };

  return {
    schemaVersion: "0.1",
    id,
    phase: "projected",
    source: {
      deckId: plan.deckId,
      trackId: plan.trackId,
      worldRuleId: plan.worldRuleId,
      planId: plan.id,
    },
    events: plan.events.map((event) => ({
      id: event.id,
      at: event.at,
      duration: event.duration,
      type: event.type,
      cards: [...(event.cards ?? [])],
      with: [...(event.with ?? [])],
      worldRule: event.worldRule,
      persistent: event.persist ?? false,
      result: eventResult(event),
      because: event.because,
    })),
    finalState,
    carry: {
      assembledAs: finalState.assembledAs,
      held: [...finalState.held],
      missing: [...finalState.missing],
      newCards: [...finalState.newCards],
      newCardSpecs: (options.newCardSpecs ?? []).map((card) => ({
        ...card,
        traits: [...(card.traits ?? [])],
        temperament: [...(card.temperament ?? [])],
        relationships: [...(card.relationships ?? [])],
        metadata: {...(card.metadata ?? {})},
      })),
    },
    metadata: {
      projectedFrom: plan.id,
      deterministic: plan.renderHints?.deterministic ?? false,
      ...(plan.metadata?.studioFranken !== undefined
        ? {studioFranken: plan.metadata.studioFranken}
        : {}),
      ...(plan.metadata?.studioFrankenMedia !== undefined
        ? {studioFrankenMedia: plan.metadata.studioFrankenMedia}
        : {}),
    },
  };
};
