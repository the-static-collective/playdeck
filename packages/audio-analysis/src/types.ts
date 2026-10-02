export type AudioEnvelopePoint = [
  time: number,
  low: number,
  mid: number,
  high: number,
];

export type AudioAnalysis = {
  duration: number;
  sampleRate: number;
  envelopeHz: number;
  envelope: AudioEnvelopePoint[];
  method: string;
};
