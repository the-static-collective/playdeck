import {mkdirSync, writeFileSync} from "node:fs";
import {fileURLToPath} from "node:url";
import type {TrackSpec, WorldRule} from "@playdeck/core";
import {composeDeck, assertValidCompositionPlan} from "@playdeck/composer";
import {ingestFolder} from "./ingestFolder";

const folder = fileURLToPath(
  new URL("../../../examples/ingest-001/images/", import.meta.url),
);

const deck = ingestFolder(folder, {
  deckId: "ingest-001-postcards",
  sourcePrefix: "asset://ingest-001",
});

if (deck.cards.length !== 4) {
  throw new Error(`Expected 4 cards, got ${deck.cards.length}`);
}

const expected = [
  "01-weather-arrival",
  "02-signal-thread",
  "03-room-center",
  "04-doorway-lamp",
];

if (JSON.stringify(deck.order) !== JSON.stringify(expected)) {
  throw new Error(
    `Unexpected deterministic order: ${JSON.stringify(deck.order)}`,
  );
}

const signal = deck.cards.find((card) => card.id === "02-signal-thread");
if (!signal?.traits?.includes("signal") || !signal.temperament?.includes("answering")) {
  throw new Error("Manifest traits were not applied to the signal card.");
}

const weather = deck.cards.find((card) => card.id === "01-weather-arrival");
const hint = (
  weather?.metadata?.ingest as Record<string, unknown> | undefined
)?.filenameHint;

if (hint !== "01-weather-arrival") {
  throw new Error("Filename provenance hint was not preserved.");
}

if (weather?.traits?.includes("weather") !== true) {
  throw new Error("Explicit manifest trait missing from weather card.");
}

const track: TrackSpec = {
  schemaVersion: "0.1",
  id: "ingest-001-demo-track",
  title: "Folder Ingestion Proof",
  source: "asset://ingest-001/demo-track.mp3",
  duration: 90,
};

const worldRule: WorldRule = {
  schemaVersion: "0.1",
  id: "postcard",
  physical: "postcard",
  surface: "printed-paper",
  transition: "contact-sheet",
  awakening: "portal",
  bridge: {
    worldRule: "postal-static",
    dialect: ["postmark", "misregistration", "sorting-machine"],
  },
};

const plan = composeDeck({
  deck,
  track,
  worldRule,
  options: {
    id: "ingest-001-composed",
    fps: 24,
    width: 1280,
    height: 720,
  },
});

assertValidCompositionPlan(plan, deck);

if (plan.metadata?.gateSource !== "duration-fallback") {
  throw new Error("Ungated ingest proof track should use duration fallback gates.");
}

if (!plan.events.some((event) => event.type === "assemble")) {
  throw new Error("Ingested deck did not reach an assembly event.");
}

const outputDir = fileURLToPath(new URL("../../../out/", import.meta.url));
mkdirSync(outputDir, {recursive: true});

const deckOutput = fileURLToPath(
  new URL("../../../out/ingest-001-deck.generated.json", import.meta.url),
);
const planOutput = fileURLToPath(
  new URL("../../../out/ingest-001-plan.generated.json", import.meta.url),
);

writeFileSync(deckOutput, JSON.stringify(deck, null, 2) + "\n", "utf8");
writeFileSync(planOutput, JSON.stringify(plan, null, 2) + "\n", "utf8");

console.log(
  JSON.stringify({
    deckOutput,
    planOutput,
    cards: deck.cards.length,
    order: deck.order,
    gateSource: plan.metadata?.gateSource,
    events: plan.events.length,
  }),
);
