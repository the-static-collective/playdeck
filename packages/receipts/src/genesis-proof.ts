import {mkdirSync, writeFileSync} from "node:fs";
import {fileURLToPath} from "node:url";
import type {DeckSpec, TrackSpec, WorldRule} from "@playdeck/core";
import {composeDeck, assertValidCompositionPlan} from "@playdeck/composer";
import {
  assertValidReceipt,
  canInheritReceipt,
  projectReceipt,
} from "./index";

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

const receipt = projectReceipt(plan, "genesis-001-receipt");
assertValidReceipt(receipt, deck);

if (canInheritReceipt(receipt)) {
  throw new Error(
    "Projected Genesis receipt must not be inheritable before full-performance evidence is supplied.",
  );
}

if (receipt.carry.assembledAs !== "room") {
  throw new Error("Genesis receipt must carry the assembled room state.");
}

if (!receipt.carry.held.includes("card-09")) {
  throw new Error("Genesis receipt must carry the held threshold card.");
}

const outputDir = fileURLToPath(new URL("../../../out/", import.meta.url));
const output = fileURLToPath(
  new URL("../../../out/genesis-001-receipt.projected.json", import.meta.url),
);
mkdirSync(outputDir, {recursive: true});
writeFileSync(output, JSON.stringify(receipt, null, 2) + "\n", "utf8");

console.log(
  JSON.stringify({
    output,
    phase: receipt.phase,
    inheritable: canInheritReceipt(receipt),
    events: receipt.events.length,
    assembledAs: receipt.carry.assembledAs,
    held: receipt.carry.held,
  }),
);
