import {
  existsSync,
  readFileSync,
  readdirSync,
  statSync,
} from "node:fs";
import {
  basename,
  extname,
  join,
  relative,
  resolve,
  sep,
} from "node:path";
import type {CardPermissions, CardSpec, DeckSpec} from "@playdeck/core";
import type {
  IngestCardOverride,
  IngestFolderOptions,
  IngestManifest,
} from "./types";

const DEFAULT_EXTENSIONS = [
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
  ".gif",
  ".avif",
  ".svg",
];

const normalizeRelative = (value: string) => value.split(sep).join("/");

const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/\.[^.]+$/, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "card";

const unique = <T>(values: T[]) => [...new Set(values)];

const mergePermissions = (
  defaults: CardPermissions | undefined,
  override: CardPermissions | undefined,
): CardPermissions | undefined => {
  if (!defaults && !override) return undefined;
  return {...(defaults ?? {}), ...(override ?? {})};
};

const walk = (root: string, recursive: boolean): string[] => {
  const found: string[] = [];

  for (const entry of readdirSync(root, {withFileTypes: true})) {
    const absolute = join(root, entry.name);

    if (entry.isDirectory()) {
      if (recursive) found.push(...walk(absolute, recursive));
      continue;
    }

    if (entry.isFile()) found.push(absolute);
  }

  return found;
};

const natural = (a: string, b: string) =>
  a.localeCompare(b, undefined, {numeric: true, sensitivity: "base"});

const readManifest = (
  folder: string,
  manifestFile: string,
): IngestManifest | undefined => {
  const path = resolve(folder, manifestFile);
  if (!existsSync(path)) return undefined;

  const parsed = JSON.parse(readFileSync(path, "utf8")) as IngestManifest;
  return parsed;
};

const assetUri = (
  sourcePrefix: string,
  relativePath: string,
): string => {
  const normalizedPrefix = sourcePrefix.replace(/\/$/, "");
  return `${normalizedPrefix}/${relativePath}`;
};

export const ingestFolder = (
  folder: string,
  options: IngestFolderOptions,
): DeckSpec => {
  const root = resolve(folder);

  if (!existsSync(root) || !statSync(root).isDirectory()) {
    throw new Error(`Ingest source is not a directory: ${root}`);
  }

  const recursive = options.recursive ?? true;
  const allowed = new Set(
    (options.includeExtensions ?? DEFAULT_EXTENSIONS).map((ext) =>
      ext.toLowerCase().startsWith(".") ? ext.toLowerCase() : `.${ext.toLowerCase()}`,
    ),
  );

  const manifestFile = options.manifestFile ?? "playdeck.json";
  const manifest = readManifest(root, manifestFile);

  const relativeFiles = walk(root, recursive)
    .map((absolute) => normalizeRelative(relative(root, absolute)))
    .filter((path) => path !== manifestFile)
    .filter((path) => allowed.has(extname(path).toLowerCase()))
    .sort(natural);

  if (relativeFiles.length === 0) {
    throw new Error(`No supported image files found in ${root}`);
  }

  const sourcePrefix =
    options.sourcePrefix ?? `asset://${options.deckId}`;

  const usedIds = new Set<string>();

  const cards: CardSpec[] = relativeFiles.map((relativePath) => {
    const override: IngestCardOverride =
      manifest?.cards?.[relativePath] ?? {};

    const baseId = override.id ?? slugify(relativePath);
    let id = baseId;
    let suffix = 2;

    while (usedIds.has(id)) {
      id = `${baseId}-${suffix}`;
      suffix += 1;
    }
    usedIds.add(id);

    const traits = unique([
      ...(manifest?.defaults?.traits ?? []),
      ...(override.traits ?? []),
    ]);

    const temperament = unique([
      ...(manifest?.defaults?.temperament ?? []),
      ...(override.temperament ?? []),
    ]);

    const source = assetUri(sourcePrefix, relativePath);

    return {
      id,
      source,
      front: {source},
      traits: traits.length ? traits : undefined,
      temperament: temperament.length ? temperament : undefined,
      permissions: mergePermissions(
        manifest?.defaults?.permissions,
        override.permissions,
      ),
      metadata: {
        ...(manifest?.defaults?.metadata ?? {}),
        ...(override.metadata ?? {}),
        ingest: {
          relativePath,
          fileName: basename(relativePath),
          extension: extname(relativePath).toLowerCase(),
          filenameHint: slugify(relativePath),
          semanticAuthority: "manifest-only",
        },
      },
    };
  });

  return {
    schemaVersion: "0.1",
    id: options.deckId,
    title: options.title ?? manifest?.title ?? options.deckId,
    cards,
    order: cards.map((card) => card.id),
    metadata: {
      ...(manifest?.metadata ?? {}),
      ingest: {
        sourceFolder: root,
        sourcePrefix,
        recursive,
        manifestFile: manifest ? manifestFile : null,
        cardCount: cards.length,
        filenameHintsAreSemanticAuthority: false,
      },
    },
  };
};
