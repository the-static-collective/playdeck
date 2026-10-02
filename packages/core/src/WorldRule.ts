export type WorldRule = {
  schemaVersion: "0.1";
  id: string;
  physical?: string;
  surface?: string;
  transition?: string;
  awakening?: string;

  /**
   * Optional declared wrong-medium dialect for bridge crossings.
   * Keeping this in the world rule prevents the composer from inventing
   * specimen-specific visual language.
   */
  bridge?: {
    worldRule?: string;
    dialect?: string[];
  };

  laws?: string[];
  metadata?: Record<string, unknown>;
};
