import type {CardPermissions} from "@playdeck/core";

export type IngestCardOverride = {
  id?: string;
  traits?: string[];
  temperament?: string[];
  permissions?: CardPermissions;
  metadata?: Record<string, unknown>;
};

export type IngestManifest = {
  schemaVersion?: "0.1";
  title?: string;
  defaults?: {
    traits?: string[];
    temperament?: string[];
    permissions?: CardPermissions;
    metadata?: Record<string, unknown>;
  };
  cards?: Record<string, IngestCardOverride>;
  metadata?: Record<string, unknown>;
};

export type IngestFolderOptions = {
  deckId: string;
  title?: string;
  recursive?: boolean;
  sourcePrefix?: string;
  manifestFile?: string;
  includeExtensions?: string[];
};
