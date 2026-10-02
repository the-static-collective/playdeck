import type {DeckSpec, TrackSpec, WorldRule} from "@playdeck/core";
import {composeDeck} from "@playdeck/composer";
import {projectReceipt, sealReceipt} from "@playdeck/receipts";
import {applyReceiptToDeck} from "./index";

import deckJson from "../../../examples/genesis-001/deck.json";
import trackJson from "../../../examples/genesis-001/track.json";
import worldRuleJson from "../../../examples/genesis-001/world-rule.json";

const deck = deckJson as DeckSpec;
const track = trackJson as TrackSpec;
const worldRule = worldRuleJson as WorldRule;

const firstPlan = composeDeck({
  deck,
  track,
  worldRule,
  options: {id: "continuity-proof-first", fps: 24, width: 1280, height: 720},
});

const projected = projectReceipt(firstPlan, "continuity-proof-projected");

let rejectedProjection = false;
try {
  applyReceiptToDeck(deck, projected);
} catch {
  rejectedProjection = true;
}

if (!rejectedProjection) {
  throw new Error("Continuity must reject projected receipts.");
}

/**
 * Synthetic evidence exists only to prove the continuity mechanism.
 * It is not a claim that Genesis 001 has a sealed full-performance render.
 */
const sealedTestReceipt = sealReceipt(projected, [
  {
    kind: "video",
    uri: "test://synthetic/full-performance.mp4",
    scope: "full-performance",
    renderer: "test-fixture",
    notes: [
      "Synthetic CI evidence only.",
      "Not a claim about any real Genesis performance.",
    ],
  },
]);

const inheritedDeck = applyReceiptToDeck(deck, sealedTestReceipt);
const nextPlan = composeDeck({
  deck: inheritedDeck,
  track: {
    ...track,
    id: "continuity-proof-next-track",
    title: "Continuity Proof — Next Track",
  },
  worldRule,
  options: {id: "continuity-proof-next", fps: 24, width: 1280, height: 720},
});

const intro = nextPlan.events.find((event) => event.type === "arrive");
if (intro?.params?.from !== "inherited-room") {
  throw new Error(
    `Expected next composition to begin from inherited-room, got "${String(intro?.params?.from)}".`,
  );
}

const held = new Set(sealedTestReceipt.carry.held);
const carriedFirst = inheritedDeck.order?.slice(0, held.size) ?? [];
if (!carriedFirst.every((id) => held.has(id))) {
  throw new Error("Held cards must be carried to the front of the next deck traversal.");
}

const firstVerse = nextPlan.events.find((event) => event.type === "hinge");
if (!firstVerse?.cards?.some((id) => held.has(id))) {
  throw new Error("At least one carried card must be eligible for early re-entry.");
}

console.log(
  JSON.stringify({
    projectedRejected: rejectedProjection,
    syntheticEvidence: true,
    inheritedReceipt: inheritedDeck.inheritedReceipt,
    carriedFirst,
    nextIntroFrom: intro.params?.from,
    firstVerseCards: firstVerse.cards,
  }),
);
