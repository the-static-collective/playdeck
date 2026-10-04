import React from "react";
import {Img} from "remotion";
import type {CardLayout} from "./layout";
import type {FrankenCinematicState} from "./frankenCinematic";

type MemoryCard = {
  id: string;
  source: string;
};

export const FrankenMemoryField: React.FC<{
  state: FrankenCinematicState | null;
  cards: MemoryCard[];
  layouts: Map<string, CardLayout>;
  time: number;
}> = ({state, cards, layouts, time}) => {
  if (!state || state.memoryOpacity <= 0) return null;

  const visible = cards.slice(0, Math.min(4, cards.length));
  const baseOpacity = state.memoryOpacity;

  return (
    <>
      {visible.flatMap((card, cardIndex) => {
        const layout = layouts.get(card.id);
        if (!layout) return [];

        const echoes =
          state.memoryMode === "wake"
            ? 3
            : state.memoryMode === "nested-afterimage"
              ? 3
              : state.memoryMode === "overwrite-ghost"
                ? 2
                : 1;

        return Array.from({length: echoes}, (_, echoIndex) => {
          const age = echoIndex + 1;
          const drift = age * (6 + state.motionAmplitude * 0.08);
          const wave = Math.sin(time * 0.37 + cardIndex * 1.7 + age);

          let dx = -drift;
          let dy = wave * drift * 0.35;
          let scale = 1;
          let rotate = 0;
          let filter = "saturate(.65) contrast(.9)";
          let border: string | undefined;

          switch (state.memoryMode) {
            case "erosion":
              dx = -drift * 0.7;
              dy = drift * 0.24;
              scale = 1 + age * 0.012;
              filter = "grayscale(.65) contrast(.82)";
              break;
            case "room-trace":
              dx = age * 3;
              dy = age * 3;
              scale = 1 + age * 0.008;
              filter = "saturate(.25) brightness(.9)";
              border = "2px solid rgba(175,205,225,.35)";
              break;
            case "scar-recall":
              dx = wave * drift * 0.42;
              dy = -drift * 0.16;
              rotate = wave * 2.2;
              filter = "saturate(.55) contrast(1.15)";
              break;
            case "overwrite-ghost":
              dx = (cardIndex % 2 === 0 ? -1 : 1) * drift * 0.55;
              dy = -drift * 0.22;
              rotate = (cardIndex % 2 === 0 ? -1 : 1) * age * 1.2;
              filter = "contrast(1.12) saturate(.72)";
              break;
            case "wake":
              dx = -drift * 1.15;
              dy = wave * drift * 0.2;
              scale = 1 - age * 0.012;
              filter = "blur(.3px) saturate(.72)";
              break;
            case "nested-afterimage":
              dx = age * 9 - 18;
              dy = -age * 6 + 12;
              scale = 0.9 + age * 0.055;
              rotate = (age - 2) * 1.6;
              filter = "saturate(.72) hue-rotate(8deg)";
              border = "1px solid rgba(190,175,235,.34)";
              break;
          }

          return (
            <div
              key={`${card.id}-memory-${echoIndex}`}
              style={{
                position: "absolute",
                left: layout.x + dx,
                top: layout.y + dy,
                width: layout.width,
                height: layout.height,
                overflow: "hidden",
                opacity:
                  baseOpacity *
                  (0.52 / age) *
                  Math.max(0.35, layout.opacity),
                transform: `scale(${layout.scale * layout.scaleX * scale}, ${layout.scale * scale}) rotate(${layout.rotate + rotate}deg)`,
                transformOrigin: "50% 50%",
                filter,
                border,
                mixBlendMode:
                  state.memoryMode === "overwrite-ghost"
                    ? "screen"
                    : "normal",
                zIndex: Math.max(0, layout.zIndex - 8 - echoIndex),
                pointerEvents: "none",
              }}
            >
              <Img
                src={card.source}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                }}
              />
            </div>
          );
        });
      })}
    </>
  );
};
