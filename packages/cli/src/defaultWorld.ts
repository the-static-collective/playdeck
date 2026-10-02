import type {WorldRule} from "@playdeck/core";

export const defaultWorldRule = (): WorldRule => ({
  schemaVersion: "0.1",
  id: "postcard",
  physical: "postcard",
  surface: "printed-paper",
  transition: "contact-sheet",
  awakening: "portal",
  bridge: {
    worldRule: "postal-static",
    dialect: ["postmark", "misregistration", "sorting-machine"],
  },
  laws: [
    "card identity remains recognizable through motion",
    "audio changes deck physics rather than decorating it with meters",
    "most motion remains deterministic",
    "rough edges remain visible",
  ],
});
