import React from "react";
import {Composition} from "remotion";
import type {
  CompositionPlan,
  DeckSpec,
  TrackSpec,
  WorldRule,
} from "@playdeck/core";
import {PlaydeckComposition} from "./PlaydeckComposition";
import type {AssetMap, EnvelopePoint} from "./types";

import deckJson from "../../../examples/genesis-001/deck.json";
import trackJson from "../../../examples/genesis-001/track.json";
import worldRuleJson from "../../../examples/genesis-001/world-rule.json";
import planJson from "../../../examples/genesis-001/plan.json";
import assetMapJson from "../../../examples/genesis-001/asset-map.cdn.json";
import envelopeJson from "../../../examples/genesis-001/static-collective-envelope.json";

const deck = deckJson as DeckSpec;
const track = trackJson as TrackSpec;
const worldRule = worldRuleJson as WorldRule;
const plan = planJson as CompositionPlan;
const assets = assetMapJson as AssetMap;
const envelope = envelopeJson as EnvelopePoint[];

export const Root: React.FC = () => (
  <Composition
    id="Genesis001"
    component={PlaydeckComposition}
    durationInFrames={Math.ceil(plan.duration * plan.fps)}
    fps={plan.fps}
    width={plan.width}
    height={plan.height}
    defaultProps={{
      deck,
      track,
      worldRule,
      plan,
      assets,
      envelope,
      debug: false,
    }}
  />
);
