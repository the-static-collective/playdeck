import type {
  CardSpec,
  CompositionPlan,
  DeckSpec,
} from "@playdeck/core";

export type AwakeningArtifact = {
  eventId: string;
  sourceCardId: string;
  provider: string;
  duration: number;
  videoSource: string;
  freezeSource: string;
  videoFile: string;
  freezeFile: string;
  newCard: CardSpec;
};

export type MaterializeAwakeningsInput = {
  deck: DeckSpec;
  plan: CompositionPlan;
  sourceFiles: Record<string, string>;
  outputDir: string;
};

export type MaterializeAwakeningsResult = {
  plan: CompositionPlan;
  artifacts: AwakeningArtifact[];
  newCards: CardSpec[];
  assetSources: Record<string, string>;
};
