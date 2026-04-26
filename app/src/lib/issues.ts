import { readTextFile, writeTextFile } from "@tauri-apps/plugin-fs";
import { ensureDir } from "$lib/vault";

export type AppIssue = {
  id: string;
  type: "defect" | "feature";
  title: string;
  description: string;
  status: "open" | "in-progress" | "done";
  createdAt: string;
  updatedAt?: string;
};

function patternDir(vaultPath: string): string {
  return `${vaultPath}/.pattern`;
}

export async function loadIssues(vaultPath: string): Promise<AppIssue[]> {
  await ensureDir(patternDir(vaultPath));
  try {
    return JSON.parse(await readTextFile(`${patternDir(vaultPath)}/issues.json`));
  } catch {
    return [];
  }
}

export async function saveIssues(vaultPath: string, issues: AppIssue[]): Promise<void> {
  await ensureDir(patternDir(vaultPath));
  await writeTextFile(`${patternDir(vaultPath)}/issues.json`, JSON.stringify(issues, null, 2));
}
