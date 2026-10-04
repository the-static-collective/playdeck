import assert from "node:assert/strict";
import {createHash} from "node:crypto";
import {readFileSync} from "node:fs";
import {fileURLToPath} from "node:url";
import type {CompositionPlan, WorldRule} from "@playdeck/core";
import {projectReceipt} from "@playdeck/receipts";
import {
  FRANKEN_SOURCE_PINS,
  bindFrankenMediaToPlan,
  compileFrankenContext,
  decoratePlanForFranken,
  expectedFrankenMedia,
  keepFrankenProposal,
  patchWorldForFranken,
  proposeFrankenFamily,
} from "./frankenStudio";
import {assertFrankenMediaBindings} from "./commitServer";

const fixtureRoot = fileURLToPath(
  new URL("../../../examples/franken-studio-011/", import.meta.url),
);
const fixtureDigest = (name: string) =>
  createHash("sha256")
    .update(readFileSync(`${fixtureRoot}/${name}`))
    .digest("hex");
const fixtureTimePacket = JSON.parse(
  readFileSync(
    `${fixtureRoot}/03-time-slice.packet.json`,
    "utf8",
  ),
) as {artifact: {output_sha256: string}};
const fixtureMemoryPacket = JSON.parse(
  readFileSync(
    `${fixtureRoot}/04-memory-feedback.packet.json`,
    "utf8",
  ),
) as {artifact: {output_sha256: string}};
assert.equal(
  fixtureDigest("franken-time-slice.png"),
  fixtureTimePacket.artifact.output_sha256,
);
assert.equal(
  fixtureDigest("franken-memory-feedback.mp4"),
  fixtureMemoryPacket.artifact.output_sha256,
);

const proofTimeAsset = {
  name: "time-slice.png",
  mime: "image/png",
  base64: Buffer.from("proof-time-slice-bytes").toString("base64"),
};
const proofMemoryAsset = {
  name: "memory-feedback.mp4",
  mime: "video/mp4",
  base64: Buffer.from("proof-memory-feedback-bytes").toString("base64"),
};
const assetSha256 = (asset: {base64: string}) =>
  createHash("sha256")
    .update(Buffer.from(asset.base64, "base64"))
    .digest("hex");

const listeningEye = {
  schema: "haunted-toaster/listening-eye/v0",
  authority: "influence-only",
  analysisHash: "a".repeat(64),
  album: {trackIndex: 2, trackCount: 7},
  summary: {meanEnergy: 0.52},
  lenses: [
    ["landscape", "Landscape"],
    ["architecture", "Architecture"],
    ["organism", "Organism"],
    ["sigil", "Sigil / Type"],
    ["weather", "Weather / Particles"],
    ["dimensional-space", "Dimensional Space"],
  ].map(([id, name], index) => ({
    id,
    name,
    pressures: {
      motion: 0.2 + index * 0.1,
      density: 0.3 + index * 0.08,
      contrast: 0.4 + index * 0.06,
      persistence: 0.5,
      memory: 0.35 + index * 0.07,
      foreshadow: 0.7 - index * 0.05,
      arrival: 0.2 + index * 0.08,
    },
  })),
  listeningEyeSha256: "b".repeat(64),
};

const timeSlice = {
  schema: "haunted-blender/time-slice-receipt/v0",
  status: "scoped_complete",
  source_video_sha256: "c".repeat(64),
  sample_fps: 8,
  strips: Array.from({length: 32}, (_, index) => ({
    sample_index: index,
  })),
  output_sha256: assetSha256(proofTimeAsset),
  distribution_authorized: false,
};

const observer = {
  schema: "haunted-blender/observer-local-projection/v0",
  observer_id: "eye-a",
  observer_position: "threshold",
  world_sha256: "e".repeat(64),
  beat: 2,
  environment_response: [
    {fact_id: "door", mode: "present_to_eye"},
    {fact_id: "figure", mode: "memory_residue"},
  ],
  projection_sha256: "f".repeat(64),
};

const memoryFeedback = {
  schema: "haunted-blender/memory-feedback-receipt/v0",
  status: "scoped_complete",
  observer_id: "eye-a",
  world_sha256: "e".repeat(64),
  residue_fact_ids: ["figure"],
  memory_statistics: {
    figure: {captured_frames: 5, residue_frames: 8},
  },
  output_sha256: assetSha256(proofMemoryAsset),
  distribution_authorized: false,
};

