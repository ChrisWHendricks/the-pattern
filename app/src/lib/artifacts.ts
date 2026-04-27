export type Artifact = {
  id: string;
  filename: string;       // original display name, e.g. "contract.pdf"
  storedPath: string;     // vault-relative: ".pattern/artifacts/{id}.{ext}"
  mimeType: string;       // "application/pdf" | "image/png" | "image/jpeg" | etc.
  linkedPaths: string[];  // absolute inscription file paths
  sizeBytes: number;
  createdAt: string;
};

export function artifactTypeIcon(mimeType: string): string {
  if (mimeType === "application/pdf") return "◨";
  if (mimeType.startsWith("image/")) return "◩";
  return "◫";
}

export function artifactTypeLabel(mimeType: string): string {
  if (mimeType === "application/pdf") return "PDF";
  if (mimeType.startsWith("image/")) return "Image";
  return "File";
}

export function vaultFileUrl(absPath: string): string {
  // Encode each path segment so spaces and special chars are safe in a URL,
  // but preserve slashes so the handler can reconstruct the absolute path.
  const encoded = absPath.split("/").map((s) => encodeURIComponent(s)).join("/");
  return `vault://localhost${encoded}`;
}

export function mimeFromExtension(ext: string): string {
  switch (ext.toLowerCase()) {
    case "pdf": return "application/pdf";
    case "png": return "image/png";
    case "jpg":
    case "jpeg": return "image/jpeg";
    case "gif": return "image/gif";
    case "webp": return "image/webp";
    default: return "application/octet-stream";
  }
}
