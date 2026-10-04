import type {
  CompositionEvent,
  CompositionPlan,
  WorldRule,
} from "@playdeck/core";

export type FrankenProducerPin = {
  repo: string;
  branch: string;
  sha: string;
};

export type FrankenSourceEnvelope = {
  producer: FrankenProducerPin;
  artifact: Record<string, unknown>;
};

export type FrankenAuthorityClass =
  | "evidence"
  | "measurement-only"
  | "influence-only"
  | "proposal"
  | "continuation-permission";

export type FrankenCapsule = {
  schema: "playdeck/franken-capsule/v0";
  id: string;
  authorityClass: Exclude<
    FrankenAuthorityClass,
    "proposal" | "continuation-permission"
  >;
  role:
    | "art-direction"
    | "time-slice-material"
    | "observer-presentation"
    | "memory-feedback-material"
    | "measurement";
  sourceSchema: string;
  sourceIdentity: string;
  producer: FrankenProducerPin;
  summary: Record<string, unknown>;
  nonclaims: string[];
};

export type FrankenContext = {
  schema: "playdeck/franken-context/v0";
  id: string;
  influences: FrankenCapsule[];
  evidence: FrankenCapsule[];
  measurements: FrankenCapsule[];
  laws: string[];
};

export type FrankenCartridge = {
  role: FrankenCapsule["role"];
  capsuleId: string;
  mode: string;
};

export type FrankenCinematicGrammar = {
  cameraMode:
    | "survey"
    | "hinge-orbit"
    | "pulse-dolly"
    | "snap-frame"
    | "wind-eye"
    | "parallax-orbit";
  framing:
    | "horizon-wide"
    | "threshold-medium"
    | "breathing-close"
    | "graphic-insert"
    | "open-field"
    | "impossible-frame";
  topology:
    | "terrain-bands"
    | "corridor"
    | "cellular-cluster"
    | "glyph-grid"
    | "particle-field"
    | "nested-planes";
  cutRhythm:
    | "long-breath"
    | "measured-cuts"
    | "elastic-pulse"
    | "syncopated-cuts"
    | "gust-bursts"
    | "folded-time";
  relationMode:
    | "parallel-drift"
    | "axial-lock"
    | "attraction-repulsion"
    | "stroke-link"
    | "swarm"
    | "orbit-crossing";
  memoryMode:
    | "erosion"
    | "room-trace"
    | "scar-recall"
    | "overwrite-ghost"
    | "wake"
    | "nested-afterimage";
};

export type FrankenProposal = {
  schema: "playdeck/franken-proposal/v0";
  id: string;
  slot: number;
  authorityClass: "proposal";
  contextId: string;
  lensId:
    | "landscape"
    | "architecture"
    | "organism"
    | "sigil"
    | "weather"
    | "dimensional-space";
  label: string;
  invitation: string;
  pressures: Record<string, number>;
  worldPatch: Partial<
    Pick<
      WorldRule,
      "physical" | "surface" | "transition" | "awakening"
    >
  >;
  cartridges: FrankenCartridge[];
  cinematic: FrankenCinematicGrammar;
  refused: string[];
};

export type FrankenContinuation = {
  schema: "playdeck/franken-continuation/v0";
  id: string;
  authorityClass: "continuation-permission";
  contextId: string;
  proposal: FrankenProposal;
  evidenceCapsuleIds: string[];
  measurementCapsuleIds: string[];
  sourceCapsules: FrankenCapsule[];
  laws: string[];
};

export const FRANKEN_SOURCE_PINS = {
  listeningEye: {
    repo: "the-static-collective/the-haunted-toaster",
    branch: "feature/listening-eye-v0",
    sha: "fe185abbbfa9d56e613f953f7c92531853a80fb3",
  },
  timeSlice: {
    repo: "the-static-collective/the-haunted-blender",
    branch: "experimental/time-slice-recajgger-001",
    sha: "60c8746215f23aaa3e06f730fa44ecb0df341210",
  },
  observer: {
    repo: "the-static-collective/the-haunted-blender",
    branch: "experimental/observer-local-vision-001",
    sha: "9beec9cce02f9c595386fc39fd7fb79a890434da",
  },
  memoryFeedback: {
    repo: "the-static-collective/the-haunted-blender",
    branch: "experimental/memory-feedback-001",
    sha: "6aca64fdeeb458653e20558c4b23fa89ec622ba7",
  },
  dogram: {
    repo: "the-static-collective/Dogram",
    branch: "main",
    sha: "551b5f9df18f17ec69b452ddcdff01718e0ff771",
  },
} as const satisfies Record<string, FrankenProducerPin>;

