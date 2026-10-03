import type {
  DeckSpec,
  WorldRule,
} from "@playdeck/core";
import {
  appendStudioPossibilityEcology,
  createStudioSessionArchive,
  ensureStudioTimeline,
  forkStudioSessionArchive,
  type StudioHauntCapsule,
  type StudioPossibilityEcology,
  type StudioPossibilityProposal,
  type StudioSessionArchive,
  type StudioTimelineLedger,
} from "./sessionArchive";

const hash = (value: string): string => {
  let result = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    result ^= value.charCodeAt(index);
    result = Math.imul(result, 16777619);
  }
  return (result >>> 0).toString(16).padStart(8, "0");
};

const recipes: Array<{
  label: string;
  invitation: string;
  worldPatch: StudioPossibilityProposal["worldPatch"];
  traits: string[];
}> = [
  {
    label: "Late Bloom",
    invitation: "late-bloom",
    worldPatch: {
      surface: "darkroom",
      transition: "slow-assembly",
      awakening: "portal",
    },
    traits: ["late-bloom", "restraint"],
  },
  {
    label: "Restraint Before Expansion",
    invitation: "restraint-before-expansion",
    worldPatch: {
      physical: "postcard",
      transition: "held-threshold",
    },
    traits: ["restraint", "threshold"],
  },
  {
    label: "Fault Line",
    invitation: "visible-fault-line",
    worldPatch: {
      physical: "contact-sheet",
      surface: "teletext",
    },
    traits: ["fracture", "relation-diverged"],
  },
  {
    label: "Ghost Negative",
    invitation: "ghost-negative",
    worldPatch: {
      surface: "dossier",
      awakening: "doorway",
    },
    traits: ["ghost", "residue"],
  },
  {
    label: "Stained Memory",
    invitation: "stained-memory",
    worldPatch: {
      physical: "polaroid",
      surface: "stained-glass",
    },
    traits: ["memory", "relation-shared"],
  },
  {
    label: "Room From Difference",
    invitation: "room-from-difference",
    worldPatch: {
      physical: "field-notes",
      transition: "room-assembly",
    },
    traits: ["merge", "relation-diverged"],
  },
];

const ecologyForRelation = (
  timeline: StudioTimelineLedger,
  relationId: string,
): StudioPossibilityEcology[] =>
  (timeline.ecologies ?? []).filter(
    (ecology) => ecology.relationId === relationId,
  );

export const createStudioPossibilityEcology = (
  timeline: StudioTimelineLedger,
  relationId: string,
): StudioPossibilityEcology => {
  const relation = (timeline.relations ?? []).find(
    (candidate) => candidate.id === relationId,
  );
  if (!relation) {
    throw new Error(
      `Cannot grow possibilities from missing relation "${relationId}".`,
    );
  }

  const prior = ecologyForRelation(timeline, relationId);
  const open = prior.find((ecology) => !ecology.disposition);
  if (open) {
    throw new Error(
      `Possibility ecology "${open.id}" is still open. KEEP or SCRAPE it before growing another family.`,
    );
  }

  const generation =
    Math.max(0, ...prior.map((ecology) => ecology.generation)) + 1;
  const seed = hash(
    [
      relation.id,
      relation.common.receiptId,
      generation,
      relation.summary.sharedDiverged,
      relation.summary.worldDiverged,
    ].join(":"),
  );

  const capsule: StudioHauntCapsule = {
    id: `haunt-${relation.id}-g${generation}-${seed}`,
    kind: "static-collective/causal-capsule/v1",
    authorityClass: "influence-only",
    originRelationId: relation.id,
    sourceReceiptIds: [
      relation.left.receiptId,
      relation.right.receiptId,
    ],
    sourceCheckpointId: relation.common.checkpointId,
    surface: "possibility-search",
    invitation: "difference-without-collapse",
    residue: [
      `${relation.summary.sharedDiverged} shared card identities diverged`,
      `${relation.summary.worldDiverged} world fields diverged`,
      `${relation.summary.leftOnly} left-only card identities`,
      `${relation.summary.rightOnly} right-only card identities`,
    ],
    unresolved: [
      "Which alternate-future discoveries should remain latent rather than imported?",
      "Which difference deserves a new performance rather than a historical claim?",
    ],
    refused: [
      "Sibling future receipts cannot become ancestry through influence-only memory.",
      "Proposal generation cannot mint receipts.",
    ],
  };

  const offset = Number.parseInt(seed.slice(-2), 16) % recipes.length;
  const proposals = Array.from({length: 6}, (_, index) => {
    const recipe = recipes[(index + offset) % recipes.length];
    const slot = index + 1;
    const proposalSeed = hash(
      [capsule.id, slot, recipe.invitation].join(":"),
    );

    return {
      id: `${capsule.id}-p${slot}-${proposalSeed}`,
      slot,
      authorityClass: "proposal" as const,
      label: recipe.label,
      invitation: recipe.invitation,
      seed: proposalSeed,
      worldPatch: recipe.worldPatch,
      traits: recipe.traits,
    };
  });

  return {
    id: `ecology-${relation.id}-g${generation}-${seed}`,
    kind: "haunted-possibility-ecology",
    relationId: relation.id,
    commonCheckpointId: relation.common.checkpointId,
    generation,
    capsule,
    proposals,
  };
};

