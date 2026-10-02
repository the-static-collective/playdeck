import {mkdirSync, writeFileSync} from "node:fs";
import {fileURLToPath} from "node:url";
import type {DeckSpec, TrackSpec, WorldRule} from "@playdeck/core";
import {assertValidCompositionPlan, composeDeck} from "./index";

import deckJson from "../../../examples/genesis-001/deck.json";
import trackJson from "../../../examples/genesis-001/track.json";
import worldRuleJson from "../../../examples/genesis-001/world-rule.json";

const deck = deckJson as DeckSpec;
const track = trackJson as TrackSpec;
const worldRule = worldRuleJson as WorldRule;

const plan = composeDeck({
  deck,
  track,
  worldRule,
  options: {
    id: "genesis-001-composed",
    fps: 24,
    width: 1280,
    height: 720,
  },
});

assertValidCompositionPlan(plan, deck);

const types = new Set(plan.events.map((event) => event.type));
for (const required of [
  "arrive",
  "thread",
  "assemble",
  "corrupt",
  "contact-sheet",
  "residue",
  "hold",
] as const) {
  if (!types.has(required)) {
    throw new Error(`Genesis composer proof is missing required event type: ${required}`);
  }
}

const finalAssembly = [...plan.events]
  .reverse()
  .find((event) => event.type === "assemble");

if (
  !finalAssembly ||
  !finalAssembly.persist ||
  finalAssembly.cards?.length !== deck.cards.length
) {
  throw new Error(
    "Genesis composer proof requires a persistent final assembly containing every card.",
  );
}

const output = fileURLToPath(
  new URL("../../../out/genesis-001-plan.generated.json", import.meta.url),
);
mkdirSync(fileURLToPath(new URL("../../../out/", import.meta.url)), {
  recursive: true,
});
writeFileSync(output, JSON.stringify(plan, null, 2) + "\n", "utf8");

console.log(
  JSON.stringify({
    output,
    events: plan.events.length,
    gates: plan.gates.length,
    held: plan.finalState?.held ?? [],
    finalAssemblyCards: finalAssembly.cards?.length ?? 0,
  }),
);