export const FRANKEN_SCHEMAS = {
  listeningEye: "haunted-toaster/listening-eye/v0",
  timeSlice: "haunted-blender/time-slice-receipt/v0",
  observer: "haunted-blender/observer-local-projection/v0",
  memoryFeedback: "haunted-blender/memory-feedback-receipt/v0",
  dogram: "dogram.listener-delta-receipt/v0",
} as const;

const LENS_ORDER: FrankenProposal["lensId"][] = [
  "landscape",
  "architecture",
  "organism",
  "sigil",
  "weather",
  "dimensional-space",
];

const WORLD_PATCHES: Record<
  FrankenProposal["lensId"],
  FrankenProposal["worldPatch"]
> = {
  landscape: {
    physical: "postcard",
    surface: "field-notes",
    transition: "slow-assembly",
  },
  architecture: {
    physical: "contact-sheet",
    surface: "blueprint",
    transition: "held-threshold",
  },
  organism: {
    physical: "flipbook",
    surface: "darkroom",
    transition: "breathing-fold",
    awakening: "portal",
  },
  sigil: {
    physical: "comic-page",
    surface: "teletext",
    transition: "glyph-break",
  },
  weather: {
    physical: "polaroid",
    surface: "vhs-machine",
    transition: "particle-drift",
    awakening: "doorway",
  },
  "dimensional-space": {
    physical: "field-notes",
    surface: "stained-glass",
    transition: "room-fold",
    awakening: "portal",
  },
};

const CINEMATIC_GRAMMARS: Record<
  FrankenProposal["lensId"],
  FrankenCinematicGrammar
> = {
  landscape: {
    cameraMode: "survey",
    framing: "horizon-wide",
    topology: "terrain-bands",
    cutRhythm: "long-breath",
    relationMode: "parallel-drift",
    memoryMode: "erosion",
  },
  architecture: {
    cameraMode: "hinge-orbit",
    framing: "threshold-medium",
    topology: "corridor",
    cutRhythm: "measured-cuts",
    relationMode: "axial-lock",
    memoryMode: "room-trace",
  },
  organism: {
    cameraMode: "pulse-dolly",
    framing: "breathing-close",
    topology: "cellular-cluster",
    cutRhythm: "elastic-pulse",
    relationMode: "attraction-repulsion",
    memoryMode: "scar-recall",
  },
  sigil: {
    cameraMode: "snap-frame",
    framing: "graphic-insert",
    topology: "glyph-grid",
    cutRhythm: "syncopated-cuts",
    relationMode: "stroke-link",
    memoryMode: "overwrite-ghost",
  },
  weather: {
    cameraMode: "wind-eye",
    framing: "open-field",
    topology: "particle-field",
    cutRhythm: "gust-bursts",
    relationMode: "swarm",
    memoryMode: "wake",
  },
  "dimensional-space": {
    cameraMode: "parallax-orbit",
    framing: "impossible-frame",
    topology: "nested-planes",
    cutRhythm: "folded-time",
    relationMode: "orbit-crossing",
    memoryMode: "nested-afterimage",
  },
};

const isRecord = (
  value: unknown,
): value is Record<string, unknown> =>
  Boolean(value) &&
  typeof value === "object" &&
  !Array.isArray(value);

const requireRecord = (
  value: unknown,
  label: string,
): Record<string, unknown> => {
  if (!isRecord(value)) {
    throw new Error(`${label} must be an object.`);
  }
  return value;
};

const requireString = (
  value: Record<string, unknown>,
  field: string,
  label: string,
): string => {
  const result = value[field];
  if (typeof result !== "string" || !result) {
    throw new Error(`${label}.${field} must be a non-empty string.`);
  }
  return result;
};

