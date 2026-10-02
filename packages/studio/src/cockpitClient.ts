import type {
  StudioAssetPayload,
  StudioCommitPayload,
  StudioCommitResult,
} from "./cockpitTypes";
import type {BrowserStudioBundle} from "./browserBundle";
import type {StudioBundle} from "./types";

const fileToPayload = async (
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
}: {
  loaded: BrowserStudioBundle;
  session: StudioBundle;
  inherit: boolean;
}): Promise<StudioCommitPayload> => {
  const assets: Record<string, StudioAssetPayload> = {};

  for (const [logical, file] of Object.entries(loaded.assetFiles)) {
    assets[logical] = await fileToPayload(file);
  }

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
    | StudioCommitResult
    | {error?: string};

  if (!response.ok || "error" in result) {
    throw new Error(
      "error" in result && result.error
        ? result.error
        : `Studio commit failed with HTTP ${response.status}`,
    );
  }

  return result;
};
