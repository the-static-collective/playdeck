import {createHash} from "node:crypto";
import {existsSync, readFileSync} from "node:fs";
import {extname, resolve} from "node:path";
import type {CardSpec, DeckSpec} from "@playdeck/core";
import type {
  PagePlaylistItem,
  PagePlaylistPressReceipt,
  PagePlaylistPressResult,
  PagePlaylistPressSpec,
} from "./types";

const sha256 = (value: Buffer | string) =>
  createHash("sha256").update(value).digest("hex");

const unique = <T>(values: T[]) => [...new Set(values)];

const canonical = (value: unknown) => JSON.stringify(value);

const logicalSource = (
  pressId: string,
  byteSha256: string,
  extension: string,
) => {
  const suffix = extension.toLowerCase() || ".bin";
  return `asset://${pressId}/pages/${byteSha256}${suffix}`;
};

const assertRemixBinding = (item: PagePlaylistItem) => {
  if (item.kind !== "remix") return;

  if (!item.candidateId) {
    throw new Error(
      `Remix item "${item.id}" requires candidateId.`,
    );
  }

  if (!item.parentIds?.length) {
    throw new Error(
      `Remix item "${item.id}" requires at least one parentId.`,
    );
  }
};

export const pressPagePlaylist = (
  spec: PagePlaylistPressSpec,
): PagePlaylistPressResult => {
  if (spec.items.length === 0) {
    throw new Error("A page playlist press requires at least one item.");
  }

  const ids = new Set<string>();
  const assetSources: Record<string, string> = {};
  const receiptInputs: PagePlaylistPressReceipt["inputs"] = [];

  const cards: CardSpec[] = spec.items.map((item, index) => {
    if (ids.has(item.id)) {
      throw new Error(`Duplicate page playlist card id: ${item.id}`);
    }
    ids.add(item.id);

    assertRemixBinding(item);

    const file = resolve(item.file);
    if (!existsSync(file)) {
      throw new Error(
        `Page playlist source does not exist for "${item.id}": ${file}`,
      );
    }

    const bytes = readFileSync(file);
    const byteSha256 = sha256(bytes);

    if (
      item.declaredSha256 &&
      item.declaredSha256.toLowerCase() !== byteSha256
    ) {
      throw new Error(
        `Page playlist hash mismatch for "${item.id}": expected ${item.declaredSha256}, got ${byteSha256}`,
      );
    }

    const source = logicalSource(
      spec.id,
      byteSha256,
      extname(file),
    );

    const alreadyBound = assetSources[source];
    if (alreadyBound && alreadyBound !== file) {
      throw new Error(
        `Identical logical source resolved to conflicting files: ${source}`,
      );
    }
    assetSources[source] = file;

    receiptInputs.push({
      index,
      cardId: item.id,
      kind: item.kind,
      authority: item.authority,
      sourceIdentity: item.sourceIdentity,
      byteSha256,
      candidateId: item.candidateId,
      parentIds: item.parentIds,
    });

    return {
      id: item.id,
      source,
      front: {source},
      traits: unique([
        "manga-page",
        `page-kind:${item.kind}`,
        `authority:${item.authority}`,
        ...(item.traits ?? []),
      ]),
      temperament: unique([
        "playlist-pressed",
        ...(item.temperament ?? []),
      ]),
      permissions: item.permissions,
      metadata: {
        ...(item.metadata ?? {}),
        pagePlaylistPress: {
          index,
          title: item.title,
          kind: item.kind,
          authority: item.authority,
          sourceIdentity: item.sourceIdentity,
          byteSha256,
          candidateId: item.candidateId,
          parentIds: item.parentIds,
          playabilityOnly: true,
        },
      },
    };
  });

  const deck: DeckSpec = {
    schemaVersion: "0.1",
    id: spec.id,
    title: spec.title ?? spec.id,
    cards,
    order: cards.map((card) => card.id),
    metadata: {
      ...(spec.metadata ?? {}),
      pagePlaylistPress: {
        schemaVersion: "0.1",
        itemCount: cards.length,
        laws: [
          "PAGE != CARD",
          "PLAYABLE != ADMITTED",
          "REMIX != PARENT",
          "ORDER != ANCESTRY",
          "TRANSPORT PATH != IDENTITY",
        ],
      },
    },
  };

  const receiptCore = {
    pressId: spec.id,
    deckId: deck.id,
    inputs: receiptInputs,
  };

  const receipt: PagePlaylistPressReceipt = {
    schemaVersion: "0.1",
    id: `page-playlist-press:${sha256(canonical(receiptCore))}`,
    ...receiptCore,
    laws: [
      "PAGE != CARD",
      "PLAYABLE != ADMITTED",
      "REMIX != PARENT",
      "ORDER != ANCESTRY",
      "TRANSPORT PATH != IDENTITY",
      "PRESS != PERFORMANCE",
    ],
    stop:
      "This receipt proves deterministic deck pressing only. It grants no admission, publication, canon, or performance authority.",
  };

  return {deck, assetSources, receipt};
};
