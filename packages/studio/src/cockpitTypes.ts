import type {
  CompositionPlan,
  DeckSpec,
  PerformanceReceipt,
  TrackSpec,
  WorldRule,
} from "@playdeck/core";
import type {EnvelopePoint} from "./types";

export type StudioAssetPayload = {
  name: string;
  mime?: string;
  base64: string;
};

export type StudioCommitPayload = {
  deck: DeckSpec;
  track: TrackSpec;
  worldRule: WorldRule;
  plan: CompositionPlan;
  envelope: EnvelopePoint[];
  assets: Record<string, StudioAssetPayload>;
  inherit: boolean;
};

export type StudioCommitResult = {
  id: string;
  outputDir: string;
  video: string;
  receipt: PerformanceReceipt;
  inheritedDeck?: DeckSpec;
  newAssets: Record<string, StudioAssetPayload>;
};

export type StudioNextSongPayload = {
  deck: DeckSpec;
  worldRule: WorldRule;
  priorPlan: CompositionPlan;
  audio: StudioAssetPayload;
};

export type StudioNextSongResult = {
  track: TrackSpec;
  envelope: EnvelopePoint[];
  plan: CompositionPlan;
  audioAsset: StudioAssetPayload;
};

export type StudioQueuedSong = {
  id: string;
  name: string;
  audio: StudioAssetPayload;
};
