import { triageBrainDump, type TriageItem, type TriageCategory } from "$lib/claude";
import { settings } from "$lib/stores/settings.svelte";
import { commitments } from "$lib/stores/commitments.svelte";
import { sparks } from "$lib/stores/sparks.svelte";
import { vault } from "$lib/stores/vault.svelte";
import { loadChronicleEntry, saveChronicleEntry, todayDateStr, titleToFilename } from "$lib/vault";
import { invoke } from "@tauri-apps/api/core";

export type { TriageItem, TriageCategory };

type Phase = "idle" | "triaging" | "triage";

function createBrainDumpStore() {
  let phase = $state<Phase>("idle");
  let triageItems = $state<TriageItem[]>([]);
  let claimedSet = $state<Set<number>>(new Set());
  let error = $state<string | null>(null);

  async function triage(text: string) {
    const lines = text
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    if (lines.length === 0 || !settings.apiKey) return;

    phase = "triaging";
    error = null;
    try {
      triageItems = await triageBrainDump(settings.apiKey, lines);
      claimedSet = new Set();
      phase = "triage";
    } catch (e) {
      error = e instanceof Error ? e.message : "Triage failed";
      phase = "idle";
    }
  }

  async function claimItem(index: number): Promise<boolean> {
    const item = triageItems[index];
    if (!item || claimedSet.has(index)) return false;

    try {
      switch (item.category) {
        case "commitment":
          commitments.add({ text: item.text });
          break;

        case "spark":
          sparks.add(item.text);
          break;

        case "chronicle": {
          if (!settings.vaultPath) break;
          const existing = await loadChronicleEntry(settings.vaultPath, todayDateStr());
          const appended = existing.trimEnd() + "\n\n" + item.text.trim();
          await saveChronicleEntry(settings.vaultPath, todayDateStr(), appended);
          break;
        }

        case "inscription": {
          if (!settings.vaultPath) break;
          const title = item.text.length > 60
            ? item.text.slice(0, 57).trimEnd() + "…"
            : item.text;
          const slug = titleToFilename(title);
          const destPath = `${settings.vaultPath}/${slug}.md`;
          const content = `# ${title}\n\n${item.text.trim()}`;
          await invoke("write_text_file", { path: destPath, content });
          await vault.loadInscriptions();
          break;
        }

        case "discard":
          // Nothing to do — mark claimed to remove it from view
          break;
      }

      claimedSet = new Set([...claimedSet, index]);
      return true;
    } catch {
      return false;
    }
  }

  function reset() {
    phase = "idle";
    triageItems = [];
    claimedSet = new Set();
    error = null;
  }

  return {
    get phase() { return phase; },
    get triageItems() { return triageItems; },
    get claimed() { return claimedSet; },
    get error() { return error; },
    get unclaimedCount() {
      return triageItems.filter((_, i) => !claimedSet.has(i)).length;
    },
    triage,
    claimItem,
    reset,
  };
}

export const brainDumpStore = createBrainDumpStore();
