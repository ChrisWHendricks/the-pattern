import { mimeFromExtension } from "$lib/artifacts";

export type LogrusItemType = "inscription" | "artifact";

export type LogrusItem = {
  path: string;
  name: string;      // display name without extension
  filename: string;  // full filename with extension
  ext: string;
  type: LogrusItemType;
  mimeType: string;
};

const ARTIFACT_EXTS = new Set(["pdf", "png", "jpg", "jpeg", "gif", "webp"]);
const INSCRIPTION_EXTS = new Set(["md", "txt", ""]);

export function logrusFolder(vaultPath: string): string {
  return `${vaultPath}/logrus`;
}

export function itemFromPath(filePath: string): LogrusItem | null {
  const filename = filePath.split("/").pop() ?? "";
  if (filename.startsWith(".") || filename.startsWith("_")) return null;

  const dotIdx = filename.lastIndexOf(".");
  const ext = dotIdx >= 0 ? filename.slice(dotIdx + 1).toLowerCase() : "";
  const name = dotIdx >= 0 ? filename.slice(0, dotIdx) : filename;

  if (ARTIFACT_EXTS.has(ext)) {
    return { path: filePath, name, filename, ext, type: "artifact", mimeType: mimeFromExtension(ext) };
  }
  if (INSCRIPTION_EXTS.has(ext)) {
    return { path: filePath, name, filename, ext, type: "inscription", mimeType: "text/markdown" };
  }
  return null;
}

export function logrusIcon(item: LogrusItem): string {
  if (item.mimeType === "application/pdf") return "◨";
  if (item.mimeType.startsWith("image/")) return "◩";
  return "◻";
}