const dogram = {
  schema: "dogram.listener-delta-receipt/v0",
  specimen: "LISTENER-DELTA-001",
  status: "OK",
  cohort: {
    classification: "MEASURED_RESPONSE_CHANGE",
    changed_listener_count: 2,
  },
  residuals: ["audio_change_causality_not_established"],
  laws: ["DELTA != VALUE"],
  receipt_hash: `sha256:${"2".repeat(64)}`,
};

const packets = [
  {producer: FRANKEN_SOURCE_PINS.listeningEye, artifact: listeningEye},
  {producer: FRANKEN_SOURCE_PINS.timeSlice, artifact: timeSlice},
  {producer: FRANKEN_SOURCE_PINS.observer, artifact: observer},
  {
    producer: FRANKEN_SOURCE_PINS.memoryFeedback,
    artifact: memoryFeedback,
  },
  {producer: FRANKEN_SOURCE_PINS.dogram, artifact: dogram},
];

const first = compileFrankenContext(packets);
const second = compileFrankenContext(packets);
assert.deepEqual(first, second);
assert.equal(first.influences.length, 2);
assert.equal(first.evidence.length, 2);
assert.equal(first.measurements.length, 1);
assert.equal(first.measurements[0].authorityClass, "measurement-only");

const family = proposeFrankenFamily(first);
assert.equal(family.length, 6);
assert.equal(new Set(family.map((proposal) => proposal.lensId)).size, 6);

const dimensional = family.find(
  (proposal) => proposal.lensId === "dimensional-space",
);
assert.ok(dimensional);
assert.ok(
  dimensional.cartridges.some(
    (cartridge) => cartridge.role === "observer-presentation",
  ),
);
assert.ok(
  dimensional.cartridges.some(
    (cartridge) => cartridge.role === "time-slice-material",
  ),
);
assert.ok(
  dimensional.cartridges.some(
    (cartridge) => cartridge.role === "memory-feedback-material",
  ),
);
assert.ok(
  !dimensional.cartridges.some(
    (cartridge) => cartridge.role === "measurement",
  ),
);

const continuation = keepFrankenProposal(first, dimensional.id);
assert.equal(
  continuation.authorityClass,
  "continuation-permission",
);

const world: WorldRule = {
  schemaVersion: "0.1",
  id: "proof-world",
  physical: "postcard",
  surface: "darkroom",
  transition: "teletext",
};

const patchedWorld = patchWorldForFranken(world, continuation);
assert.equal(patchedWorld.transition, "room-fold");
assert.equal(patchedWorld.awakening, "portal");

const basePlan: CompositionPlan = {
  schemaVersion: "0.1",
  id: "proof-plan",
  deckId: "proof-deck",
  trackId: "proof-track",
  worldRuleId: world.id,
  duration: 40,
  fps: 24,
  width: 1280,
  height: 720,
  gates: [
    {id: "g0", at: 0, kind: "intro"},
    {id: "g1", at: 10, kind: "verse"},
    {id: "g2", at: 20, kind: "breakdown"},
    {id: "g3", at: 30, kind: "outro"},
  ],
  events: [
    {id: "e0", at: 0, type: "arrive", cards: ["c1"]},
    {id: "e1", at: 10, duration: 10, type: "drift", cards: ["c1"]},
    {
      id: "e2",
      at: 20,
      duration: 10,
      type: "contact-sheet",
      cards: ["c1", "c2"],
    },
    {
      id: "e3",
      at: 30,
      duration: 10,
      type: "residue",
      cards: ["c2"],
    },
  ],
  renderHints: {
    preferredRenderer: "remotion",
    deterministic: true,
    notes: ["base"],
  },
};

const decoratedA = decoratePlanForFranken(
  basePlan,
  continuation,
);
const decoratedB = decoratePlanForFranken(
  basePlan,
  continuation,
);
assert.deepEqual(decoratedA, decoratedB);
assert.notEqual(decoratedA.id, basePlan.id);
assert.equal(decoratedA.events[1].type, "hinge");
assert.equal(decoratedA.events[2].type, "stack");

const frankenBreakdown = decoratedA.events[2].params?.franken as
  | Record<string, unknown>
  | undefined;
const frankenOutro = decoratedA.events[3].params?.franken as
  | Record<string, unknown>
  | undefined;
