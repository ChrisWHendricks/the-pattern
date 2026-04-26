import {
  loadJournalEntry,
  saveJournalEntry,
  listJournalDates,
  todayDateStr,
} from "$lib/vault";
import { settings } from "$lib/stores/settings.svelte";

function formatDateLabel(dateStr: string): string {
  const today = todayDateStr();
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  if (dateStr === today) return "Today";
  if (dateStr === yesterday) return "Yesterday";
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

export type JournalEntry = {
  dateStr: string;
  label: string;
};

function createJournalStore() {
  let content = $state("");
  let activeDate = $state(todayDateStr());
  let isLoading = $state(false);
  let isSaving = $state(false);
  let isDirty = $state(false);
  let error = $state<string | null>(null);
  let entries = $state<JournalEntry[]>([]);

  async function loadEntry(dateStr: string) {
    if (!settings.vaultPath) return;
    isLoading = true;
    error = null;
    try {
      content = await loadJournalEntry(settings.vaultPath, dateStr);
      activeDate = dateStr;
      isDirty = false;
    } catch (e) {
      error = e instanceof Error ? e.message : "Failed to load journal entry";
    } finally {
      isLoading = false;
    }
  }

  async function loadRecent() {
    if (!settings.vaultPath) return;
    try {
      const dates = await listJournalDates(settings.vaultPath);
      // Always ensure today is in the list even before it's saved
      const today = todayDateStr();
      const all = dates.includes(today) ? dates : [today, ...dates];
      entries = all.map((d) => ({ dateStr: d, label: formatDateLabel(d) }));
    } catch {
      entries = [{ dateStr: todayDateStr(), label: "Today" }];
    }
  }

  async function init() {
    await loadEntry(todayDateStr());
    await loadRecent();
  }

  async function save(newContent: string) {
    if (!settings.vaultPath) return;
    isSaving = true;
    try {
      await saveJournalEntry(settings.vaultPath, activeDate, newContent);
      content = newContent;
      isDirty = false;
      // Refresh the entry list in case a new date was created
      await loadRecent();
    } catch (e) {
      error = e instanceof Error ? e.message : "Failed to save journal entry";
    } finally {
      isSaving = false;
    }
  }

  function markDirty() {
    isDirty = true;
  }

  return {
    get content() { return content; },
    get activeDate() { return activeDate; },
    get isLoading() { return isLoading; },
    get isSaving() { return isSaving; },
    get isDirty() { return isDirty; },
    get error() { return error; },
    get entries() { return entries; },
    get todayStr() { return todayDateStr(); },
    init,
    loadEntry,
    save,
    markDirty,
  };
}

export const journal = createJournalStore();
