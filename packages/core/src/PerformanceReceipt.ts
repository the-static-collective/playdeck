import type {CardSpec} from "./CardSpec";
import type {CompositionFinalState} from "./CompositionPlan";

export type ReceiptPhase = "projected" | "rendered";

export type ReceiptSource = {
  deckId: string;
  trackId: string;
  worldRuleId: string;
  planId: string;
};

export type ReceiptEvent = {
  id: string;
  at: number;
  duration?: number;
  type: string;
  cards: string[];
  with: string[];
  worldRule?: string;
  persistent: boolean;
  result?: string;
  because?: string;
};

export type PerformanceEvidence = {
  kind: "video" | "still" | "other";
  uri: string;

  /**
   * Only full-performance evidence may seal a receipt for inheritance.
   * A still/checkpoint can prove a local render path, not the whole performance.
   */
  scope: "full-performance" | "checkpoint";

  renderer?: string;
  frame?: number;
  sha256?: string;
  notes?: string[];
};

export type PerformanceReceipt = {
  schemaVersion: "0.1";
  id: string;
  phase: ReceiptPhase;

  source: ReceiptSource;

  events: ReceiptEvent[];
  finalState: CompositionFinalState;

  evidence?: PerformanceEvidence[];

  /**
   * Explicit carry-forward surface for the next deck composition.
   * Consumers must still verify phase === "rendered".
   */
  carry: {
    assembledAs?: string;
    held: string[];
    missing: string[];
    newCards: string[];

    /**
     * Materialized descendants. IDs must correspond to newCards.
     * A rendered receipt with unresolved newCards is not inheritable.
     */
    newCardSpecs: CardSpec[];
  };

  metadata?: Record<string, unknown>;
};
