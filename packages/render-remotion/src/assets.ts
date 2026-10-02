import {staticFile} from "remotion";
import type {AssetMap} from "./types";

const isRemote = (value: string) => /^https?:\/\//i.test(value);

export const resolveAsset = (source: string, assets: AssetMap): string => {
  const resolved = source.startsWith("asset://") ? assets[source] : source;

  if (!resolved) {
    throw new Error(
      `No asset binding for "${source}". Supply it through PlaydeckRenderProps.assets.`,
    );
  }

  if (isRemote(resolved)) {
    return resolved;
  }

  return staticFile(resolved.replace(/^\/+/, ""));
};
