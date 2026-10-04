import type {CompositionPlan} from "@playdeck/core";
import type {ActiveEvent} from "./runtime";

type JsonRecord = Record<string, unknown>;

export type FrankenCinematicState = {
  lensId:
    | "landscape"
    | "architecture"
    | "organism"
    | "sigil"
    | "weather"
    | "dimensional-space";
  cameraMode: string;
  framing: string;
  topology: string;
  cutRhythm: string;
  relationMode: string;
  memoryMode: string;
  shotIndex: number;
  phase: number;
  framingScale: number;
  motionAmplitude: number;
  relationStrength: number;
  memoryOpacity: number;
  camera: {
    x: number;
    y: number;
    scale: number;
    rotate: number;
  };
  cutPulse: number;
};

const isRecord = (value: unknown): value is JsonRecord =>
  Boolean(value) &&
  typeof value === "object" &&
  !Array.isArray(value);

const numeric = (
  value: unknown,
  fallback: number,
): number =>
  typeof value === "number" && Number.isFinite(value)
    ? value
    : fallback;

const stringValue = (
  value: unknown,
  fallback: string,
): string =>
  typeof value === "string" && value ? value : fallback;

const grammarFromPlan = (
  plan: CompositionPlan,
): JsonRecord | undefined => {
  const studioFranken = plan.metadata?.studioFranken;
  if (!isRecord(studioFranken)) return undefined;
  return isRecord(studioFranken.cinematic)
    ? studioFranken.cinematic
    : undefined;
};

const guidanceFromEvents = (
  activeEvents: ActiveEvent[],
): JsonRecord | undefined => {
  for (let index = activeEvents.length - 1; index >= 0; index -= 1) {
    const franken = activeEvents[index].params?.franken;
    if (isRecord(franken)) return franken;
  }
  return undefined;
};

const cutInterval = (cutRhythm: string): number => {
  switch (cutRhythm) {
    case "long-breath":
      return 3.2;
    case "measured-cuts":
      return 1.6;
    case "elastic-pulse":
      return 1.15;
    case "syncopated-cuts":
      return 0.72;
    case "gust-bursts":
      return 0.52;
    case "folded-time":
      return 0.93;
    default:
      return 1.5;
  }
};

