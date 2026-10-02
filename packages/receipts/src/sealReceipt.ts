import type {
  PerformanceEvidence,
  PerformanceReceipt,
} from "@playdeck/core";

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
  Boolean(
    receipt.evidence?.some(
      (item) => item.scope === "full-performance",
    ),
  );