export const addStudioPossibilityEcology = (
  timeline: StudioTimelineLedger,
  relationId: string,
): StudioTimelineLedger =>
  appendStudioPossibilityEcology(
    timeline,
    createStudioPossibilityEcology(timeline, relationId),
  );

const replaceEcology = (
  timeline: StudioTimelineLedger,
  ecology: StudioPossibilityEcology,
): StudioTimelineLedger =>
  appendStudioPossibilityEcology(timeline, ecology);

export const scrapeStudioPossibilityEcology = (
  source: StudioSessionArchive,
  ecologyId: string,
): StudioSessionArchive => {
  const timeline = ensureStudioTimeline(source);
  const ecology = (timeline.ecologies ?? []).find(
    (candidate) => candidate.id === ecologyId,
  );
  if (!ecology) {
    throw new Error(
      `Possibility ecology "${ecologyId}" was not found.`,
    );
  }
  if (ecology.disposition) {
    throw new Error(
      `Possibility ecology "${ecologyId}" is already ${ecology.disposition.kind}.`,
    );
  }

  return createStudioSessionArchive({
    session: source.session,
    assets: source.assets,
    queue: source.queue,
    receipts: source.receipts,
    checkpoint: source.checkpoint,
    branch: source.branch,
    timeline: replaceEcology(timeline, {
      ...ecology,
      disposition: {kind: "SCRAPE"},
    }),
    inheritAfterRender:
      source.preferences.inheritAfterRender,
    dirty: source.dirty,
  });
};

const applyProposalToDeck = (
  deck: DeckSpec,
  ecology: StudioPossibilityEcology,
  proposal: StudioPossibilityProposal,
): DeckSpec => ({
  ...deck,
  metadata: {
    ...(deck.metadata ?? {}),
    studioHauntCapsule: ecology.capsule,
    studioPossibilityKeep: {
      ecologyId: ecology.id,
      proposalId: proposal.id,
      proposalLabel: proposal.label,
      invitation: proposal.invitation,
      authorityClass: "continuation-permission",
    },
  },
});

const applyProposalToWorld = (
  worldRule: WorldRule,
  proposal: StudioPossibilityProposal,
): WorldRule => ({
  ...worldRule,
  ...proposal.worldPatch,
  metadata: {
    ...(worldRule.metadata ?? {}),
    studioPossibilityProposal: {
      id: proposal.id,
      label: proposal.label,
      invitation: proposal.invitation,
      authorityClass: proposal.authorityClass,
      seed: proposal.seed,
    },
  },
});

export const keepStudioPossibility = (
  source: StudioSessionArchive,
  ecologyId: string,
  proposalId: string,
): StudioSessionArchive => {
  const timeline = ensureStudioTimeline(source);
  const ecology = (timeline.ecologies ?? []).find(
    (candidate) => candidate.id === ecologyId,
  );
  if (!ecology) {
    throw new Error(
      `Possibility ecology "${ecologyId}" was not found.`,
    );
  }
  if (ecology.disposition) {
    throw new Error(
      `Possibility ecology "${ecologyId}" is already ${ecology.disposition.kind}.`,
    );
  }

  const proposal = ecology.proposals.find(
    (candidate) => candidate.id === proposalId,
  );
  if (!proposal) {
    throw new Error(
      `Proposal "${proposalId}" does not belong to ecology "${ecologyId}".`,
    );
  }

  const forked = forkStudioSessionArchive(
    source,
    `keep-${proposal.invitation}`,
    ecology.commonCheckpointId,
  );
  if (!forked.checkpoint?.inheritedDeck || !forked.branch) {
    throw new Error(
      "KEEP failed to create a branch from the common witnessed checkpoint.",
    );
  }

  const keptEcology: StudioPossibilityEcology = {
    ...ecology,
    disposition: {
      kind: "KEEP",
      proposalId: proposal.id,
      authorityClass: "continuation-permission",
      resultBranchId: forked.branch.id,
    },
  };

  const checkpoint = {
    ...forked.checkpoint,
    inheritedDeck: applyProposalToDeck(
      forked.checkpoint.inheritedDeck,
      ecology,
      proposal,
    ),
  };

  return createStudioSessionArchive({
    session: {
      ...forked.session,
      worldRule: applyProposalToWorld(
        forked.session.worldRule,
        proposal,
      ),
    },
    assets: forked.assets,
    queue: forked.queue,
    receipts: forked.receipts,
    checkpoint,
    branch: forked.branch,
    timeline: replaceEcology(
      ensureStudioTimeline(forked),
      keptEcology,
    ),
    inheritAfterRender:
      forked.preferences.inheritAfterRender,
    dirty: true,
  });
};
