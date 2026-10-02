import type {
  PerformanceEvidence,
  PerformanceReceipt,
} from "@playdeck/core";

const descendantsResolved = (receipt: PerformanceReceipt): boolean => {
  const specs = new Set(receipt.carry.newCardSpecs.map((card) => card.id));
  return receipt.carry.newCards.every((id) => specs.has(id));
};

export const sealReceipt = (
  receipt: PerformanceReceipt,
  evidence: PerformanceEvidence[],
): PerformanceReceipt => {
  if (receipt.phase !== "projected") {
    throw new Error("Only a projected receipt may be sealed.");
  }

  const fullPerformance = evidence.some(
    (item) => item.scope === "full-performance",
  );

  if (!fullPerformance) {
    throw new Error(
      "A receipt requires explicit full-performance evidence before it can be sealed for inheritance.",
    );
  }

  if (!descendantsResolved(receipt)) {
    throw new Error(
      "A receipt with newCards cannot be sealed until every descendant has a materialized CardSpec.",
    );
  }

  return {
    ...receipt,
    phase: "rendered",
    evidence: evidence.map((item) => ({
      ...item,
      notes: [...(item.notes ?? [])],
    })),
    metadata: {
      ...(receipt.metadata ?? {}),
      sealed: true,
    },
  };
};

export const canInheritReceipt = (
  receipt: PerformanceReceipt,
): boolean =>
  receipt.phase === "rendered" &&
  descendantsResolved(receipt) &&
  Boolean(
    receipt.evidence?.some(
      (item) => item.scope === "full-performance",
    ),
  );
