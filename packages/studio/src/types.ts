import type {
  CompositionPlan,
  DeckSpec,
  PerformanceReceipt,
  TrackSpec,
  WorldRule,
} from "@playdeck/core";

export type EnvelopePoint = [
  time: number,
  low: number,
  mid: number,
  high: number,
];

export type StudioBundle = {
  deck: DeckSpec;
  track: TrackSpec;
  worldRule: WorldRule;
  plan: CompositionPlan;
  envelope: EnvelopePoint[];
  receipt?: PerformanceReceipt;
  assetBindings: Record<string, string>;
  bundleName?: string;
};

export type BundleStrings = Record<string, string>;
