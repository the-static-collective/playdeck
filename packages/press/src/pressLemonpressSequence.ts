import {createHash} from "node:crypto";
import {pressPagePlaylist} from "./pressPagePlaylist";
import type {
  PagePlaylistAuthority,
  PagePlaylistKind,
  PagePlaylistPressResult,
} from "./types";

export type LemonpressWholeSelection = {kind: "whole"};

export type LemonpressSequenceSelection =
  | LemonpressWholeSelection
  | {kind: "region"; x: number; y: number; width: number; height: number}
  | {kind: "panel"; panel_id: string};

export type LemonpressSequenceParent = {
  parent_id: string;
  kind: "page" | "panel" | "region" | "candidate";
  title: string;
};

export type LemonpressSequenceSlot = {
  slot: number;
  source_ref: string;
  selection: LemonpressSequenceSelection;
};

export type LemonpressSequenceCandidate = {
  schema: "lemonpress/manga-sequence-candidate/v0";
  candidate_id: string;
  status: "CANDIDATE";
  title: string;
  sequence_sha256: string;
  sequence_id: string;
  slots: LemonpressSequenceSlot[];
  parents: LemonpressSequenceParent[];
  authority: {
    editorial_selection: false;
    edition_admission: false;
    publication: false;
    house_release: false;
  };
  laws: string[];
  wrench?: unknown;
};

export type LemonpressSequenceAssetBinding = {
  file: string;
  kind: PagePlaylistKind;
  authority: PagePlaylistAuthority;
  declaredSha256?: string;
  candidateId?: string;
  parentIds?: string[];
  traits?: string[];
  temperament?: string[];
  metadata?: Record<string, unknown>;
};

export type LemonpressSequencePressSpec = {
  id: string;
  candidate: LemonpressSequenceCandidate;
  bindings: Record<string, LemonpressSequenceAssetBinding>;
  title?: string;
  metadata?: Record<string, unknown>;
};

export type LemonpressSequenceHandoffSlot = {
  slot: number;
  sourceRef: string;
  cardId: string;
};

export type LemonpressSequenceHandoffReceipt = {
  schema: "playdeck/lemonpress-sequence-handoff/v0";
  id: string;
  sequenceCandidateId: string;
  sequenceId: string;
  sequenceSha256: string;
  deckId: string;
  pagePlaylistPressReceiptId: string;
  slots: LemonpressSequenceHandoffSlot[];
  laws: string[];
  stop: string;
};

export type LemonpressSequencePressResult = PagePlaylistPressResult & {
  handoffReceipt: LemonpressSequenceHandoffReceipt;
};

const LEMONPRESS_SEQUENCE_LAWS = [
  "REORDER != SOURCE MUTATION",
  "ORDER != ANCESTRY",
  "READING ORDER != OWNERSHIP",
  "SEQUENCE != ADMISSION",
  "OMISSION != DELETION",
  "DUPLICATION != NEW SOURCE",
  "SLOT != PAGE IDENTITY",
  "CANDIDATE != ISSUE",
] as const;

const HANDOFF_LAWS = [
  "SEQUENCE != PERFORMANCE",
  "SEQUENCE CANDIDATE != ADMISSION",
  "SLOT != SOURCE",
  "REPEAT != NEW SOURCE",
  "PLAYDECK ORDER != ANCESTRY",
  "ASSET BINDING != SOURCE AUTHORITY",
  "HANDOFF != HISTORY",
] as const;

const sha256 = (value: string) =>
  createHash("sha256").update(value).digest("hex");

const canonical = (value: unknown): string => {
  if (value === null || typeof value !== "object") {
    const encoded = JSON.stringify(value);
    if (encoded === undefined) {
      throw new Error("Canonical sequence identity forbids undefined values.");
    }
    return encoded;
  }
  if (Array.isArray(value)) {
    return "[" + value.map(canonical).join(",") + "]";
  }
  const object = value as Record<string, unknown>;
  return "{" + Object.keys(object).sort()
    .map((key) => JSON.stringify(key) + ":" + canonical(object[key]))
    .join(",") + "}";
};

const assertFalseAuthority = (candidate: LemonpressSequenceCandidate) => {
  if (candidate.authority.editorial_selection !== false ||
      candidate.authority.edition_admission !== false ||
      candidate.authority.publication !== false ||
      candidate.authority.house_release !== false) {
    throw new Error("LemonPRESS sequence candidate attempted authority escalation.");
  }
};

const assertWholeOnly = (candidate: LemonpressSequenceCandidate) => {
  const partial = candidate.slots.find((slot) => slot.selection.kind !== "whole");
  if (partial) {
    throw new Error("Playdeck whole-page handoff refuses unresolved " +
      partial.selection.kind + " selection at slot " + partial.slot + ".");
  }
};

