import React from "react";
import type {ActiveEvent} from "./runtime";
import type {CardLayout} from "./layout";

export const ThreadLayer: React.FC<{
  activeEvents: ActiveEvent[];
  layouts: Map<string, CardLayout>;
  width: number;
  height: number;
}> = ({activeEvents, layouts, width, height}) => {
  const events = activeEvents.filter((event) => event.type === "thread");

  if (events.length === 0) {
    return null;
  }

  return (
    <svg
      width="100%"
      height="100%"
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 100,
        pointerEvents: "none",
      }}
    >
      {events.flatMap((event) => {
        const ids = event.cards ?? [];
        return ids.slice(1).map((id, index) => {
          const a = layouts.get(ids[index]);
          const b = layouts.get(id);
          if (!a || !b) {
            return null;
          }

          return (
            <line
              key={`${event.id}-${ids[index]}-${id}`}
              x1={a.x + a.width / 2}
              y1={a.y + a.height / 2}
              x2={b.x + b.width / 2}
              y2={b.y + b.height / 2}
              stroke="rgba(116,151,220,.55)"
              strokeWidth={1.25 + event.progress * 2.5}
            />
          );
        });
      })}
    </svg>
  );
};
