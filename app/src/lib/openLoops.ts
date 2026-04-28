import type { IndexedInscription } from "$lib/search";

export type OpenLoop = { title: string; path: string; text: string };

export function findOpenLoops(index: IndexedInscription[], limit = 8): OpenLoop[] {
  const loops: OpenLoop[] = [];
  for (const entry of index) {
    if (loops.length >= limit) break;
    const lines = entry.content.split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (/^-\s+\[\s+\]/.test(trimmed) || /^TODO:/i.test(trimmed)) {
        const text = trimmed
          .replace(/^-\s+\[\s+\]\s*/, "")
          .replace(/^TODO:\s*/i, "")
          .trim();
        if (text) {
          loops.push({ title: entry.title, path: entry.path, text });
          if (loops.length >= limit) break;
        }
      }
    }
  }
  return loops;
}
