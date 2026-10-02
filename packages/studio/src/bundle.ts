import type {
  CompositionPlan,
  DeckSpec,
  PerformanceReceipt,
  TrackSpec,
  WorldRule,
} from "@playdeck/core";
import type {
  BundleStrings,
  EnvelopePoint,
  StudioBundle,
} from "./types";

const normalized = (value: string) =>
  value.replace(/^\.\//, "").replaceAll("\\", "/");

const findBySuffix = (
  entries: BundleStrings,
  suffix: string,
): string | undefined => {
  const target = normalized(suffix);
  return Object.keys(entries).find(
    (key) =>
      normalized(key) === target ||
      normalized(key).endsWith(`/${target}`),
  );
};

const requiredJson = <T>(
  entries: BundleStrings,
  suffix: string,
): T => {
  const key = findBySuffix(entries, suffix);
  if (!key) {
    throw new Error(`PlayDeck bundle is missing ${suffix}`);
  }
  return JSON.parse(entries[key]) as T;
};

const optionalJson = <T>(
  entries: BundleStrings,
  suffix: string,
): T | undefined => {
  const key = findBySuffix(entries, suffix);
  return key ? (JSON.parse(entries[key]) as T) : undefined;
};

export const parseBundleStrings = (
  entries: BundleStrings,
  bundleName?: string,
): StudioBundle => {
  const deck = requiredJson<DeckSpec>(entries, "deck.json");
  const track = requiredJson<TrackSpec>(entries, "track.json");
  const worldRule = requiredJson<WorldRule>(
    entries,
    "world-rule.json",
  );
  const plan = requiredJson<CompositionPlan>(entries, "plan.json");
  const envelope =
    optionalJson<EnvelopePoint[]>(entries, "envelope.json") ?? [];
  const receipt =
    optionalJson<PerformanceReceipt>(
      entries,
      "receipt.rendered.json",
    ) ??
    optionalJson<PerformanceReceipt>(
      entries,
      "receipt.projected.json",
    );

  const rawAssetMap =
    optionalJson<Record<string, string>>(
      entries,
      "asset-map.bundle.json",
    ) ?? {};

  const assetBindings: Record<string, string> = {};
  for (const [logical, uri] of Object.entries(rawAssetMap)) {
    assetBindings[logical] = uri.replace(/^bundle:\/\//, "");
  }

  const sourceFile =
    typeof track.metadata?.sourceFile === "string"
      ? track.metadata.sourceFile
      : undefined;

  if (sourceFile && !assetBindings[track.source]) {
    assetBindings[track.source] = `assets/audio/${sourceFile}`;
  }

  return {
    deck,
    track,
    worldRule,
    plan,
    envelope,
    receipt,
    assetBindings,
    bundleName,
  };
};

export const resolveBundleEntry = (
  entries: BundleStrings,
  relativePath: string,
): string | undefined => {
  const key = findBySuffix(entries, relativePath);
  return key ? entries[key] : undefined;
};
