import type {SectionGate} from "./CompositionPlan";

export type TrackEnvelopeRef = {
  bands: string[];
  artifact: string;
  sampleHz?: number;
};

export type TrackSpec = {
  schemaVersion: "0.1";
  id: string;
  title?: string;
  source: string;
  duration: number;
  tempoBpmApprox?: number;
  gates?: SectionGate[];
  analysis?: {
    envelope?: TrackEnvelopeRef;
    notes?: string[];
  };
  metadata?: Record<string, unknown>;
};