assert.equal(
  typeof frankenBreakdown?.timeSliceCapsuleId,
  "string",
);
assert.equal(
  typeof frankenOutro?.memoryCapsuleId,
  "string",
);
assert.ok(
  !JSON.stringify(decoratedA.events).includes(
    "MEASURED_RESPONSE_CHANGE",
  ),
);
assert.ok(
  !JSON.stringify(continuation.proposal).includes(
    "MEASURED_RESPONSE_CHANGE",
  ),
);
const frankenProvenance = decoratedA.metadata?.studioFranken as
  | Record<string, unknown>
  | undefined;
assert.ok(
  JSON.stringify(frankenProvenance?.sourceCapsules).includes(
    "MEASURED_RESPONSE_CHANGE",
  ),
);

const expectedMedia = expectedFrankenMedia(first);
assert.equal(expectedMedia.length, 2);
const mediaBindings = Object.fromEntries(
  expectedMedia.map((item) => [
    item.capsuleId,
    `asset://franken/${item.capsuleId}`,
  ]),
);
const mediaPlanA = bindFrankenMediaToPlan(
  decoratedA,
  mediaBindings,
);
const mediaPlanB = bindFrankenMediaToPlan(
  decoratedA,
  mediaBindings,
);
assert.deepEqual(mediaPlanA, mediaPlanB);

const proofAssets = Object.fromEntries(
  expectedMedia.map((item) => [
    mediaBindings[item.capsuleId],
    item.role === "time-slice-material"
      ? proofTimeAsset
      : proofMemoryAsset,
  ]),
);
assert.doesNotThrow(() =>
  assertFrankenMediaBindings(mediaPlanA, proofAssets),
);
const firstLogical = mediaBindings[expectedMedia[0].capsuleId];
assert.throws(
  () =>
    assertFrankenMediaBindings(mediaPlanA, {
      ...proofAssets,
      [firstLogical]: {
        ...proofAssets[firstLogical],
        base64: Buffer.from("tampered-bytes").toString("base64"),
      },
    }),
  /SHA-256 mismatch/,
);
const injected = mediaPlanA.events.filter(
  (event) => event.params?.frankenMediaAdapter === true,
);
assert.equal(injected.length, 3);
assert.ok(
  injected.some(
    (event) =>
      event.type === "freeze" &&
      typeof event.params?.freezeSource === "string",
  ),
);
assert.ok(
  injected.some(
    (event) =>
      event.type === "awaken" &&
      typeof event.params?.videoSource === "string",
  ),
);
assert.ok(
  injected.every(
    (event) =>
      event.params?.externalMaterial === true &&
      event.params?.newCardId === undefined,
  ),
);

const projected = projectReceipt(
  mediaPlanA,
  "franken-proof-receipt",
);
const receiptFranken = projected.metadata?.studioFranken as
  | Record<string, unknown>
  | undefined;
const receiptMedia = projected.metadata?.studioFrankenMedia as
  | Record<string, unknown>
  | undefined;
assert.ok(receiptFranken);
assert.ok(receiptMedia);
assert.equal(
  Array.isArray(receiptFranken.sourceCapsules)
    ? receiptFranken.sourceCapsules.length
    : 0,
  5,
);
assert.equal(
  Array.isArray(receiptMedia.bindings)
    ? receiptMedia.bindings.length
    : 0,
  2,
);
assert.equal(
  Array.isArray(receiptMedia.injectedEventIds)
    ? receiptMedia.injectedEventIds.length
    : 0,
  3,
);

assert.throws(
  () =>
    compileFrankenContext([
      {
        producer: {
          ...FRANKEN_SOURCE_PINS.listeningEye,
          sha: "0".repeat(40),
        },
        artifact: listeningEye,
      },
    ]),
  /producer pin/,
);

assert.throws(
  () =>
    compileFrankenContext([
      {
        producer: FRANKEN_SOURCE_PINS.listeningEye,
        artifact: {
          ...listeningEye,
          authority: "render-authority",
        },
      },
    ]),
  /influence-only/,
);

console.log(
  JSON.stringify(
    {
      ok: true,
      contextId: first.id,
      proposals: family.map((proposal) => ({
        lens: proposal.lensId,
        cartridges: proposal.cartridges.map(
          (cartridge) => cartridge.role,
        ),
      })),
      kept: continuation.id,
      planId: decoratedA.id,
      measurementAuthority:
        first.measurements[0].authorityClass,
    },
    null,
    2,
  ),
);
