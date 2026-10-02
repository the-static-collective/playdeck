import type {
  CompositionEvent,
  CompositionPlan,
  DeckSpec,
  SectionGate,
  TrackSpec,
  WorldRule,
} from "@playdeck/core";
import {resolveGates} from "./gates";
import {
  orderedCards,
  selectCards,
  selectPortalCard,
} from "./selectors";

export type ComposeDeckOptions = {
  id?: string;
  fps?: 24 | 30 | 60;
  width?: number;
  height?: number;
};

export type ComposeDeckInput = {
  deck: DeckSpec;
  track: TrackSpec;
  worldRule: WorldRule;
  options?: ComposeDeckOptions;
};

const durationToNext = (
  gate: SectionGate,
  gateIndex: number,
  gates: SectionGate[],
  trackDuration: number,
) => Math.max(0, Math.round(((gates[gateIndex + 1]?.at ?? trackDuration) - gate.at) * 1000) / 1000);

const eventId = (gate: SectionGate, type: CompositionEvent["type"]) =>
  `event-${gate.id}-${type}`;

const worldDialect = (worldRule: WorldRule) =>
  [worldRule.surface, worldRule.transition, worldRule.physical]
    .filter((value): value is string => Boolean(value));

const inheritedAssembly = (deck: DeckSpec): string | undefined => {
  const continuity = deck.metadata?.continuity;
  if (!continuity || typeof continuity !== "object" || Array.isArray(continuity)) {
    return undefined;
  }

  const assembledAs = (continuity as Record<string, unknown>).assembledAs;
  return typeof assembledAs === "string" ? assembledAs : undefined;
};

