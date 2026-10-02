import {decodeMonoFloat32, probeDuration} from "./ffmpeg";
import type {AudioAnalysis, AudioEnvelopePoint} from "./types";

const percentile = (values: number[], ratio: number): number => {
  if (values.length === 0) return 1;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.max(
    0,
    Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * ratio)),
  );
  return Math.max(sorted[index], 1e-8);
};

const normalize = (
  rows: Array<[number, number, number, number]>,
): AudioEnvelopePoint[] => {
  const lowCeiling = percentile(rows.map((row) => row[1]), 0.95);
  const midCeiling = percentile(rows.map((row) => row[2]), 0.95);
  const highCeiling = percentile(rows.map((row) => row[3]), 0.95);

  return rows.map(([time, low, mid, high]) => [
    time,
    Math.min(1, low / lowCeiling),
    Math.min(1, mid / midCeiling),
    Math.min(1, high / highCeiling),
  ]);
};

const lowPassAlpha = (cutoff: number, sampleRate: number) => {
  const dt = 1 / sampleRate;
  const rc = 1 / (2 * Math.PI * cutoff);
  return dt / (rc + dt);
};

export const analyzeAudio = (
  audioFile: string,
  options: {
    sampleRate?: number;
    envelopeHz?: number;
  } = {},
): AudioAnalysis => {
  const sampleRate = options.sampleRate ?? 8000;
  const envelopeHz = options.envelopeHz ?? 1;

  if (envelopeHz <= 0 || envelopeHz > 20) {
    throw new Error("envelopeHz must be > 0 and <= 20.");
  }

  const duration = probeDuration(audioFile);
  const samples = decodeMonoFloat32(audioFile, sampleRate);

  const alphaLow = lowPassAlpha(200, sampleRate);
  const alphaMid = lowPassAlpha(2000, sampleRate);

  let lpLow = 0;
  let lpMid = 0;

  const bucketSize = Math.max(1, Math.round(sampleRate / envelopeHz));
  const raw: Array<[number, number, number, number]> = [];

  let lowSq = 0;
  let midSq = 0;
  let highSq = 0;
  let bucketCount = 0;
  let bucketIndex = 0;

  const flush = () => {
    if (bucketCount === 0) return;
    raw.push([
      bucketIndex / envelopeHz,
      Math.sqrt(lowSq / bucketCount),
      Math.sqrt(midSq / bucketCount),
      Math.sqrt(highSq / bucketCount),
    ]);
    lowSq = 0;
    midSq = 0;
    highSq = 0;
    bucketCount = 0;
    bucketIndex += 1;
  };

  for (let i = 0; i < samples.length; i += 1) {
    const sample = samples[i];

    lpLow += alphaLow * (sample - lpLow);
    lpMid += alphaMid * (sample - lpMid);

    const low = lpLow;
    const mid = lpMid - lpLow;
    const high = sample - lpMid;

    lowSq += low * low;
    midSq += mid * mid;
    highSq += high * high;
    bucketCount += 1;

    if (bucketCount >= bucketSize) flush();
  }

  flush();

  if (raw.length === 0) {
    raw.push([0, 0, 0, 0]);
  }

  if (raw.length === 1) {
    raw.push([duration, raw[0][1], raw[0][2], raw[0][3]]);
  } else if (raw[raw.length - 1][0] < duration) {
    const last = raw[raw.length - 1];
    raw.push([duration, last[1], last[2], last[3]]);
  }

  return {
    duration,
    sampleRate,
    envelopeHz,
    envelope: normalize(raw),
    method:
      "ffmpeg mono PCM -> one-pole 200Hz/2000Hz crossover -> RMS buckets -> per-band p95 normalization",
  };
};
