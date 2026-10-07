import type {DeckSpec, WorldRule} from "@playdeck/core";

export type AlbumTrackInput = {
  id?: string;
  audio: string;
  title?: string;
  worldRule?: WorldRule;
};

export type RunAlbumOptions = {
  id: string;
  images?: string;
  deck?: DeckSpec;
  assetSources?: Record<string, string>;
  tracks: AlbumTrackInput[];
  outputDir: string;
  title?: string;
  worldRule?: WorldRule;
  fps?: 24 | 30 | 60;
  width?: number;
  height?: number;
};

export type AlbumTrackResult = {
  index: number;
  performanceId: string;
  title: string;
  outputDir: string;
  video: string;
  receipt: string;
  inputInheritedReceipt?: string;
  outputInheritedReceipt: string;
  introFrom?: string;
};

export type AlbumManifest = {
  schemaVersion: "0.1";
  id: string;
  title?: string;
  deckId: string;
  tracks: AlbumTrackResult[];
  finalDeck: string;
  continuityDepth: number;
};
