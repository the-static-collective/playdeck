import React from "react";
import type {ActiveEvent} from "./runtime";

export const CorruptionOverlay: React.FC<{
  activeEvents: ActiveEvent[];
  high: number;
}> = ({activeEvents, high}) => {
  const event = activeEvents.find((candidate) => candidate.type === "corrupt");

  if (!event) {
    return null;
  }

  const alpha = 0.1 + Math.min(0.2, high * 0.12);

  return (
    <>
      <div
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 500,
          pointerEvents: "none",
          opacity: event.progress,
          background:
            "repeating-linear-gradient(0deg, rgba(255,255,255,.08) 0px, rgba(255,255,255,.08) 1px, rgba(0,0,0,0) 2px, rgba(0,0,0,0) 5px)",
          mixBlendMode: "screen",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 501,
          pointerEvents: "none",
          opacity: event.progress * alpha,
          background:
            "linear-gradient(90deg, rgba(30,70,180,.55), transparent 28%, transparent 72%, rgba(235,125,55,.45))",
          mixBlendMode: "color-dodge",
        }}
      />
    </>
  );
};