export const verifyLemonpressSequenceIdentity = (candidate: LemonpressSequenceCandidate) => {
  if (candidate.schema !== "lemonpress/manga-sequence-candidate/v0" ||
      candidate.status !== "CANDIDATE") {
    throw new Error("Expected LemonPRESS manga sequence candidate v0.");
  }
  assertFalseAuthority(candidate);
  assertWholeOnly(candidate);

  if (JSON.stringify(candidate.laws) !== JSON.stringify(LEMONPRESS_SEQUENCE_LAWS)) {
    throw new Error("Unexpected LemonPRESS REMIX SEQUENCE 001 law set.");
  }
  if (candidate.parents.length === 0 || candidate.slots.length === 0) {
    throw new Error("LemonPRESS sequence candidate requires parents and slots.");
  }

  const parentIds = new Set<string>();
  for (const parent of candidate.parents) {
    if (!parent.parent_id || parentIds.has(parent.parent_id)) {
      throw new Error("Invalid or duplicate LemonPRESS parent_id: " + parent.parent_id);
    }
    parentIds.add(parent.parent_id);
  }

  const slots = new Set<number>();
  for (const occurrence of candidate.slots) {
    if (!Number.isInteger(occurrence.slot) || occurrence.slot <= 0 || slots.has(occurrence.slot)) {
      throw new Error("Invalid or duplicate LemonPRESS slot: " + occurrence.slot);
    }
    slots.add(occurrence.slot);
    if (!parentIds.has(occurrence.source_ref)) {
      throw new Error("LemonPRESS slot " + occurrence.slot +
        " references undeclared parent " + occurrence.source_ref + ".");
    }
  }

  const expectedSequenceSha = sha256(canonical(candidate.slots));
  if (candidate.sequence_sha256 !== expectedSequenceSha) {
    throw new Error("LemonPRESS sequence hash mismatch: expected " +
      expectedSequenceSha + ", got " + candidate.sequence_sha256);
  }

  const declaration = {
    schema: "lemonpress/manga-remix-sequence/v0",
    id: candidate.sequence_id,
    title: candidate.title,
    status: "EXECUTION_WITNESS",
    parents: candidate.parents,
    sequence: candidate.slots,
    authority: candidate.authority,
    laws: candidate.laws,
  };
  const expectedCandidateId = "manga-sequence:" + sha256(canonical(declaration));
  if (candidate.candidate_id !== expectedCandidateId) {
    throw new Error("LemonPRESS candidate identity mismatch: expected " +
      expectedCandidateId + ", got " + candidate.candidate_id);
  }
  return {candidateId: expectedCandidateId, sequenceSha256: expectedSequenceSha};
};

const assertCandidateParentBinding = (
  parent: LemonpressSequenceParent,
  binding: LemonpressSequenceAssetBinding,
) => {
  if (parent.kind !== "candidate") return;
  if (binding.kind !== "remix" || binding.authority !== "candidate" ||
      !binding.candidateId || !binding.parentIds?.length) {
    throw new Error("Candidate parent " + parent.parent_id +
      " must remain an explicitly bound candidate remix with parentIds.");
  }
};

export const pressLemonpressSequence = (
  spec: LemonpressSequencePressSpec,
): LemonpressSequencePressResult => {
  verifyLemonpressSequenceIdentity(spec.candidate);
  const parentById = new Map(spec.candidate.parents.map((parent) => [parent.parent_id, parent] as const));

  const items = spec.candidate.slots.map((occurrence) => {
    const parent = parentById.get(occurrence.source_ref);
    if (!parent) throw new Error("Missing LemonPRESS parent for " + occurrence.source_ref + ".");
    const binding = spec.bindings[occurrence.source_ref];
    if (!binding) {
      throw new Error("Missing Playdeck asset binding for LemonPRESS source " +
        occurrence.source_ref + ".");
    }
    assertCandidateParentBinding(parent, binding);
    return {
      id: spec.candidate.sequence_id + ":slot:" + occurrence.slot,
      title: parent.title,
      file: binding.file,
      sourceIdentity: occurrence.source_ref,
      kind: binding.kind,
      authority: binding.authority,
      declaredSha256: binding.declaredSha256,
      candidateId: binding.candidateId,
      parentIds: binding.parentIds,
      traits: binding.traits,
      temperament: binding.temperament,
      metadata: {
        ...(binding.metadata ?? {}),
        lemonpressSequence: {
          sequenceCandidateId: spec.candidate.candidate_id,
          sequenceId: spec.candidate.sequence_id,
          sequenceSha256: spec.candidate.sequence_sha256,
          slot: occurrence.slot,
          sourceRef: occurrence.source_ref,
          selection: occurrence.selection,
          parentKind: parent.kind,
          sequenceAuthority: "candidate",
          occurrenceOnly: true,
        },
      },
    };
  });

  const pressed = pressPagePlaylist({
    schemaVersion: "0.1",
    id: spec.id,
    title: spec.title ?? spec.candidate.title,
    items,
    metadata: {
      ...(spec.metadata ?? {}),
      lemonpressSequence: {
        candidateId: spec.candidate.candidate_id,
        sequenceId: spec.candidate.sequence_id,
        sequenceSha256: spec.candidate.sequence_sha256,
        status: spec.candidate.status,
        authority: spec.candidate.authority,
        laws: HANDOFF_LAWS,
      },
    },
  });

  const slots = spec.candidate.slots.map((occurrence) => ({
    slot: occurrence.slot,
    sourceRef: occurrence.source_ref,
    cardId: spec.candidate.sequence_id + ":slot:" + occurrence.slot,
  }));
  const receiptCore = {
    sequenceCandidateId: spec.candidate.candidate_id,
    sequenceId: spec.candidate.sequence_id,
    sequenceSha256: spec.candidate.sequence_sha256,
    deckId: pressed.deck.id,
    pagePlaylistPressReceiptId: pressed.receipt.id,
    slots,
  };
  const handoffReceipt: LemonpressSequenceHandoffReceipt = {
    schema: "playdeck/lemonpress-sequence-handoff/v0",
    id: "lemonpress-sequence-handoff:" + sha256(canonical(receiptCore)),
    ...receiptCore,
    laws: [...HANDOFF_LAWS],
    stop: "This handoff proves verified sequence identity plus exact Playdeck asset/card binding only. It creates no admission, publication, performance, or witnessed-history authority.",
  };

  return {...pressed, handoffReceipt};
};
