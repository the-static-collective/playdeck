import {parseBundleStrings} from "./bundle";
import type {StudioBundle} from "./types";

type FileRecord = {
  file: File;
  relative: string;
};

const normalize = (value: string) =>
  value.replaceAll("\\", "/").replace(/^\.\//, "");

const stripRoot = (value: string) => {
  const parts = normalize(value).split("/");
  return parts.length > 1 ? parts.slice(1).join("/") : parts[0];
};

const fileRecords = (files: FileList): FileRecord[] =>
  Array.from(files).map((file) => ({
    file,
    relative: stripRoot(file.webkitRelativePath || file.name),
  }));

const textLike = (name: string) =>
  /\.(json|txt|md)$/i.test(name);

export type BrowserStudioBundle = StudioBundle & {
  assetUrls: Record<string, string>;
  assetFiles: Record<string, File>;
  dispose: () => void;
};

export const loadBrowserBundle = async (
  files: FileList,
): Promise<BrowserStudioBundle> => {
  const records = fileRecords(files);

  if (records.length === 0) {
    throw new Error("No files were selected.");
  }

  const entries: Record<string, string> = {};
  for (const record of records) {
    if (textLike(record.relative)) {
      entries[record.relative] = await record.file.text();
    }
  }

  const firstPath =
    records[0].file.webkitRelativePath || records[0].file.name;
  const bundleName = normalize(firstPath).split("/")[0];

  const bundle = parseBundleStrings(entries, bundleName);
  const byRelative = new Map(
    records.map((record) => [normalize(record.relative), record.file]),
  );

  const assetUrls: Record<string, string> = {};
  const assetFiles: Record<string, File> = {};
  const created: string[] = [];

  for (const [logical, relative] of Object.entries(
    bundle.assetBindings,
  )) {
    const file = byRelative.get(normalize(relative));
    if (!file) continue;

    const url = URL.createObjectURL(file);
    created.push(url);
    assetUrls[logical] = url;
    assetFiles[logical] = file;
  }

  return {
    ...bundle,
    assetUrls,
    assetFiles,
    dispose: () => {
      created.forEach((url) => URL.revokeObjectURL(url));
    },
  };
};
