import type {SectionGate, TrackSpec} from "@playdeck/core";

export type GateSource = "track" | "duration-fallback";

const fallback = (duration: number): SectionGate[] => {
  const at = (ratio: number) => Math.round(duration * ratio * 1000) / 1000;

  return [
    {id: "auto-00", at: 0, kind: "intro", label: "arrival"},
    {id: "auto-01", at: at(0.12), kind: "verse", label: "first field"},
    {id: "auto-02", at: at(0.25), kind: "pre-chorus", label: "relation pressure"},
    {id: "auto-03", at: at(0.36), kind: "chorus", label: "first assembly"},
    {id: "auto-04", at: at(0.49), kind: "verse", label: "changed return"},
    {id: "auto-05", at: at(0.62), kind: "pre-chorus", label: "second pressure"},
    {id: "auto-06", at: at(0.70), kind: "chorus", label: "second assembly"},
    {id: "auto-07", at: at(0.77), kind: "bridge", label: "wrong medium"},
    {id: "auto-08", at: at(0.84), kind: "breakdown", label: "addressable parts"},
    {id: "auto-09", at: at(0.89), kind: "chorus", label: "final assembly"},
    {id: "auto-10", at: at(0.95), kind: "outro", label: "residue"},
  ];
};

export const resolveGates = (
  track: TrackSpec,
): {gates: SectionGate[]; source: GateSource} => {
  const supplied = (track.gates ?? [])
    .filter((gate) => gate.at >= 0 && gate.at < track.duration)
    .sort((a, b) => a.at - b.at);

  if (supplied.length > 0) {
    if (supplied[0].at !== 0) {
      supplied.unshift({
        id: "auto-intro",
        at: 0,
        kind: "intro",
        label: "arrival",
      });
    }

    return {gates: supplied, source: "track"};
  }

  return {gates: fallback(track.duration), source: "duration-fallback"};
};
