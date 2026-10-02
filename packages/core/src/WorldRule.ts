export type WorldRule = {
  schemaVersion: "0.1";
  id: string;
  physical?: string;
  surface?: string;
  transition?: string;
  awakening?: string;
  laws?: string[];
  metadata?: Record<string, unknown>;
};
