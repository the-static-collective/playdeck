import {createHash} from "node:crypto";
import {
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import {join} from "node:path";
import {fileURLToPath} from "node:url";
import {pressPagePlaylist} from "./pressPagePlaylist";
import type {PagePlaylistPressSpec} from "./types";

const sha256 = (value: Buffer) =>
  createHash("sha256").update(value).digest("hex");

const root = fileURLToPath(
  new URL("../../../out/page-playlist-press-001/", import.meta.url),
);
const inputs = join(root, "inputs");

rmSync(root, {recursive: true, force: true});
mkdirSync(inputs, {recursive: true});

const originalA = join(inputs, "01-original-a.png");
const originalB = join(inputs, "02-original-b.png");
const remix = join(inputs, "03-remix.png");

writeFileSync(originalA, Buffer.from("playdeck-original-a\n"));
writeFileSync(originalB, Buffer.from("playdeck-original-b\n"));
writeFileSync(remix, Buffer.from("playdeck-remix-ab\n"));

const originalAHash = sha256(readFileSync(originalA));
const originalBHash = sha256(readFileSync(originalB));
const remixHash = sha256(readFileSync(remix));

const spec: PagePlaylistPressSpec = {
  schemaVersion: "0.1",
  id: "page-playlist-press-001",
  title: "Originals + Remix",
  items: [
    {
      id: "page-a",
      file: originalA,
      sourceIdentity: "lemonpress://page/a",
      kind: "original",
      authority: "source",
      declaredSha256: originalAHash,
    },
    {
      id: "page-b",
      file: originalB,
      sourceIdentity: "lemonpress://page/b",
      kind: "original",
      authority: "admitted",
      declaredSha256: originalBHash,
    },
    {
      id: "page-ab-remix",
      file: remix,
      sourceIdentity: "lemonpress://candidate/ab",
      kind: "remix",
      authority: "candidate",
      declaredSha256: remixHash,
      candidateId: "manga-remix:ab",
      parentIds: [
        "lemonpress://page/a",
        "lemonpress://page/b",
      ],
    },
  ],
};

const first = pressPagePlaylist(spec);
const second = pressPagePlaylist(spec);

if (
  JSON.stringify(first.deck) !== JSON.stringify(second.deck) ||
  JSON.stringify(first.receipt) !== JSON.stringify(second.receipt)
) {
  throw new Error("Page playlist press must be deterministic.");
}

if (
  JSON.stringify(first.deck.order) !==
  JSON.stringify(["page-a", "page-b", "page-ab-remix"])
) {
  throw new Error("Declared playlist order was not preserved.");
}

const remixCard = first.deck.cards.find(
  (card) => card.id === "page-ab-remix",
);
const remixMeta = remixCard?.metadata?.pagePlaylistPress as
  | Record<string, unknown>
  | undefined;

if (
  remixMeta?.kind !== "remix" ||
  remixMeta?.authority !== "candidate" ||
  remixMeta?.candidateId !== "manga-remix:ab"
) {
  throw new Error("Remix provenance was flattened during press.");
}

if (
  !Array.isArray(remixMeta?.parentIds) ||
  remixMeta.parentIds.length !== 2
) {
  throw new Error("Remix parent identities were not preserved.");
}

if (remixMeta?.playabilityOnly !== true) {
  throw new Error("Pressed cards must remain explicitly playability-only.");
}

if (Object.keys(first.assetSources).length !== 3) {
  throw new Error("Expected one exact asset binding per unique page.");
}

let mismatchRefused = false;
try {
  pressPagePlaylist({
    ...spec,
    items: [
      {
        ...spec.items[0],
        declaredSha256: "0".repeat(64),
      },
    ],
  });
} catch {
  mismatchRefused = true;
}

if (!mismatchRefused) {
  throw new Error("Press must refuse a declared hash mismatch.");
}

writeFileSync(
  join(root, "deck.json"),
  JSON.stringify(first.deck, null, 2) + "\n",
  "utf8",
);
writeFileSync(
  join(root, "press.receipt.json"),
  JSON.stringify(first.receipt, null, 2) + "\n",
  "utf8",
);

console.log(
  JSON.stringify({
    deckId: first.deck.id,
    cards: first.deck.cards.length,
    order: first.deck.order,
    receiptId: first.receipt.id,
    remixAuthority: remixMeta?.authority,
    remixParents: remixMeta?.parentIds,
    mismatchRefused,
  }),
);