const stable = (value: unknown): string => {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map(stable).join(",")}]`;
  }
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stable(record[key])}`)
    .join(",")}}`;
};

const hashText = (value: string): string => {
  let result = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    result ^= value.charCodeAt(index);
    result = Math.imul(result, 16777619);
  }
  return (result >>> 0).toString(16).padStart(8, "0");
};

const samePin = (
  actual: FrankenProducerPin,
  expected: FrankenProducerPin,
): boolean =>
  actual.repo === expected.repo &&
  actual.branch === expected.branch &&
  actual.sha === expected.sha;

const requirePin = (
  actual: FrankenProducerPin,
  expected: FrankenProducerPin,
  label: string,
): void => {
  if (!samePin(actual, expected)) {
    throw new Error(
      `${label} producer pin does not match the inspected source head.`,
    );
  }
};

const makeCapsule = ({
  role,
  authorityClass,
  source,
  sourceIdentity,
  summary,
  nonclaims,
}: {
  role: FrankenCapsule["role"];
  authorityClass: FrankenCapsule["authorityClass"];
  source: FrankenSourceEnvelope;
  sourceIdentity: string;
  summary: Record<string, unknown>;
  nonclaims: string[];
}): FrankenCapsule => ({
  schema: "playdeck/franken-capsule/v0",
  id: `franken-${role}-${hashText(
    `${sourceIdentity}:${source.producer.sha}`,
  )}`,
  authorityClass,
  role,
  sourceSchema: String(source.artifact.schema),
  sourceIdentity,
  producer: {...source.producer},
  summary,
  nonclaims,
});

const adaptListeningEye = (
  source: FrankenSourceEnvelope,
): FrankenCapsule => {
  requirePin(
    source.producer,
    FRANKEN_SOURCE_PINS.listeningEye,
    "Listening Eye",
  );
  const artifact = source.artifact;
  if (artifact.schema !== FRANKEN_SCHEMAS.listeningEye) {
    throw new Error("Unsupported Listening Eye schema.");
  }
  if (artifact.authority !== "influence-only") {
    throw new Error("Listening Eye must remain influence-only.");
  }
  const lenses = artifact.lenses;
  if (!Array.isArray(lenses) || lenses.length !== 6) {
    throw new Error("Listening Eye requires exactly six lenses.");
  }

  const normalized = lenses.map((raw, index) => {
    const lens = requireRecord(raw, `Listening Eye lens ${index + 1}`);
    if (lens.id !== LENS_ORDER[index]) {
      throw new Error("Listening Eye lens order does not match v0.");
    }
    const pressures = requireRecord(
      lens.pressures,
      `Listening Eye ${String(lens.id)} pressures`,
    );
    const normalizedPressures: Record<string, number> = {};
    for (const axis of [
      "motion",
      "density",
      "contrast",
      "persistence",
      "memory",
      "foreshadow",
      "arrival",
    ]) {
      const value = pressures[axis];
      if (
        typeof value !== "number" ||
        !Number.isFinite(value) ||
        value < 0 ||
        value > 1
      ) {
        throw new Error(
          `Listening Eye pressure "${axis}" must be between 0 and 1.`,
        );
      }
      normalizedPressures[axis] = value;
    }
    return {
      id: lens.id,
      name:
        typeof lens.name === "string"
          ? lens.name
          : String(lens.id),
      pressures: normalizedPressures,
    };
  });

  const identity = requireString(
    artifact,
    "listeningEyeSha256",
    "Listening Eye",
  );

  return makeCapsule({
    role: "art-direction",
    authorityClass: "influence-only",
    source,
    sourceIdentity: identity,
    summary: {
      analysisHash: artifact.analysisHash,
      album: artifact.album,
      summary: artifact.summary,
      lenses: normalized,
    },
    nonclaims: [
      "Selection pressure only.",
      "No KEEP, render, receipt, or publication authority.",
    ],
  });
};

const adaptTimeSlice = (
  source: FrankenSourceEnvelope,
): FrankenCapsule => {
  requirePin(
    source.producer,
    FRANKEN_SOURCE_PINS.timeSlice,
    "Time Slice",
  );
  const artifact = source.artifact;
  if (
    artifact.schema !== FRANKEN_SCHEMAS.timeSlice ||
    artifact.status !== "scoped_complete"
  ) {
    throw new Error("Time Slice receipt is not scoped-complete v0.");
  }
  if (artifact.distribution_authorized !== false) {
    throw new Error(
      "Time Slice packet may not import distribution authority.",
    );
  }
  const identity = requireString(
    artifact,
    "output_sha256",
    "Time Slice",
  );
  if (!Array.isArray(artifact.strips)) {
    throw new Error("Time Slice strips are missing.");
  }

  return makeCapsule({
    role: "time-slice-material",
    authorityClass: "evidence",
    source,
    sourceIdentity: identity,
    summary: {
      outputSha256: identity,
      sourceVideoSha256: artifact.source_video_sha256,
      stripCount: artifact.strips.length,
      sampleFps: artifact.sample_fps,
    },
    nonclaims: [
      "The packet proves a derived private artifact, not its presence in this Studio render.",
      "Spatial strips are interpretation, not witnessed occurrence.",
    ],
  });
};

const adaptObserver = (
  source: FrankenSourceEnvelope,
): FrankenCapsule => {
  requirePin(
    source.producer,
    FRANKEN_SOURCE_PINS.observer,
    "Observer Vision",
  );
  const artifact = source.artifact;
  if (artifact.schema !== FRANKEN_SCHEMAS.observer) {
    throw new Error("Unsupported Observer Vision schema.");
  }
  const identity = requireString(
    artifact,
    "projection_sha256",
    "Observer Vision",
  );
  if (!Array.isArray(artifact.environment_response)) {
    throw new Error("Observer Vision environment response is missing.");
  }

  return makeCapsule({
    role: "observer-presentation",
    authorityClass: "influence-only",
    source,
    sourceIdentity: identity,
    summary: {
      observerId: artifact.observer_id,
      observerPosition: artifact.observer_position,
      worldSha256: artifact.world_sha256,
      beat: artifact.beat,
      environmentResponse: artifact.environment_response,
    },
    nonclaims: [
      "Camera visibility changes presentation only.",
      "Memory residue is guidance, not present fact.",
    ],
  });
};

const adaptMemoryFeedback = (
  source: FrankenSourceEnvelope,
): FrankenCapsule => {
  requirePin(
    source.producer,
    FRANKEN_SOURCE_PINS.memoryFeedback,
    "Memory Feedback",
  );
  const artifact = source.artifact;
  if (
    artifact.schema !== FRANKEN_SCHEMAS.memoryFeedback ||
    artifact.status !== "scoped_complete"
  ) {
    throw new Error("Memory Feedback receipt is not scoped-complete v0.");
  }
  if (artifact.distribution_authorized !== false) {
    throw new Error(
      "Memory Feedback packet may not import distribution authority.",
    );
  }
  const identity = requireString(
    artifact,
    "output_sha256",
    "Memory Feedback",
  );

  return makeCapsule({
    role: "memory-feedback-material",
    authorityClass: "evidence",
    source,
    sourceIdentity: identity,
    summary: {
      outputSha256: identity,
      observerId: artifact.observer_id,
      worldSha256: artifact.world_sha256,
      residueFactIds: artifact.residue_fact_ids,
      memoryStatistics: artifact.memory_statistics,
    },
    nonclaims: [
      "Residual pixels are cinematic material, not evidence of current presence.",
      "The derived output carries no scene or publication authority.",
    ],
  });
};

const adaptDogram = (
  source: FrankenSourceEnvelope,
): FrankenCapsule => {
  requirePin(
    source.producer,
    FRANKEN_SOURCE_PINS.dogram,
    "Dogram",
  );
  const artifact = source.artifact;
  if (
    artifact.schema !== FRANKEN_SCHEMAS.dogram ||
    artifact.status !== "OK"
  ) {
    throw new Error("Dogram listener delta is not a valid OK v0 receipt.");
  }
  const identity = requireString(
    artifact,
    "receipt_hash",
    "Dogram",
  );

  return makeCapsule({
    role: "measurement",
    authorityClass: "measurement-only",
    source,
    sourceIdentity: identity,
    summary: {
      specimen: artifact.specimen,
      cohort: artifact.cohort,
      residuals: artifact.residuals,
      laws: artifact.laws,
    },
    nonclaims: [
      "RESPONSE DELTA != PERSON DELTA",
      "RESPONSE DELTA != CAUSAL EFFECT",
      "MEASUREMENT != GRADE",
    ],
  });
};

const schemaOf = (source: FrankenSourceEnvelope): string =>
  typeof source.artifact.schema === "string"
    ? source.artifact.schema
    : "";

export const parseFrankenPacket = (
  text: string,
): FrankenSourceEnvelope => {
  const parsed: unknown = JSON.parse(text);
  const packet = requireRecord(parsed, "Franken packet");
  const producer = requireRecord(
    packet.producer,
    "Franken packet producer",
  );
  const artifact = requireRecord(
    packet.artifact,
    "Franken packet artifact",
  );
  return {
    producer: {
      repo: requireString(producer, "repo", "producer"),
      branch: requireString(producer, "branch", "producer"),
      sha: requireString(producer, "sha", "producer"),
    },
    artifact,
  };
};

export const compileFrankenContext = (
  sources: FrankenSourceEnvelope[],
): FrankenContext => {
  const bySchema = new Map<string, FrankenSourceEnvelope>();
  for (const source of sources) {
    const schema = schemaOf(source);
    if (!Object.values(FRANKEN_SCHEMAS).includes(
      schema as (typeof FRANKEN_SCHEMAS)[keyof typeof FRANKEN_SCHEMAS],
    )) {
      throw new Error(
        `Unsupported Franken packet schema "${schema || "(missing)"}".`,
      );
    }
    if (bySchema.has(schema)) {
      throw new Error(
        `Only one Franken packet per schema is allowed: ${schema}.`,
      );
    }
    bySchema.set(schema, source);
  }

  const listening = bySchema.get(FRANKEN_SCHEMAS.listeningEye);
  if (!listening) {
    throw new Error(
      "Franken composition requires one Haunted Toaster Listening Eye packet.",
    );
  }

  const influences = [adaptListeningEye(listening)];
  const evidence: FrankenCapsule[] = [];
  const measurements: FrankenCapsule[] = [];

  const observer = bySchema.get(FRANKEN_SCHEMAS.observer);
  if (observer) influences.push(adaptObserver(observer));

  const timeSlice = bySchema.get(FRANKEN_SCHEMAS.timeSlice);
  if (timeSlice) evidence.push(adaptTimeSlice(timeSlice));

  const memoryFeedback = bySchema.get(
    FRANKEN_SCHEMAS.memoryFeedback,
  );
  if (memoryFeedback) {
    evidence.push(adaptMemoryFeedback(memoryFeedback));
  }

  const dogram = bySchema.get(FRANKEN_SCHEMAS.dogram);
  if (dogram) measurements.push(adaptDogram(dogram));

  const identity = stable({
    influences: influences.map((item) => item.id),
    evidence: evidence.map((item) => item.id),
    measurements: measurements.map((item) => item.id),
  });

  return {
    schema: "playdeck/franken-context/v0",
    id: `franken-context-${hashText(identity)}`,
    influences,
    evidence,
    measurements,
    laws: [
      "SOURCE != PLAN",
      "PROPOSAL != HISTORY",
      "INFLUENCE != EVIDENCE",
      "MEASUREMENT != GRADE",
      "KEEP = CONTINUATION PERMISSION",
      "DERIVED MATERIAL != PUBLICATION AUTHORITY",
    ],
  };
};

const cartridgesFor = (
  context: FrankenContext,
  lensId: FrankenProposal["lensId"],
): FrankenCartridge[] => {
  const result: FrankenCartridge[] = [];
  const observer = context.influences.find(
    (item) => item.role === "observer-presentation",
  );
  const timeSlice = context.evidence.find(
    (item) => item.role === "time-slice-material",
  );
  const memory = context.evidence.find(
    (item) => item.role === "memory-feedback-material",
  );

  if (observer) {
    result.push({
      role: observer.role,
      capsuleId: observer.id,
      mode:
        lensId === "architecture" ||
        lensId === "dimensional-space"
          ? "observer-eye"
          : "presentation-context",
    });
  }
  if (
    timeSlice &&
    (lensId === "sigil" ||
      lensId === "weather" ||
      lensId === "dimensional-space")
  ) {
    result.push({
      role: timeSlice.role,
      capsuleId: timeSlice.id,
      mode: "bounded-time-image",
    });
  }
  if (
    memory &&
    (lensId === "organism" ||
      lensId === "weather" ||
      lensId === "dimensional-space")
  ) {
    result.push({
      role: memory.role,
      capsuleId: memory.id,
      mode: "bounded-memory-residue",
    });
  }
  return result;
};

export const proposeFrankenFamily = (
  context: FrankenContext,
): FrankenProposal[] => {
  const art = context.influences.find(
    (item) => item.role === "art-direction",
  );
  const rawLenses = art?.summary.lenses;
  if (!Array.isArray(rawLenses) || rawLenses.length !== 6) {
    throw new Error("Franken context is missing six art-direction lenses.");
  }

  return rawLenses.map((raw, index) => {
    const lens = requireRecord(raw, `Franken lens ${index + 1}`);
    const lensId = lens.id as FrankenProposal["lensId"];
    if (lensId !== LENS_ORDER[index]) {
      throw new Error("Franken lens family order changed unexpectedly.");
    }
    const pressures = requireRecord(
      lens.pressures,
      `Franken lens ${lensId} pressures`,
    ) as Record<string, number>;

    return {
      schema: "playdeck/franken-proposal/v0",
      id: `franken-proposal-${index + 1}-${hashText(
        `${context.id}:${lensId}`,
      )}`,
      slot: index + 1,
      authorityClass: "proposal",
      contextId: context.id,
      lensId,
      label:
        typeof lens.name === "string" ? lens.name : lensId,
      invitation: `compose-through-${lensId}`,
      pressures: {...pressures},
      worldPatch: {...WORLD_PATCHES[lensId]},
      cartridges: cartridgesFor(context, lensId),
      cinematic: {...CINEMATIC_GRAMMARS[lensId]},
      refused: [
        "Dogram measurement may not alter proposal selection.",
        "Blender evidence may enable a cartridge but may not become ancestry by itself.",
      ],
    };
  });
};

export const keepFrankenProposal = (
  context: FrankenContext,
  proposalId: string,
): FrankenContinuation => {
  const proposal = proposeFrankenFamily(context).find(
    (candidate) => candidate.id === proposalId,
  );
  if (!proposal) {
    throw new Error(
      `Franken proposal "${proposalId}" does not belong to this context.`,
    );
  }

  return {
    schema: "playdeck/franken-continuation/v0",
    id: `franken-keep-${hashText(
      `${context.id}:${proposal.id}`,
    )}`,
    authorityClass: "continuation-permission",
    contextId: context.id,
    proposal,
    evidenceCapsuleIds: context.evidence.map((item) => item.id),
    measurementCapsuleIds: context.measurements.map(
      (item) => item.id,
    ),
    sourceCapsules: [
      ...context.influences,
      ...context.evidence,
      ...context.measurements,
    ].map((capsule) => ({
      ...capsule,
      producer: {...capsule.producer},
      summary: {...capsule.summary},
      nonclaims: [...capsule.nonclaims],
    })),
    laws: [...context.laws],
  };
};

export const patchWorldForFranken = (
  worldRule: WorldRule,
  continuation: FrankenContinuation,
): WorldRule => ({
  ...worldRule,
  ...continuation.proposal.worldPatch,
  metadata: {
    ...(worldRule.metadata ?? {}),
    studioFranken: {
      schema: "playdeck/franken-world-context/v0",
      continuationId: continuation.id,
      proposalId: continuation.proposal.id,
      authorityClass: continuation.authorityClass,
      lensId: continuation.proposal.lensId,
      cinematic: continuation.proposal.cinematic,
      cartridges: continuation.proposal.cartridges,
    },
  },
});

const rewriteType = (
  type: CompositionEvent["type"],
  lensId: FrankenProposal["lensId"],
): CompositionEvent["type"] => {
  const maps: Record<
    FrankenProposal["lensId"],
    Partial<Record<CompositionEvent["type"], CompositionEvent["type"]>>
  > = {
    landscape: {
      hinge: "drift",
      flip: "drift",
      corrupt: "drift",
    },
    architecture: {
      drift: "hinge",
      fracture: "hinge",
    },
    organism: {
      hinge: "drift",
      flip: "drift",
      "contact-sheet": "fracture",
    },
    sigil: {
      drift: "fracture",
      hinge: "flip",
      assemble: "contact-sheet",
    },
    weather: {
      hinge: "drift",
      flip: "drift",
      "contact-sheet": "fracture",
    },
    "dimensional-space": {
      drift: "hinge",
      "contact-sheet": "stack",
    },
  };
  return maps[lensId][type] ?? type;
};

const clamp01 = (value: number): number =>
  Math.max(0, Math.min(1, value));

export const decoratePlanForFranken = (
  basePlan: CompositionPlan,
  continuation: FrankenContinuation,
): CompositionPlan => {
  if (continuation.authorityClass !== "continuation-permission") {
    throw new Error(
      "Franken plan decoration requires continuation permission.",
    );
  }
  const proposal = continuation.proposal;
  const observer = proposal.cartridges.find(
    (item) => item.role === "observer-presentation",
  );
  const timeSlice = proposal.cartridges.find(
    (item) => item.role === "time-slice-material",
  );
  const memory = proposal.cartridges.find(
    (item) => item.role === "memory-feedback-material",
  );

  const events = basePlan.events.map((event, index) => {
    const nextType = rewriteType(event.type, proposal.lensId);
    const params: Record<string, unknown> = {
      ...(event.params ?? {}),
      franken: {
        schema: "playdeck/franken-event-guidance/v0",
        continuationId: continuation.id,
        proposalId: proposal.id,
        lensId: proposal.lensId,
        lensSlot: proposal.slot,
        sectionIndex: index,
        motionPressure: proposal.pressures.motion ?? 0,
        densityPressure: proposal.pressures.density ?? 0,
        contrastPressure: proposal.pressures.contrast ?? 0,
        persistencePressure: proposal.pressures.persistence ?? 0,
        memoryPressure: proposal.pressures.memory ?? 0,
        cinematic: {
          ...proposal.cinematic,
          shotIndex: index,
          phase: Number(
            (((index + proposal.slot) * 0.173) % 1).toFixed(6),
          ),
          framingScale: Number(
            (0.9 + (proposal.pressures.contrast ?? 0.5) * 0.18).toFixed(6),
          ),
          motionAmplitude: Number(
            (8 + (proposal.pressures.motion ?? 0.5) * 42).toFixed(6),
          ),
          relationStrength: Number(
            (0.25 + (proposal.pressures.density ?? 0.5) * 0.7).toFixed(6),
          ),
          memoryOpacity: Number(
            (0.08 + (proposal.pressures.memory ?? 0.5) * 0.34).toFixed(6),
          ),
        },
        observerCapsuleId: observer?.capsuleId,
        timeSliceCapsuleId:
          timeSlice &&
          (event.type === "contact-sheet" ||
            event.type === "corrupt" ||
            event.type === "custom")
            ? timeSlice.capsuleId
            : undefined,
        memoryCapsuleId:
          memory &&
          (event.type === "residue" ||
            event.type === "drift" ||
            event.type === "hold" ||
            event.type === "custom")
            ? memory.capsuleId
            : undefined,
      },
    };

    if (
      nextType === "assemble" &&
      typeof params.cohesion === "number"
    ) {
      const pressure = proposal.pressures.persistence ?? 0.5;
      params.cohesion = clamp01(
        Number(params.cohesion) *
          (0.65 + pressure * 0.35),
      );
    }

    return {
      ...event,
      type: nextType,
      params,
      because: [
        event.because,
        `Franken KEEP ${proposal.id} composes the ${proposal.lensId} lens through existing deterministic renderer verbs.`,
      ]
        .filter(Boolean)
        .join(" "),
    };
  });

  return {
    ...basePlan,
    id: `${basePlan.id}--franken-${proposal.lensId}-${hashText(
      continuation.id,
    )}`,
    events,
    metadata: {
      ...(basePlan.metadata ?? {}),
      studioFranken: {
        schema: "playdeck/franken-plan-context/v0",
        continuationId: continuation.id,
        contextId: continuation.contextId,
        proposalId: proposal.id,
        authorityClass: continuation.authorityClass,
        lensId: proposal.lensId,
        cinematic: proposal.cinematic,
        cartridges: proposal.cartridges,
        evidenceCapsuleIds: continuation.evidenceCapsuleIds,
        measurementCapsuleIds: continuation.measurementCapsuleIds,
        sourceCapsules: continuation.sourceCapsules,
        laws: continuation.laws,
      },
    },
    renderHints: {
      ...(basePlan.renderHints ?? {}),
      deterministic: true,
      notes: [
        ...(basePlan.renderHints?.notes ?? []),
        `Franken continuation ${continuation.id} is composition permission, not a receipt.`,
        "Blender cartridge references are provenance unless their actual media bytes are separately bound.",
        "Dogram measurements remain visible context and cannot choose or rewrite this plan.",
      ],
    },
  };
};

export type FrankenMediaExpectation = {
  capsuleId: string;
  role: "time-slice-material" | "memory-feedback-material";
  sha256: string;
};

export const expectedFrankenMedia = (
  context: FrankenContext,
): FrankenMediaExpectation[] =>
  context.evidence.flatMap((capsule) => {
    if (
      capsule.role !== "time-slice-material" &&
      capsule.role !== "memory-feedback-material"
    ) {
      return [];
    }
    const digest = capsule.summary.outputSha256;
    if (typeof digest !== "string" || !digest) {
      return [];
    }
    return [{
      capsuleId: capsule.id,
      role: capsule.role,
      sha256: digest,
    }];
  });

export const bindFrankenMediaToPlan = (
  plan: CompositionPlan,
  bindings: Record<string, string>,
): CompositionPlan => {
  const baseEvents = plan.events.filter(
    (event) =>
      !(
        event.params?.frankenMediaAdapter === true &&
        typeof event.params?.frankenCapsuleId === "string"
      ),
  );
  const added: CompositionEvent[] = [];

  for (const event of baseEvents) {
    const guidance = event.params?.franken;
    if (!isRecord(guidance)) continue;

    const cardId = event.cards?.[0];
    if (!cardId) continue;

    const timeSliceCapsuleId =
      typeof guidance.timeSliceCapsuleId === "string"
        ? guidance.timeSliceCapsuleId
        : undefined;
    const timeSliceSource = timeSliceCapsuleId
      ? bindings[timeSliceCapsuleId]
      : undefined;

    if (timeSliceCapsuleId && timeSliceSource) {
      added.push({
        id: `${event.id}--franken-time-slice`,
        at: Math.min(
          plan.duration,
          Math.round((event.at + 0.001) * 1000) / 1000,
        ),
        type: "freeze",
        cards: [cardId],
        params: {
          freezeSource: timeSliceSource,
          externalMaterial: true,
          frankenMediaAdapter: true,
          frankenCapsuleId: timeSliceCapsuleId,
          authorityClass: "evidence",
        },
        because:
          "A SHA-256 verified Haunted Blender Time Slice artifact is displayed as a bounded derived still; its source receipt grants no publication or ancestry authority.",
      });
    }

    const memoryCapsuleId =
      typeof guidance.memoryCapsuleId === "string"
        ? guidance.memoryCapsuleId
        : undefined;
    const memorySource = memoryCapsuleId
      ? bindings[memoryCapsuleId]
      : undefined;

    if (memoryCapsuleId && memorySource) {
      const duration = Math.max(
        1 / plan.fps,
        Math.min(2.5, event.duration ?? 1.5),
      );
      added.push({
        id: `${event.id}--franken-memory`,
        at: event.at,
        duration,
        type: "awaken",
        cards: [cardId],
        params: {
          videoSource: memorySource,
          externalMaterial: true,
          frankenMediaAdapter: true,
          frankenCapsuleId: memoryCapsuleId,
          authorityClass: "evidence",
        },
        because:
          "A SHA-256 verified Haunted Blender Memory Feedback artifact is shown for one bounded interval as derived cinematic material, not evidence of current presence.",
      });
    }
  }

  const events = [...baseEvents, ...added].sort(
    (left, right) =>
      left.at - right.at || left.id.localeCompare(right.id),
  );

  return {
    ...plan,
    events,
    renderHints: {
      ...(plan.renderHints ?? {}),
      notes: [
        ...(plan.renderHints?.notes ?? []),
        ...(added.length > 0
          ? [
              `Franken media binding injected ${added.length} digest-verified derived-media event(s).`,
            ]
          : []),
      ],
    },
    metadata: {
      ...(plan.metadata ?? {}),
      studioFrankenMedia: {
        schema: "playdeck/franken-media-bindings/v0",
        bindings: Object.entries(bindings)
          .sort(([left], [right]) => left.localeCompare(right))
          .map(([capsuleId, source]) => ({
            capsuleId,
            source,
          })),
        injectedEventIds: added.map((event) => event.id),
      },
    },
  };
};

