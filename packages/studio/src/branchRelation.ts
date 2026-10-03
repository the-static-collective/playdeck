import type {
  CardSpec,
  DeckSpec,
  WorldRule,
} from "@playdeck/core";
import {
  ensureStudioTimeline,
  forkStudioSessionArchive,
  type StudioSessionArchive,
  type StudioTimelineCheckpoint,
  type StudioTimelineLedger,
} from "./sessionArchive";

export type StudioBranchRelation = {
  kind: "playdeck-branch-relation";
  schemaVersion: "0.1";
  id: string;
  left: {
    checkpointId: string;
    receiptId: string;
    branchId: string;
    branchLabel: string;
  };
  right: {
    checkpointId: string;
    receiptId: string;
    branchId: string;
    branchLabel: string;
  };
  common: {
    checkpointId: string;
    receiptId: string;
  };
  cards: {
    sharedUnchanged: string[];
    sharedDiverged: string[];
    leftOnly: string[];
    rightOnly: string[];
  };
  world: {
    same: string[];
    diverged: Array<{
      field: string;
      left?: string;
      right?: string;
    }>;
  };
  carry: {
    heldShared: string[];
    heldLeftOnly: string[];
    heldRightOnly: string[];
    newCardsShared: string[];
    newCardsLeftOnly: string[];
    newCardsRightOnly: string[];
  };
};

const hash = (value: string): string => {
  let result = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    result ^= value.charCodeAt(index);
    result = Math.imul(result, 16777619);
  }
  return (result >>> 0).toString(16).padStart(8, "0");
};

