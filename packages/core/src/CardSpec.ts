export type NormalizedCrop = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type CardRelationship = {
  target: string;
  kind: string;
  weight?: number;
  notes?: string;
};

export type CardPermissions = {
  flip?: boolean;
  fold?: boolean;
  fracture?: boolean;
  portal?: boolean;
  awaken?: boolean;
  duplicate?: boolean;
  merge?: boolean;
};

export type CardFace = {
  source: string;
  crop?: NormalizedCrop;
};

export type CardSpec = {
  /**
   * Stable address of the participating object.
   * CARD != IMAGE: the source may be shared by many cards.
   */
  id: string;

  /**
   * Default visual source for the card.
   * Use logical asset URIs when transport/storage should remain replaceable.
   */
  source: string;

  front?: CardFace;
  back?: CardFace;

  /**
   * Descriptive properties available to the composer.
   * Examples: "door", "weather", "witness", "handwritten".
   */
  traits?: string[];

  /**
   * Behavioral tendencies, not mandatory animations.
   * Examples: "quiet", "answering", "chorus-bound", "restless".
   */
  temperament?: string[];

  relationships?: CardRelationship[];

  permissions?: CardPermissions;

  /**
   * Optional opaque user/host metadata.
   * Renderers must not silently reinterpret this as authority.
   */
  metadata?: Record<string, unknown>;
};
