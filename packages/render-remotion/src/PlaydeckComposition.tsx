import React, {useMemo} from "react";
import {AbsoluteFill, useCurrentFrame, useVideoConfig} from "remotion";
import {Audio} from "@remotion/media";
import {resolveAsset} from "./assets";
import {sampleEnvelope} from "./envelope";
import {computeCardLayout} from "./layout";
import {CardLayer} from "./CardLayer";
import {CorruptionOverlay} from "./CorruptionOverlay";
import {ThreadLayer} from "./ThreadLayer";
import {getActiveEvents, getCurrentGate} from "./runtime";
import type {PlaydeckRenderProps} from "./types";

export const PlaydeckComposition: React.FC<PlaydeckRenderProps> = ({
  deck,
  track,
  worldRule,
  plan,
  assets,
  envelope,
  debug = false,
}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const time = frame / fps;

  const audio = sampleEnvelope(envelope, time);
  const activeEvents = getActiveEvents(plan, time);
  const currentGate = getCurrentGate(plan, time);

  const orderedCards = useMemo(() => {
    if (!deck.order?.length) {
      return deck.cards;
    }

    const byId = new Map(deck.cards.map((card) => [card.id, card]));
    const ordered = deck.order
      .map((id) => byId.get(id))
      .filter((card): card is NonNullable<typeof card> => Boolean(card));

    const seen = new Set(ordered.map((card) => card.id));
    return [...ordered, ...deck.cards.filter((card) => !seen.has(card.id))];
  }, [deck]);

  const layouts = new Map(
    orderedCards.map((card, index) => [
      card.id,
      computeCardLayout({
        card,
        cardIndex: index,
        deck,
        plan,
        activeEvents,
        time,
        audio,
      }),
    ]),
  );

  return (
    <AbsoluteFill
      style={{
        overflow: "hidden",
        background:
          "radial-gradient(circle at 50% 45%, #2d224f 0%, #15132b 42%, #090914 100%)",
        perspective: 1200,
      }}
    >
      <Audio src={resolveAsset(track.source, assets)} />

      <ThreadLayer
        activeEvents={activeEvents}
        layouts={layouts}
        width={plan.width}
        height={plan.height}
      />

      {orderedCards.map((card) => {
        const layout = layouts.get(card.id);
        if (!layout) {
          return null;
        }

        return (
          <CardLayer
            key={card.id}
            card={card}
            source={resolveAsset(card.front?.source ?? card.source, assets)}
            layout={layout}
          />
        );
      })}

      <CorruptionOverlay activeEvents={activeEvents} high={audio.high} />

      {debug ? (
        <div
          style={{
            position: "absolute",
            left: 18,
            top: 18,
            zIndex: 1000,
            padding: "10px 12px",
            fontFamily: "monospace",
            fontSize: 18,
            color: "#f4e2b8",
            background: "rgba(7,7,14,.72)",
            border: "1px solid rgba(230,185,95,.35)",
          }}
        >
          <div>{plan.id}</div>
          <div>{worldRule.id}</div>
          <div>{currentGate?.label ?? currentGate?.kind ?? "—"}</div>
          <div>
            {activeEvents.map((event) => event.type).join(" + ") || "idle"}
          </div>
          <div>
            L {audio.low.toFixed(2)} / M {audio.mid.toFixed(2)} / H{" "}
            {audio.high.toFixed(2)}
          </div>
        </div>
      ) : null}
    </AbsoluteFill>
  );
};
