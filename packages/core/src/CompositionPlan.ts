export type SectionGate = {
  id: string;
  at: number;
  kind:
    | "intro"
    | "verse"
    | "pre-chorus"
    | "chorus"
    | "bridge"
    | "breakdown"
    | "outro"
    | "custom";
  label?: string;
};

export type CompositionEvent = {
  id: string;
  at: number;
  duration?: number;

  /**
   * The compositional verb. Renderers interpret a bounded vocabulary first,
   * but may support extensions.
   */
  type:
    | "arrive"
    | "drift"
    | "thread"
    | "hinge"
    | "flip"
    | "fracture"
    | "stack"
    | "contact-sheet"
    | "corrupt"
    | "assemble"
    | "hold"
    | "portal"
    | "awaken"
    | "freeze"
    | "residue"
    | "custom";

  cards?: string[];
  with?: string[];

  worldRule?: string;

  params?: Record<string, unknown>;

  /**
   * Human-readable reason for the event.
   * This is part of the plan's inspectability.
   */
  because?: string;
};

export type CompositionFinalState = {
  assembledAs?: string;
  held?: string[];
  missing?: string[];
  newCards?: string[];
  notes?: string[];
};

export type CompositionPlan = {
  schemaVersion: "0.1";

  id: string;
  deckId: string;
  trackId: string;
  worldRuleId: string;

  duration: number;
  fps: 24 | 30 | 60;
  width: number;
  height: number;

  gates: SectionGate[];
  events: CompositionEvent[];

  /**
   * Renderer suggestions, not compositional authority.
   */
  renderHints?: {
    preferredRenderer?: string;
    preserveSourceTexture?: boolean;
    deterministic?: boolean;
    notes?: string[];
  };

  finalState?: CompositionFinalState;

  metadata?: Record<string, unknown>;
};