const stable = (value: unknown): string => {
  if (Array.isArray(value)) {
    return `[${value.map(stable).join(",")}]`;
  }
  if (value && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, item]) => `${JSON.stringify(key)}:${stable(item)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
};

const arrays = (
  left: string[],
  right: string[],
) => {
  const l = new Set(left);
  const r = new Set(right);
  return {
    shared: [...l].filter((value) => r.has(value)).sort(),
    leftOnly: [...l].filter((value) => !r.has(value)).sort(),
    rightOnly: [...r].filter((value) => !l.has(value)).sort(),
  };
};

const branchForCheckpoint = (
  timeline: StudioTimelineLedger,
  checkpoint: StudioTimelineCheckpoint,
) => {
  if (!checkpoint.branchId) {
    throw new Error(
      `Checkpoint "${checkpoint.id}" is not on a named branch.`,
    );
  }
  const branch = timeline.branches.find(
    (candidate) => candidate.id === checkpoint.branchId,
  );
  if (!branch) {
    throw new Error(
      `Checkpoint "${checkpoint.id}" cites missing branch "${checkpoint.branchId}".`,
    );
  }
  return branch;
};

const latestCommonCheckpoint = (
  timeline: StudioTimelineLedger,
  left: StudioTimelineCheckpoint,
  right: StudioTimelineCheckpoint,
): StudioTimelineCheckpoint => {
  const rightReceipts = new Set(
    right.state.receipts.map((receipt) => receipt.id),
  );
  const sharedReceiptIds = left.state.receipts
    .map((receipt) => receipt.id)
    .filter((id) => rightReceipts.has(id));

  for (const receiptId of [...sharedReceiptIds].reverse()) {
    const checkpoint = timeline.checkpoints.find(
      (candidate) => candidate.receipt.id === receiptId,
    );
    if (checkpoint) return checkpoint;
  }

  throw new Error(
    "Selected branches do not share a restartable witnessed checkpoint.",
  );
};

const compareCards = (
  leftDeck: DeckSpec,
  rightDeck: DeckSpec,
) => {
  const left = new Map(
    leftDeck.cards.map((card) => [card.id, card]),
  );
  const right = new Map(
    rightDeck.cards.map((card) => [card.id, card]),
  );
  const sharedUnchanged: string[] = [];
  const sharedDiverged: string[] = [];

  for (const id of [...left.keys()].filter((id) => right.has(id))) {
    if (stable(left.get(id)) === stable(right.get(id))) {
      sharedUnchanged.push(id);
    } else {
      sharedDiverged.push(id);
    }
  }

  return {
    sharedUnchanged: sharedUnchanged.sort(),
    sharedDiverged: sharedDiverged.sort(),
    leftOnly: [...left.keys()].filter((id) => !right.has(id)).sort(),
    rightOnly: [...right.keys()].filter((id) => !left.has(id)).sort(),
  };
};

const compareWorld = (
  left: WorldRule,
  right: WorldRule,
) => {
  const fields: Array<keyof Pick<
    WorldRule,
    "physical" | "surface" | "transition" | "awakening"
  >> = ["physical", "surface", "transition", "awakening"];

  const same: string[] = [];
  const diverged: StudioBranchRelation["world"]["diverged"] = [];

  for (const field of fields) {
    if (left[field] === right[field]) {
      same.push(field);
    } else {
      diverged.push({
        field,
        ...(left[field] ? {left: left[field]} : {}),
        ...(right[field] ? {right: right[field]} : {}),
      });
    }
  }

  return {same, diverged};
};

export const compareStudioBranchCheckpoints = (
  timeline: StudioTimelineLedger,
  leftCheckpointId: string,
  rightCheckpointId: string,
): StudioBranchRelation => {
  if (leftCheckpointId === rightCheckpointId) {
    throw new Error("Choose two different branch checkpoints.");
  }

  const left = timeline.checkpoints.find(
    (checkpoint) => checkpoint.id === leftCheckpointId,
  );
  const right = timeline.checkpoints.find(
    (checkpoint) => checkpoint.id === rightCheckpointId,
  );
  if (!left || !right) {
    throw new Error("Both comparison targets must be restartable checkpoints.");
  }

  const leftBranch = branchForCheckpoint(timeline, left);
  const rightBranch = branchForCheckpoint(timeline, right);
  if (leftBranch.id === rightBranch.id) {
    throw new Error("Cross-branch comparison requires two different branches.");
  }

  const common = latestCommonCheckpoint(timeline, left, right);
  const held = arrays(
    left.receipt.carry.held,
    right.receipt.carry.held,
  );
  const newCards = arrays(
    left.receipt.carry.newCards,
    right.receipt.carry.newCards,
  );

  const relationSeed = [
    common.receipt.id,
    left.receipt.id,
    right.receipt.id,
    leftBranch.id,
    rightBranch.id,
  ].sort().join(":");

  return {
    kind: "playdeck-branch-relation",
    schemaVersion: "0.1",
    id: `relation-${hash(relationSeed)}`,
    left: {
      checkpointId: left.id,
      receiptId: left.receipt.id,
      branchId: leftBranch.id,
      branchLabel: leftBranch.label,
    },
    right: {
      checkpointId: right.id,
      receiptId: right.receipt.id,
      branchId: rightBranch.id,
      branchLabel: rightBranch.label,
    },
    common: {
      checkpointId: common.id,
      receiptId: common.receipt.id,
    },
    cards: compareCards(
      left.inheritedDeck,
      right.inheritedDeck,
    ),
    world: compareWorld(
      left.state.session.worldRule,
      right.state.session.worldRule,
    ),
    carry: {
      heldShared: held.shared,
      heldLeftOnly: held.leftOnly,
      heldRightOnly: held.rightOnly,
      newCardsShared: newCards.shared,
      newCardsLeftOnly: newCards.leftOnly,
      newCardsRightOnly: newCards.rightOnly,
    },
  };
};

const relationizeCard = (
  card: CardSpec,
  relation: StudioBranchRelation,
): CardSpec => {
  const traits = new Set(card.traits ?? []);
  if (relation.cards.sharedDiverged.includes(card.id)) {
    traits.add("relation-diverged");
  } else if (relation.cards.sharedUnchanged.includes(card.id)) {
    traits.add("relation-shared");
  }

  return {
    ...card,
    traits: [...traits],
  };
};

export const composeStudioRelationBranch = (
  source: StudioSessionArchive,
  relation: StudioBranchRelation,
  label = "relation-world",
): StudioSessionArchive => {
  const timeline = ensureStudioTimeline(source);
  const left = timeline.checkpoints.find(
    (checkpoint) => checkpoint.id === relation.left.checkpointId,
  );
  const right = timeline.checkpoints.find(
    (checkpoint) => checkpoint.id === relation.right.checkpointId,
  );
  if (!left || !right) {
    throw new Error(
      "Relation sources are not present in the current timeline.",
    );
  }

  const verified = compareStudioBranchCheckpoints(
    timeline,
    left.id,
    right.id,
  );
  if (verified.id !== relation.id) {
    throw new Error("Branch relation no longer matches its source checkpoints.");
  }

  const forked = forkStudioSessionArchive(
    source,
    label,
    relation.common.checkpointId,
  );
  if (!forked.checkpoint?.inheritedDeck) {
    throw new Error("Relation branch did not receive an inherited deck.");
  }

  const inheritedDeck: DeckSpec = {
    ...forked.checkpoint.inheritedDeck,
    cards: forked.checkpoint.inheritedDeck.cards.map((card) =>
      relationizeCard(card, relation),
    ),
    metadata: {
      ...(forked.checkpoint.inheritedDeck.metadata ?? {}),
      studioBranchRelation: relation,
    },
  };

  return {
    ...forked,
    checkpoint: {
      ...forked.checkpoint,
      inheritedDeck,
    },
  };
};
