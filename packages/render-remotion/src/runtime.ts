import type {CompositionEvent, CompositionPlan} from "@playdeck/core";

export type ActiveEvent = CompositionEvent & {
  progress: number;
};

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

export const getActiveEvents = (
  plan: CompositionPlan,
  time: number,
): ActiveEvent[] =>
  plan.events
    .filter((event) => {
      const duration = event.duration ?? 0;

      if (event.persist) {
        return time >= event.at;
      }

      return duration <= 0
        ? Math.abs(time - event.at) < 1 / plan.fps
        : time >= event.at && time < event.at + duration;
    })
    .map((event) => ({
      ...event,
      progress:
        event.duration && event.duration > 0
          ? clamp01((time - event.at) / event.duration)
          : 1,
    }));

export const eventTargetsCard = (
  event: CompositionEvent,
  cardId: string,
): boolean => !event.cards || event.cards.includes(cardId);

export const getCurrentGate = (plan: CompositionPlan, time: number) => {
  const ordered = [...plan.gates].sort((a, b) => a.at - b.at);
  let current = ordered[0];

  for (const gate of ordered) {
    if (gate.at <= time) {
      current = gate;
    } else {
      break;
    }
  }

  return current;
};
