import {createHash} from "node:crypto";
import {mkdirSync, readFileSync, rmSync, writeFileSync} from "node:fs";
import {join} from "node:path";
import {fileURLToPath} from "node:url";
import {pressLemonpressSequence} from "./pressLemonpressSequence";
import type {
  LemonpressSequenceCandidate,
  LemonpressSequencePressSpec,
} from "./pressLemonpressSequence";

const sha256 = (value: Buffer) => createHash("sha256").update(value).digest("hex");
const repoRoot = fileURLToPath(new URL("../../../", import.meta.url));
const fixturePath = join(repoRoot, "examples/lemonpress-sequence-001/candidate.json");
const root = join(repoRoot, "out/lemonpress-sequence-handoff-001");
const inputs = join(root, "inputs");

rmSync(root, {recursive: true, force: true});
mkdirSync(inputs, {recursive: true});

const candidate = JSON.parse(readFileSync(fixturePath, "utf8")) as LemonpressSequenceCandidate;
const sourceRefs = candidate.parents.map((parent) => parent.parent_id);
const files = sourceRefs.map((_, index) => join(inputs, String(index + 1).padStart(2, "0") + ".png"));
files.forEach((file, index) => writeFileSync(file, Buffer.from("lemonpress-sequence-source-" + (index + 1) + "\n")));
const hashes = files.map((file) => sha256(readFileSync(file)));

const bindings: LemonpressSequencePressSpec["bindings"] = {
  [sourceRefs[0]]: {file: files[0], kind: "original", authority: "source", declaredSha256: hashes[0]},
  [sourceRefs[1]]: {file: files[1], kind: "original", authority: "source", declaredSha256: hashes[1]},
  [sourceRefs[2]]: {file: files[2], kind: "original", authority: "source", declaredSha256: hashes[2]},
  [sourceRefs[3]]: {
    file: files[3],
    kind: "remix",
    authority: "candidate",
    declaredSha256: hashes[3],
    candidateId: "manga-remix:home-grows-open-001",
    parentIds: sourceRefs.slice(0, 3),
  },
};

const spec: LemonpressSequencePressSpec = {
  id: "home-grows-open-playdeck-001",
  candidate,
  bindings,
};

const first = pressLemonpressSequence(spec);
const second = pressLemonpressSequence(spec);
if (JSON.stringify(first) !== JSON.stringify(second)) {
  throw new Error("LemonPRESS sequence handoff must replay deterministically.");
}

const expectedOrder = candidate.slots.map((slot) => candidate.sequence_id + ":slot:" + slot.slot);
if (JSON.stringify(first.deck.order) !== JSON.stringify(expectedOrder)) {
  throw new Error("Playdeck deck order did not preserve LemonPRESS slots exactly.");
}

if (first.handoffReceipt.sequenceCandidateId !== candidate.candidate_id ||
    first.handoffReceipt.sequenceSha256 !== candidate.sequence_sha256 ||
    first.handoffReceipt.pagePlaylistPressReceiptId !== first.receipt.id) {
  throw new Error("Crossing receipt lost LemonPRESS or Page Playlist identity.");
}

const remixCard = first.deck.cards[3];
const sequenceMeta = remixCard.metadata?.lemonpressSequence as Record<string, unknown> | undefined;
const pressMeta = remixCard.metadata?.pagePlaylistPress as Record<string, unknown> | undefined;
if (sequenceMeta?.sequenceAuthority !== "candidate" ||
    sequenceMeta?.occurrenceOnly !== true ||
    pressMeta?.authority !== "candidate") {
  throw new Error("Candidate authority was flattened or upgraded during sequence handoff.");
}

let tamperRefused = false;
try {
  const tampered = structuredClone(candidate);
  [tampered.slots[0], tampered.slots[1]] = [tampered.slots[1], tampered.slots[0]];
  pressLemonpressSequence({...spec, candidate: tampered});
} catch (error) {
  tamperRefused = String(error).includes("sequence hash mismatch");
}
if (!tamperRefused) throw new Error("Reordered forged candidate must refuse.");

