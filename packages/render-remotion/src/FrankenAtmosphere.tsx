import React from "react";
import type {FrankenCinematicState} from "./frankenCinematic";

export const FrankenAtmosphere: React.FC<{
  state: FrankenCinematicState | null;
  width: number;
  height: number;
  time: number;
}> = ({state, width, height, time}) => {
  if (!state) return null;

  const common: React.CSSProperties = {
    position: "absolute",
    inset: 0,
    pointerEvents: "none",
  };

  if (state.lensId === "landscape") {
    return (
      <div
        style={{
          ...common,
          zIndex: 20,
          opacity: 0.22 + state.memoryOpacity * 0.3,
          background:
            "repeating-linear-gradient(0deg, transparent 0 46px, rgba(225,205,160,.16) 47px 48px)",
          transform: `translateY(${Math.sin(time * 0.12) * 8}px)`,
        }}
      />
    );
  }

  if (state.lensId === "architecture") {
    return (
      <div
        style={{
          ...common,
          zIndex: 20,
          opacity: 0.18 + state.relationStrength * 0.12,
          background:
            "linear-gradient(rgba(170,205,230,.12) 1px, transparent 1px), linear-gradient(90deg, rgba(170,205,230,.12) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
          transform: `perspective(900px) rotateX(62deg) translateY(${height * 0.18}px)`,
          transformOrigin: "50% 70%",
        }}
      />
    );
  }

  if (state.lensId === "organism") {
    const pulse = 0.9 + (Math.sin(time * 1.15) + 1) * 0.08;
    return (
      <div
        style={{
          ...common,
          zIndex: 18,
          opacity: 0.2 + state.memoryOpacity * 0.35,
          background:
            "radial-gradient(circle at 50% 50%, rgba(188,120,180,.16) 0 12%, transparent 13% 24%, rgba(122,180,160,.10) 25% 28%, transparent 29%)",
          transform: `scale(${pulse})`,
        }}
      />
    );
  }

  if (state.lensId === "sigil") {
    return (
      <svg
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        style={{...common, zIndex: 24, opacity: 0.28}}
      >
        {Array.from({length: 12}, (_, index) => {
          const x = ((index * 83 + 47) % 997) / 997 * width;
          const y = ((index * 137 + 29) % 991) / 991 * height;
          const size = 12 + (index % 4) * 7;
          return (
            <g
              key={index}
              transform={`translate(${x} ${y}) rotate(${(index * 37) % 180})`}
            >
              <line
                x1={-size}
                y1="0"
                x2={size}
                y2="0"
                stroke="rgba(235,214,173,.55)"
                strokeWidth="1.5"
              />
              <line
                x1="0"
                y1={-size}
                x2="0"
                y2={size}
                stroke="rgba(235,214,173,.35)"
                strokeWidth="1"
              />
            </g>
          );
        })}
      </svg>
    );
  }

  if (state.lensId === "weather") {
    return (
      <div style={{...common, zIndex: 26, overflow: "hidden"}}>
        {Array.from({length: 28}, (_, index) => {
          const baseX = ((index * 71 + 13) % 101) / 101;
          const baseY = ((index * 43 + 31) % 103) / 103;
          const speed = 8 + (index % 7) * 2.7;
          const x =
            ((baseX * width + time * speed + index * 17) %
              (width + 60)) -
            30;
          const y =
            baseY * height +
            Math.sin(time * 0.5 + index) * (8 + (index % 5) * 3);
          const size = 2 + (index % 4);
          return (
            <span
              key={index}
              style={{
                position: "absolute",
                left: x,
                top: y,
                width: size,
                height: size,
                borderRadius: "50%",
                background: "rgba(220,235,245,.38)",
                boxShadow: "0 0 8px rgba(170,205,230,.24)",
                opacity: 0.35 + (index % 5) * 0.08,
              }}
            />
          );
        })}
      </div>
    );
  }

  return (
    <div style={{...common, zIndex: 22}}>
      {Array.from({length: 5}, (_, index) => {
        const inset = 7 + index * 6;
        const shift =
          Math.sin(time * 0.28 + index * 0.9 + state.phase * 5) *
          (3 + index * 2);
        return (
          <div
            key={index}
            style={{
              position: "absolute",
              left: `${inset}%`,
              right: `${inset}%`,
              top: `${inset * 0.78}%`,
              bottom: `${inset * 0.78}%`,
              border: `1px solid rgba(185,170,235,${0.22 - index * 0.025})`,
              transform: `translate(${shift}px, ${-shift * 0.6}px) rotate(${shift * 0.08}deg)`,
              boxShadow: `0 0 ${18 + index * 7}px rgba(110,95,190,.08)`,
            }}
          />
        );
      })}
    </div>
  );
};
