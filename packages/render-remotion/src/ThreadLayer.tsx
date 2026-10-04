import React from "react";
import type {ActiveEvent} from "./runtime";
import type {CardLayout} from "./layout";
import type {FrankenCinematicState} from "./frankenCinematic";

export const ThreadLayer: React.FC<{
  activeEvents: ActiveEvent[];
  layouts: Map<string, CardLayout>;
  width: number;
  height: number;
  franken?: FrankenCinematicState | null;
}> = ({activeEvents, layouts, width, height, franken}) => {
  const events = activeEvents.filter((event) => event.type === "thread");

  if (events.length === 0) {
    return null;
  }

  const relationMode = franken?.relationMode ?? "parallel-drift";
  const strength = franken?.relationStrength ?? 0.5;

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

          const x1 = a.x + a.width / 2;
          const y1 = a.y + a.height / 2;
          const x2 = b.x + b.width / 2;
          const y2 = b.y + b.height / 2;
          const midX = (x1 + x2) / 2;
          const midY = (y1 + y2) / 2;
          const dx = x2 - x1;
          const dy = y2 - y1;
          const length = Math.max(1, Math.hypot(dx, dy));
          const nx = -dy / length;
          const ny = dx / length;
          const bend = (28 + 42 * strength) * (index % 2 === 0 ? 1 : -1);

          let path = `M ${x1} ${y1} L ${x2} ${y2}`;
          let dash: string | undefined;
          let opacity = 0.45 + strength * 0.24;

          switch (relationMode) {
            case "axial-lock":
              path = `M ${x1} ${y1} L ${midX} ${y1} L ${midX} ${y2} L ${x2} ${y2}`;
              break;
            case "attraction-repulsion":
              path = `M ${x1} ${y1} Q ${midX + nx * bend} ${midY + ny * bend} ${x2} ${y2}`;
              break;
            case "stroke-link":
              path = `M ${x1} ${y1} L ${x2} ${y2}`;
              dash = "8 7 2 7";
              opacity = 0.6;
              break;
            case "swarm":
              path = `M ${x1} ${y1} Q ${midX + nx * bend * 0.45} ${midY + ny * bend * 0.45} ${x2} ${y2}`;
              dash = "3 5";
              break;
            case "orbit-crossing":
              path = `M ${x1} ${y1} Q ${midX + nx * bend * 1.8} ${midY + ny * bend * 1.8} ${x2} ${y2}`;
              opacity = 0.65;
              break;
            case "parallel-drift":
            default:
              path = `M ${x1} ${y1} Q ${midX + nx * bend * 0.22} ${midY + ny * bend * 0.22} ${x2} ${y2}`;
              break;
          }

          return (
            <g key={`${event.id}-${ids[index]}-${id}`}>
              <path
                d={path}
                fill="none"
                stroke="rgba(116,151,220,.62)"
                strokeWidth={1.1 + event.progress * 2.2 * strength}
                strokeDasharray={dash}
                opacity={opacity}
              />
              {relationMode === "swarm" ? (
                <path
                  d={`M ${x1 + nx * 6} ${y1 + ny * 6} Q ${midX - nx * bend * 0.32} ${midY - ny * bend * 0.32} ${x2 + nx * 6} ${y2 + ny * 6}`}
                  fill="none"
                  stroke="rgba(185,205,225,.25)"
                  strokeWidth={0.8 + strength}
                  strokeDasharray="2 9"
                />
              ) : null}
            </g>
          );
        });
      })}
    </svg>
  );
};
