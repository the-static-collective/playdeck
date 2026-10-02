import type {
  StudioAssetPayload,
  StudioCommitPayload,
  StudioCommitResult,
  StudioNextSongPayload,
  StudioNextSongResult,
} from "./cockpitTypes";
import type {BrowserStudioBundle} from "./browserBundle";
import type {StudioBundle} from "./types";

export const fileToPayload = async (
  file: File,
): Promise<StudioAssetPayload> => {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunk = 0x8000;

  for (let offset = 0; offset < bytes.length; offset += chunk) {
    binary += String.fromCharCode(
      ...bytes.subarray(offset, offset + chunk),
    );
  }

  return {
    name: file.name,
    mime: file.type || undefined,
    base64: btoa(binary),
  };
};

export const buildStudioCommitPayload = async ({
  loaded,
  session,
  inherit,
  extraAssets = {},
}: {
  loaded: BrowserStudioBundle;
  session: StudioBundle;
  inherit: boolean;
  extraAssets?: Record<string, StudioAssetPayload>;
}): Promise<StudioCommitPayload> => {
  const assets: Record<string, StudioAssetPayload> = {};

  for (const [logical, file] of Object.entries(loaded.assetFiles)) {
    assets[logical] = await fileToPayload(file);
  }

  Object.assign(assets, extraAssets);

  return {
    deck: session.deck,
    track: session.track,
    worldRule: session.worldRule,
    plan: session.plan,
    envelope: session.envelope,
    assets,
    inherit,
  };
};

export const commitStudioPerformance = async (
  payload: StudioCommitPayload,
): Promise<StudioCommitResult> => {
  const response = await fetch("/api/studio/commit", {
    method: "POST",
    headers: {"content-type": "application/json"},
    body: JSON.stringify(payload),
  });

  const result = (await response.json()) as
    StudioCommitResult & {error?: string};

  if (!response.ok || result.error) {
    throw new Error(
      result.error ??
        `Studio commit failed with HTTP ${response.status}`,
    );
  }

  return result;
};

export const assetPayloadToObjectUrl = (
  asset: StudioAssetPayload,
): string => {
  const binary = atob(asset.base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return URL.createObjectURL(
    new Blob([bytes], {
      type: asset.mime ?? "application/octet-stream",
    }),
  );
};

export const prepareStudioNextSong = async (
  payload: StudioNextSongPayload,
): Promise<StudioNextSongResult> => {
  const response = await fetch("/api/studio/next-song", {
    method: "POST",
    headers: {"content-type": "application/json"},
    body: JSON.stringify(payload),
  });

  const result = (await response.json()) as
    StudioNextSongResult & {error?: string};

  if (!response.ok || result.error) {
    throw new Error(
      result.error ??
        `Next Song preparation failed with HTTP ${response.status}`,
    );
  }

  return result;
};
