import assert from "node:assert/strict";
import type {CompositionPlan, WorldRule} from "@playdeck/core";
import {
  FRANKEN_SOURCE_PINS,
  compileFrankenContext,
  decoratePlanForFranken,
  keepFrankenProposal,
  patchWorldForFranken,
  proposeFrankenFamily,
} from "./frankenStudio";

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
  output_sha256: "d".repeat(64),
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
  output_sha256: "1".repeat(64),
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
  !JSON.stringify(decoratedA).includes(
    "MEASURED_RESPONSE_CHANGE",
  ),
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
