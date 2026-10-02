import type {
  StudioAssetPayload,
  StudioQueuedSong,
} from "./cockpitTypes";

const smallHash = (value: string): string => {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
};

export const enqueueStudioSongs = (
  current: StudioQueuedSong[],
  assets: StudioAssetPayload[],
): StudioQueuedSong[] => [
  ...current,
  ...assets.map((audio, index) => ({
    id:
      "queued-" +
      smallHash(
        [
          audio.name,
          audio.base64.length,
          audio.base64.slice(0, 1024),
          current.length + index,
        ].join(":"),
      ),
    name: audio.name,
    audio,
  })),
];

export const moveStudioQueuedSong = (
  queue: StudioQueuedSong[],
  id: string,
  delta: -1 | 1,
): StudioQueuedSong[] => {
  const next = [...queue];
  const index = next.findIndex((entry) => entry.id === id);
  const target = index + delta;

  if (index < 0 || target < 0 || target >= next.length) {
    return next;
  }

  [next[index], next[target]] = [next[target], next[index]];
  return next;
};

export const removeStudioQueuedSong = (
  queue: StudioQueuedSong[],
  id: string,
): StudioQueuedSong[] =>
  queue.filter((entry) => entry.id !== id);

export const takeNextStudioQueuedSong = (
  queue: StudioQueuedSong[],
): {
  next?: StudioQueuedSong;
  remaining: StudioQueuedSong[];
} => ({
  next: queue[0],
  remaining: queue.slice(1),
});