let partialRefused = false;
try {
  const partial = structuredClone(candidate) as any;
  partial.slots[0].selection = {kind: "panel", panel_id: "p3"};
  pressLemonpressSequence({...spec, candidate: partial});
} catch (error) {
  partialRefused = String(error).includes("refuses unresolved panel selection");
}
if (!partialRefused) throw new Error("Unresolved panel selector must refuse whole-page handoff.");

let missingBindingRefused = false;
try {
  const missing = {...bindings};
  delete missing[sourceRefs[1]];
  pressLemonpressSequence({...spec, bindings: missing});
} catch (error) {
  missingBindingRefused = String(error).includes("Missing Playdeck asset binding");
}
if (!missingBindingRefused) throw new Error("Missing source binding must refuse.");

let candidateUpgradeRefused = false;
try {
  pressLemonpressSequence({
    ...spec,
    bindings: {
      ...bindings,
      [sourceRefs[3]]: {...bindings[sourceRefs[3]], authority: "admitted"},
    },
  });
} catch (error) {
  candidateUpgradeRefused = String(error).includes("must remain an explicitly bound candidate remix");
}
if (!candidateUpgradeRefused) throw new Error("Candidate source authority upgrade must refuse.");

let byteMismatchRefused = false;
try {
  pressLemonpressSequence({
    ...spec,
    bindings: {
      ...bindings,
      [sourceRefs[0]]: {...bindings[sourceRefs[0]], declaredSha256: "0".repeat(64)},
    },
  });
} catch (error) {
  byteMismatchRefused = String(error).includes("hash mismatch");
}
if (!byteMismatchRefused) throw new Error("Wrong source byte pin must refuse.");

const repeatCandidate = structuredClone(candidate);
repeatCandidate.sequence_id = "home-grows-open-sequence-repeat-test";
repeatCandidate.title = "HOME GROWS OPEN — Repeat Test";
repeatCandidate.slots.push({slot: 5, source_ref: sourceRefs[0], selection: {kind: "whole"}});
repeatCandidate.sequence_sha256 = "5f6ea8c98aebc7a838370a4bc294c4371bf78cea028b58d42c50786c2c5a574c";
repeatCandidate.candidate_id = "manga-sequence:dd9b2e3a0ace7441ae0311f47fbed44618cf510a2b6ee52fc5dec7d68281b132";
const repeated = pressLemonpressSequence({...spec, id: "repeat-deck", candidate: repeatCandidate});
if (repeated.deck.cards.length !== 5 || Object.keys(repeated.assetSources).length !== 4) {
  throw new Error("Repeated slot must create a new card occurrence without minting new source bytes.");
}
const repeatedSource = repeated.deck.cards[0].source;
if (repeated.deck.cards[4].source !== repeatedSource || repeated.deck.cards[4].id === repeated.deck.cards[0].id) {
  throw new Error("Repeat semantics collapsed slot identity or source identity.");
}

writeFileSync(join(root, "deck.json"), JSON.stringify(first.deck, null, 2) + "\n");
writeFileSync(join(root, "press.receipt.json"), JSON.stringify(first.receipt, null, 2) + "\n");
writeFileSync(join(root, "handoff.receipt.json"), JSON.stringify(first.handoffReceipt, null, 2) + "\n");

console.log(JSON.stringify({
  sequenceCandidateId: candidate.candidate_id,
  deckId: first.deck.id,
  cards: first.deck.cards.length,
  handoffReceiptId: first.handoffReceipt.id,
  pagePlaylistPressReceiptId: first.receipt.id,
  tamperRefused,
  partialRefused,
  missingBindingRefused,
  candidateUpgradeRefused,
  byteMismatchRefused,
  repeatCards: repeated.deck.cards.length,
  repeatAssets: Object.keys(repeated.assetSources).length,
}));
