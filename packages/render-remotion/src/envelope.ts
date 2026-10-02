import type {EnvelopePoint} from "./types";

const clamp = (value: number, min = 0, max = 1) =>
  Math.max(min, Math.min(max, value));

export const sampleEnvelope = (
  envelope: EnvelopePoint[] | undefined,
  time: number,
): {low: number; mid: number; high: number} => {
  if (!envelope || envelope.length < 2) {
    return {low: 0, mid: 0, high: 0};
  }

  const sampleRate = 1 / Math.max(0.001, envelope[1][0] - envelope[0][0]);
  const index = Math.max(
    0,
    Math.min(envelope.length - 2, Math.floor(time * sampleRate)),
  );

  const a = envelope[index];
  const b = envelope[index + 1];
  const width = Math.max(0.001, b[0] - a[0]);
  const amount = clamp((time - a[0]) / width);
  const lerp = (left: number, right: number) =>
    left + (right - left) * amount;

  return {
    low: clamp(lerp(a[1], b[1]), 0, 1.5),
    mid: clamp(lerp(a[2], b[2]), 0, 1.5),
    high: clamp(lerp(a[3], b[3]), 0, 1.5),
  };
};
