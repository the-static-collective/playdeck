import {staticFile} from "remotion";
import type {AssetMap} from "./types";

const isDirectUri = (value: string) =>
  /^(?:https?:\/\/|blob:|data:)/i.test(value);

export const resolveAsset = (source: string, assets: AssetMap): string => {
  const resolved = source.startsWith("asset://") ? assets[source] : source;

  if (!resolved) {
    throw new Error(
      `No asset binding for "${source}". Supply it through PlaydeckRenderProps.assets.`,
    );
  }

  if (isDirectUri(resolved)) {
    return resolved;
  }

  return staticFile(resolved.replace(/^\/+/, ""));
};
