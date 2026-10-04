import React, {useMemo} from "react";
import {AbsoluteFill, useCurrentFrame, useVideoConfig} from "remotion";
import {Audio, Video} from "@remotion/media";
import {resolveAsset} from "./assets";
import {sampleEnvelope} from "./envelope";
import {computeCardLayout} from "./layout";
import {CardLayer} from "./CardLayer";
import {CorruptionOverlay} from "./CorruptionOverlay";
import {ThreadLayer} from "./ThreadLayer";
import {getActiveEvents, getCurrentGate} from "./runtime";
import {getFrankenCinematicState} from "./frankenCinematic";
import {FrankenAtmosphere} from "./FrankenAtmosphere";
import {FrankenMemoryField} from "./FrankenMemoryField";
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
  const frankenCinematic = getFrankenCinematicState({
    plan,
    activeEvents,
    time,
  });

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

      <FrankenAtmosphere
        state={frankenCinematic}
        width={plan.width}
        height={plan.height}
        time={time}
      />

      <AbsoluteFill
        style={
          frankenCinematic
            ? {
                transform: `translate(${frankenCinematic.camera.x}px, ${frankenCinematic.camera.y}px) scale(${frankenCinematic.camera.scale}) rotate(${frankenCinematic.camera.rotate}deg)`,
                transformOrigin: "50% 50%",
              }
            : undefined
        }
      >
      <FrankenMemoryField
        state={frankenCinematic}
        cards={orderedCards.map((card) => ({
          id: card.id,
          source: resolveAsset(
            card.front?.source ?? card.source,
            assets,
          ),
        }))}
        layouts={layouts}
        time={time}
      />

      <ThreadLayer
        activeEvents={activeEvents}
        layouts={layouts}
        width={plan.width}
        height={plan.height}
        franken={frankenCinematic}
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

      {plan.events
        .filter(
          (event) =>
            event.type === "awaken" &&
            typeof event.params?.videoSource === "string" &&
            event.cards?.[0],
        )
        .map((event) => {
          const cardId = event.cards?.[0];
          const layout = cardId ? layouts.get(cardId) : undefined;
          if (!layout) return null;

          return (
            <Video
              key={event.id}
              from={Math.round(event.at * fps)}
              durationInFrames={Math.max(
                1,
                Math.round((event.duration ?? 0) * fps),
              )}
              src={resolveAsset(String(event.params?.videoSource), assets)}
              muted
              style={{
                position: "absolute",
                left: layout.x,
                top: layout.y,
                width: layout.width,
                height: layout.height,
                objectFit: "cover",
                overflow: "hidden",
                scale: `${layout.scale * layout.scaleX} ${layout.scale}`,
                rotate: `${layout.rotate}deg`,
                border: "3px solid rgba(255,225,155,.72)",
                boxShadow: "0 0 38px rgba(180,155,255,.42)",
                zIndex: layout.zIndex + 220,
              }}
            />
          );
        })}

      {plan.events
        .filter(
          (event) =>
            event.type === "freeze" &&
            typeof event.params?.freezeSource === "string" &&
            event.cards?.[0],
        )
        .map((event, index) => {
          const cardId = event.cards?.[0];
          const layout = cardId ? layouts.get(cardId) : undefined;
          if (!layout) return null;

          return (
            <img
              key={event.id}
              src={resolveAsset(String(event.params?.freezeSource), assets)}
              style={{
                position: "absolute",
                left: layout.x + layout.width * (0.5 + index * 0.04),
                top: layout.y + layout.height * 0.48,
                width: layout.width * 0.42,
                height: layout.height * 0.42,
                objectFit: "cover",
                opacity: frame >= Math.round(event.at * fps) ? 0.94 : 0,
                rotate: `${-4 + index * 2}deg`,
                border: "3px solid rgba(245,218,160,.72)",
                boxShadow: "0 12px 34px rgba(0,0,0,.48)",
                zIndex: layout.zIndex + 230,
              }}
            />
          );
        })}

      </AbsoluteFill>

      <CorruptionOverlay activeEvents={activeEvents} high={audio.high} />

      {frankenCinematic && frankenCinematic.cutPulse > 0 ? (
        <div
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 540,
            pointerEvents: "none",
            opacity: frankenCinematic.cutPulse * 0.11,
            background: "rgba(245,238,220,.55)",
          }}
        />
      ) : null}

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
          {frankenCinematic ? (
            <div>
              {frankenCinematic.lensId} · {frankenCinematic.cameraMode} ·{" "}
              {frankenCinematic.topology} · {frankenCinematic.cutRhythm}
            </div>
          ) : null}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};