const cameraFor = ({
  cameraMode,
  time,
  phase,
  framingScale,
  motionAmplitude,
  cutRhythm,
}: {
  cameraMode: string;
  time: number;
  phase: number;
  framingScale: number;
  motionAmplitude: number;
  cutRhythm: string;
}) => {
  const interval = cutInterval(cutRhythm);
  const cutIndex = Math.floor((time + phase * interval) / interval);
  const local = ((time + phase * interval) % interval) / interval;
  const cutPulse =
    Math.max(0, 1 - Math.min(local, 1 - local) * 14);
  const snap = (seed: number) =>
    Math.sin((cutIndex + 1) * seed + phase * 7.13);

  switch (cameraMode) {
    case "survey":
      return {
        x: Math.sin(time * 0.16 + phase * 4) * motionAmplitude * 0.34,
        y: Math.cos(time * 0.11 + phase * 3) * motionAmplitude * 0.1,
        scale: framingScale * (0.96 + Math.sin(time * 0.09) * 0.012),
        rotate: Math.sin(time * 0.07 + phase) * 0.22,
        cutPulse,
      };
    case "hinge-orbit":
      return {
        x: Math.sin(time * 0.42 + phase * 5) * motionAmplitude * 0.23,
        y: Math.cos(time * 0.29 + phase * 2) * motionAmplitude * 0.12,
        scale: framingScale * (1 + Math.sin(time * 0.31) * 0.018),
        rotate: Math.sin(time * 0.38 + phase) * 0.7,
        cutPulse,
      };
    case "pulse-dolly": {
      const breath = (Math.sin(time * 1.18 + phase * 4) + 1) / 2;
      return {
        x: Math.sin(time * 0.31 + phase) * motionAmplitude * 0.12,
        y: Math.cos(time * 0.37 + phase * 3) * motionAmplitude * 0.09,
        scale: framingScale * (0.98 + breath * 0.055),
        rotate: Math.sin(time * 0.22 + phase) * 0.35,
        cutPulse,
      };
    }
    case "snap-frame":
      return {
        x: snap(2.37) * motionAmplitude * 0.36,
        y: snap(3.11) * motionAmplitude * 0.22,
        scale: framingScale * (1 + snap(1.73) * 0.025),
        rotate: snap(4.21) * 1.2,
        cutPulse,
      };
    case "wind-eye":
      return {
        x:
          Math.sin(time * 0.76 + phase * 7) *
            motionAmplitude *
            0.5 +
          snap(1.91) * motionAmplitude * 0.08,
        y:
          Math.cos(time * 0.53 + phase * 5) *
          motionAmplitude *
          0.23,
        scale: framingScale * (0.96 + Math.sin(time * 0.63) * 0.025),
        rotate: Math.sin(time * 0.48 + phase * 2) * 1.15,
        cutPulse,
      };
    case "parallax-orbit":
      return {
        x: Math.sin(time * 0.39 + phase * 9) * motionAmplitude * 0.42,
        y: Math.cos(time * 0.33 + phase * 6) * motionAmplitude * 0.28,
        scale: framingScale * (1.03 + Math.sin(time * 0.27) * 0.035),
        rotate: Math.sin(time * 0.34 + phase * 3) * 1.45,
        cutPulse,
      };
    default:
      return {
        x: 0,
        y: 0,
        scale: framingScale,
        rotate: 0,
        cutPulse,
      };
  }
};

export const getFrankenCinematicState = ({
  plan,
  activeEvents,
  time,
}: {
  plan: CompositionPlan;
  activeEvents: ActiveEvent[];
  time: number;
}): FrankenCinematicState | null => {
  const planGrammar = grammarFromPlan(plan);
  const eventGuidance = guidanceFromEvents(activeEvents);
  if (!planGrammar && !eventGuidance) return null;

  const eventCinema =
    eventGuidance && isRecord(eventGuidance.cinematic)
      ? eventGuidance.cinematic
      : undefined;
  const grammar = eventCinema ?? planGrammar;
  if (!grammar) return null;

  const lensId = stringValue(
    eventGuidance?.lensId,
    stringValue(
      (plan.metadata?.studioFranken as JsonRecord | undefined)?.lensId,
      "landscape",
    ),
  ) as FrankenCinematicState["lensId"];

  const state = {
    lensId,
    cameraMode: stringValue(grammar.cameraMode, "survey"),
    framing: stringValue(grammar.framing, "horizon-wide"),
    topology: stringValue(grammar.topology, "terrain-bands"),
    cutRhythm: stringValue(grammar.cutRhythm, "long-breath"),
    relationMode: stringValue(grammar.relationMode, "parallel-drift"),
    memoryMode: stringValue(grammar.memoryMode, "erosion"),
    shotIndex: numeric(grammar.shotIndex, 0),
    phase: numeric(grammar.phase, 0),
    framingScale: numeric(grammar.framingScale, 1),
    motionAmplitude: numeric(grammar.motionAmplitude, 18),
    relationStrength: numeric(grammar.relationStrength, 0.5),
    memoryOpacity: numeric(grammar.memoryOpacity, 0.15),
  };

  const camera = cameraFor({
    cameraMode: state.cameraMode,
    time,
    phase: state.phase,
    framingScale: state.framingScale,
    motionAmplitude: state.motionAmplitude,
    cutRhythm: state.cutRhythm,
  });

  return {
    ...state,
    camera: {
      x: camera.x,
      y: camera.y,
      scale: camera.scale,
      rotate: camera.rotate,
    },
    cutPulse: camera.cutPulse,
  };
};
