import type {CardPermissions, DeckSpec} from "@playdeck/core";

export type PagePlaylistKind = "original" | "remix";

export type PagePlaylistAuthority =
  | "source"
  | "candidate"
  | "admitted";

export type PagePlaylistItem = {
  id: string;
  title?: string;

  /**
   * Local transport binding. The file is hashed at press time.
   * Its path is never used as semantic identity.
   */
  file: string;

  /**
   * Exact upstream identity supplied by the producing system.
   * Examples: LemonPRESS page id, remix candidate id, receipt-bound URI.
   */
  sourceIdentity: string;

  kind: PagePlaylistKind;
  authority: PagePlaylistAuthority;

  /**
   * Optional expected byte hash. If present, press refuses on mismatch.
   */
  declaredSha256?: string;

  /**
   * Required for remix items.
   */
  candidateId?: string;
  parentIds?: string[];

  traits?: string[];
  temperament?: string[];
  permissions?: CardPermissions;
  metadata?: Record<string, unknown>;
};

export type PagePlaylistPressSpec = {
  schemaVersion: "0.1";
  id: string;
  title?: string;
  items: PagePlaylistItem[];
  metadata?: Record<string, unknown>;
};

export type PagePlaylistPressReceiptInput = {
  index: number;
  cardId: string;
  kind: PagePlaylistKind;
  authority: PagePlaylistAuthority;
  sourceIdentity: string;
  byteSha256: string;
  candidateId?: string;
  parentIds?: string[];
};

export type PagePlaylistPressReceipt = {
  schemaVersion: "0.1";
  id: string;
  pressId: string;
  deckId: string;
  inputs: PagePlaylistPressReceiptInput[];
  laws: string[];
  stop: string;
};

export type PagePlaylistPressResult = {
  deck: DeckSpec;
  assetSources: Record<string, string>;
  receipt: PagePlaylistPressReceipt;
};
