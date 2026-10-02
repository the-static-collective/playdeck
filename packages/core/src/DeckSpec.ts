import type {CardSpec} from "./CardSpec";

export type DeckCluster = {
  id: string;
  cards: string[];
  kind?: string;
  notes?: string;
};

export type DeckSourceSheet = {
  id: string;
  source: string;
  rows?: number;
  columns?: number;
};

export type DeckSpec = {
  schemaVersion: "0.1";

  id: string;
  title?: string;

  /**
   * Optional shared sheets used by cards through crop regions.
   */
  sourceSheets?: DeckSourceSheet[];

  cards: CardSpec[];

  /**
   * Suggested traversal only.
   * DECK != ORDER.
   */
  order?: string[];

  clusters?: DeckCluster[];

  /**
   * A prior performance receipt the composer may inspect.
   * Inheritance is explicit, never assumed.
   */
  inheritedReceipt?: string;

  metadata?: Record<string, unknown>;
};
