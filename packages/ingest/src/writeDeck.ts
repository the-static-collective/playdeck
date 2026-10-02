import {mkdirSync, writeFileSync} from "node:fs";
import {dirname, resolve} from "node:path";
import type {DeckSpec} from "@playdeck/core";

export const writeDeck = (
  deck: DeckSpec,
  outputFile: string,
): string => {
  const output = resolve(outputFile);
  mkdirSync(dirname(output), {recursive: true});
  writeFileSync(output, JSON.stringify(deck, null, 2) + "\n", "utf8");
  return output;
};
