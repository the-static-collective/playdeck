import type {
  CompositionPlan,
  DeckSpec,
  TrackSpec,
  WorldRule,
} from "@playdeck/core";

export type EnvelopePoint = [
  time: number,
  low: number,
  mid: number,
  high: number,
];

export type AssetMap = Record<string, string>;

export type PlaydeckRenderProps = {
  deck: DeckSpec;
  track: TrackSpec;
  worldRule: WorldRule;
  plan: CompositionPlan;
  assets: AssetMap;
  envelope?: EnvelopePoint[];
  debug?: boolean;
};
