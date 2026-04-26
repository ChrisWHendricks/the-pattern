import {
  readTextFile,
  writeTextFile,
  readDir,
  exists,
  mkdir,
  remove,
} from "@tauri-apps/plugin-fs";

export type NoteFile = {
  name: string;
  path: string;
  title: string;
};

function joinPath(...parts: string[]): string {
  return parts.join("/").replace(/\/+/g, "/");
}

function extractTitle(content: string, fallback: string): string {
  const match = content.match(/^#\s+(.+)/m);
  return match ? match[1].trim() : fallback;
}

export async function ensureDir(path: string): Promise<void> {
  if (!(await exists(path))) {
    await mkdir(path, { recursive: true });
  }
}

export async function listNotes(vaultPath: string): Promise<NoteFile[]> {
  await ensureDir(vaultPath);

  try {
    const entries = await readDir(vaultPath);
    const notes: NoteFile[] = [];

    for (const entry of entries) {
      if (!entry.isFile) continue;
      if (!entry.name.endsWith(".md") && !entry.name.endsWith(".markdown")) continue;

      const path = joinPath(vaultPath, entry.name);
      const displayName = entry.name.replace(/\.(md|markdown)$/, "");

      let title = displayName.replace(/[-_]/g, " ");
      try {
        const content = await readTextFile(path);
        title = extractTitle(content, title);
      } catch {
        // Use fallback title
      }

      notes.push({ name: displayName, path, title });
    }

    return notes.sort((a, b) => b.name.localeCompare(a.name));
  } catch {
    return [];
  }
}

export async function readNote(path: string): Promise<string> {
  return await readTextFile(path);
}

export async function writeNote(path: string, content: string): Promise<void> {
  await writeTextFile(path, content);
}

export async function createNote(vaultPath: string): Promise<NoteFile> {
  await ensureDir(vaultPath);

  const ts = new Date()
    .toISOString()
    .replace(/[:.]/g, "-")
    .slice(0, 19);

  const filename = `${ts}.md`;
  const path = joinPath(vaultPath, filename);
  const content = `# New Note\n\n`;

  await writeTextFile(path, content);

  return { name: ts, path, title: "New Note" };
}

export async function deleteNote(path: string): Promise<void> {
  await remove(path);
}

export function titleToFilename(title: string): string {
  const slug = title
    .trim()
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
  return slug || "untitled";
}

// Write content to newPath then delete oldPath. Caller must verify newPath doesn't exist.
export async function renameAndWrite(
  oldPath: string,
  newPath: string,
  content: string
): Promise<void> {
  await writeTextFile(newPath, content);
  await remove(oldPath);
}