export const composeDeck = ({
  deck,
  track,
  worldRule,
  options = {},
}: ComposeDeckInput): CompositionPlan => {
  if (deck.cards.length === 0) {
    throw new Error("Cannot compose an empty deck.");
  }

  const {gates, source: gateSource} = resolveGates(track);
  const cards = orderedCards(deck);
  const all = cards.map((card) => card.id);
  const chorusGates = gates.filter((gate) => gate.kind === "chorus");
  const outroGates = gates.filter((gate) => gate.kind === "outro");

  let verseIndex = 0;
  let chorusIndex = 0;
  const events: CompositionEvent[] = [];
  const held = new Set<string>();

  gates.forEach((gate, gateIndex) => {
    const duration = durationToNext(gate, gateIndex, gates, track.duration);

    switch (gate.kind) {
      case "intro": {
        events.push({
          id: eventId(gate, "arrive"),
          at: gate.at,
          duration,
          type: "arrive",
          cards: all,
          params: {
            from: inheritedAssembly(deck)
              ? `inherited-${inheritedAssembly(deck)}`
              : deck.sourceSheets?.length
                ? "sheet"
                : "stack",
            to: "deck",
          },
          because: inheritedAssembly(deck)
            ? "The deck begins from explicitly inherited prior state before becoming independently addressable again."
            : "The deck begins legible as source before its cards become independently addressable.",
        });
        break;
      }

      case "verse": {
        const count = Math.max(1, Math.ceil(cards.length / 3));

        if (verseIndex === 0) {
          events.push({
            id: eventId(gate, "hinge"),
            at: gate.at,
            duration,
            type: "hinge",
            cards: selectCards(deck, count, [
              "flip",
              "fold",
              "opening",
              "threshold",
              "arrival",
              "carried",
              "held-from-prior-performance",
            ]),
            because:
              "The first verse separates a few permissive cards from the source object without dissolving the deck.",
          });
        } else {
          events.push({
            id: eventId(gate, "drift"),
            at: gate.at,
            duration,
            type: "drift",
            cards: selectCards(deck, count, [
              "restless",
              "echoing",
              "observing",
              "memory",
              "witness",
            ]),
            because:
              "Returning verse material preserves individual witness by letting selected cards move without forcing assembly.",
          });
        }

        verseIndex += 1;
        break;
      }

      case "pre-chorus": {
        const count = Math.max(3, Math.ceil(cards.length * 0.45));
        events.push({
          id: eventId(gate, "thread"),
          at: gate.at,
          duration,
          type: "thread",
          cards: selectCards(deck, count, [
            "answering",
            "chorus-bound",
            "signal",
            "thread",
            "threshold",
            "merge",
          ]),
          because:
            "Pre-chorus pressure makes relationships visible before architecture is allowed to form.",
        });
        break;
      }

      case "chorus": {
        const finalChorus = chorusIndex === chorusGates.length - 1;
        const participation = finalChorus
          ? cards.length
          : Math.min(
              cards.length,
              Math.max(1, Math.round(cards.length * (0.75 + chorusIndex * 0.25))),
            );
        const cohesion = finalChorus
          ? 1
          : Math.min(0.95, 0.55 + chorusIndex * 0.2);

        events.push({
          id: eventId(gate, "assemble"),
          at: gate.at,
          duration,
          persist: finalChorus,
          type: "assemble",
          cards: finalChorus
            ? all
            : selectCards(deck, participation, [
                "chorus-bound",
                "merge",
                "room",
                "center",
                "door",
                "portal",
                "answering",
              ]),
          params: {
            shape: finalChorus ? "one-room" : `room-v${chorusIndex + 1}`,
            cohesion,
            ...(finalChorus
              ? {
                  center:
                    selectCards(deck, 1, ["center", "room", "door", "portal"])[0],
                }
              : {}),
          },
          because: finalChorus
            ? "The final chorus is the first automatic point where the whole deck may persist as one room."
            : "Each chorus increases participation and cohesion without claiming final resolution.",
        });

        chorusIndex += 1;
        break;
      }

      case "bridge": {
        events.push({
          id: eventId(gate, "corrupt"),
          at: gate.at,
          duration,
          type: "corrupt",
          cards: all,
          worldRule: worldRule.bridge?.worldRule ?? worldRule.transition ?? worldRule.id,
          params: {
            dialect: worldRule.bridge?.dialect ?? worldDialect(worldRule),
          },
          because:
            "The bridge temporarily interprets the declared world rule as a wrong-medium crossing.",
        });
        break;
      }

      case "breakdown": {
        events.push({
          id: eventId(gate, "contact-sheet"),
          at: gate.at,
          duration,
          persist: true,
          type: "contact-sheet",
          cards: all,
          params: {
            groups: deck.clusters?.length || Math.max(1, Math.round(Math.sqrt(cards.length))),
          },
          because:
            "The breakdown exposes the deck as addressable parts immediately before recomposition.",
        });
        break;
      }

      case "outro": {
        const firstOutro = gate.id === outroGates[0]?.id;
        const lastOutro = gate.id === outroGates.at(-1)?.id;

        if (firstOutro) {
          const residueCards = selectCards(
            deck,
            Math.min(3, cards.length),
            ["witness", "room", "door", "doorway", "lamp", "portal", "held"],
          );
          residueCards.forEach((id) => held.add(id));

          events.push({
            id: eventId(gate, "residue"),
            at: gate.at,
            duration,
            persist: true,
            type: "residue",
            cards: residueCards,
            because:
              "The outro keeps only a small witness set fully present so the performance leaves residue instead of closing cleanly.",
          });
        }

        if (lastOutro) {
          const portal = selectPortalCard(deck);
          if (portal) held.add(portal);

          events.push({
            id: eventId(gate, "hold"),
            at: gate.at,
            duration,
            persist: true,
            type: "hold",
            cards: portal ? [portal] : [],
            params: {
              message: gate.label ?? "door remains open",
            },
            because:
              "The last gate holds one threshold card open so final frame and final state remain distinct.",
          });
        }
        break;
      }

      case "custom": {
        events.push({
          id: eventId(gate, "drift"),
          at: gate.at,
          duration,
          type: "drift",
          cards: selectCards(deck, Math.ceil(cards.length / 3), [
            "restless",
            "answering",
            "witness",
          ]),
          because:
            "Unknown structural material receives conservative local motion instead of an invented semantic claim.",
        });
        break;
      }
    }
  });

  const hasFinalAssembly = chorusGates.length > 0;

  return {
    schemaVersion: "0.1",
    id: options.id ?? `${deck.id}--${track.id}--composed`,
    deckId: deck.id,
    trackId: track.id,
    worldRuleId: worldRule.id,
    duration: track.duration,
    fps: options.fps ?? 24,
    width: options.width ?? 1280,
    height: options.height ?? 720,
    gates,
    events,
    renderHints: {
      preferredRenderer: "remotion",
      preserveSourceTexture: true,
      deterministic: true,
      notes: [
        "Generated by @playdeck/composer.",
        `Gate source: ${gateSource}.`,
        "Event reasons are part of the inspectable composition.",
      ],
    },
    finalState: {
      assembledAs: hasFinalAssembly ? "room" : undefined,
      held: [...held],
      missing: [],
      newCards: [],
      notes: [
        "Generated composition state; not inferred by the renderer.",
        "Final frame is not final state.",
      ],
    },
    metadata: {
      generatedBy: "@playdeck/composer@0.0.1",
      gateSource,
      deterministic: true,
    },
  };
};
