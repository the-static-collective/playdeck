import type {
  CompositionPlan,
  DeckSpec,
  TrackSpec,
  WorldRule,
} from "@playdeck/core";
import {composeDeck} from "@playdeck/composer";

export const recomposeStudioPlan = ({
  deck,
  track,
  worldRule,
  priorPlan,
}: {
  deck: DeckSpec;
  track: TrackSpec;
  worldRule: WorldRule;
  priorPlan: CompositionPlan;
}): CompositionPlan =>
  composeDeck({
    deck,
    track,
    worldRule,
    options: {
      id: `${priorPlan.id}--studio`,
      fps: priorPlan.fps,
      width: priorPlan.width,
      height: priorPlan.height,
    },
  });
