import { readTextFile, writeTextFile } from "@tauri-apps/plugin-fs";
import { ensureDir } from "$lib/vault";

export type Shadow = {
  id: string;
  name: string;
  description: string;
  coverImage: string | null;
  createdAt: string;
};

export type ShadowAssignments = Record<string, string[]>; // shadowId → inscription paths

function patternDir(vaultPath: string): string {
  return `${vaultPath}/.pattern`;
}

export async function loadShadows(vaultPath: string): Promise<Shadow[]> {
  await ensureDir(patternDir(vaultPath));
  try {
    return JSON.parse(await readTextFile(`${patternDir(vaultPath)}/shadows.json`));
  } catch {
    return [];
  }
}

export async function saveShadows(vaultPath: string, shadows: Shadow[]): Promise<void> {
  await ensureDir(patternDir(vaultPath));
  await writeTextFile(`${patternDir(vaultPath)}/shadows.json`, JSON.stringify(shadows, null, 2));
}

export async function loadAssignments(vaultPath: string): Promise<ShadowAssignments> {
  await ensureDir(patternDir(vaultPath));
  try {
    return JSON.parse(await readTextFile(`${patternDir(vaultPath)}/assignments.json`));
  } catch {
    return {};
  }
}

export async function saveAssignments(vaultPath: string, assignments: ShadowAssignments): Promise<void> {
  await ensureDir(patternDir(vaultPath));
  await writeTextFile(`${patternDir(vaultPath)}/assignments.json`, JSON.stringify(assignments, null, 2));
}

export function nameToGradient(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = ((hash << 5) - hash) + name.charCodeAt(i);
    hash = hash & hash;
  }
  const hue = Math.abs(hash) % 360;
  const hue2 = (hue + 48) % 360;
  return `linear-gradient(135deg, hsl(${hue}, 48%, 18%) 0%, hsl(${hue2}, 62%, 30%) 100%)`;
}

export function resolveCoverStyle(shadow: Shadow, vaultPath: string): string {
  if (!shadow.coverImage) return nameToGradient(shadow.name);
  const src = shadow.coverImage;
  if (src.startsWith("http://") || src.startsWith("https://") || src.startsWith("file://")) {
    return `url("${src}") center/cover no-repeat`;
  }
  return `url("file://${vaultPath}/${src}") center/cover no-repeat`;
}
