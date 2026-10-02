#!/usr/bin/env node
import {resolve} from "node:path";
import {ingestFolder, writeDeck} from "./index";

const args = process.argv.slice(2);

const valueAfter = (flag: string): string | undefined => {
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : undefined;
};

const source = args.find((arg) => !arg.startsWith("-"));

if (!source) {
  throw new Error(
    "Usage: playdeck-ingest <folder> --id <deck-id> [--out deck.json] [--source-prefix asset://deck-id] [--title title]",
  );
}

const deckId = valueAfter("--id");
if (!deckId) {
  throw new Error("--id is required.");
}

const output = valueAfter("--out") ?? "./deck.json";
const sourcePrefix = valueAfter("--source-prefix");
const title = valueAfter("--title");

const deck = ingestFolder(resolve(source), {
  deckId,
  title,
  sourcePrefix,
});

const written = writeDeck(deck, output);

console.log(
  JSON.stringify({
    deckId: deck.id,
    cards: deck.cards.length,
    output: written,
  }),
);
