import {
  listInscriptions,
  readInscription,
  writeInscription,
  createInscription,
  deleteInscription,
  renameAndWrite,
  titleToFilename,
  type InscriptionFile,
} from "$lib/vault";
import { exists } from "@tauri-apps/plugin-fs";
import { settings } from "$lib/stores/settings.svelte";
import type { IndexedInscription } from "$lib/search";

function createVaultStore() {
  let inscriptions = $state<InscriptionFile[]>([]);
  let searchIndex = $state<IndexedInscription[]>([]);
  let currentInscription = $state<InscriptionFile | null>(null);
  let currentContent = $state("");
  let isLoading = $state(false);
  let isSaving = $state(false);
  let isIndexing = $state(false);
  let isDirty = $state(false);
  let error = $state<string | null>(null);

  async function buildSearchIndex(list: InscriptionFile[]) {
    if (list.length === 0) return;
    isIndexing = true;
    const indexed: IndexedInscription[] = [];

    for (const inscription of list) {
      try {
        const content = await readInscription(inscription.path);
        indexed.push({ path: inscription.path, title: inscription.title, content });
      } catch {
        // Skip unreadable files
      }
    }

    searchIndex = indexed;
    isIndexing = false;
  }

  async function loadInscriptions() {
    if (!settings.vaultPath) return;
    isLoading = true;
    error = null;
    try {
      inscriptions = await listInscriptions(settings.vaultPath);
      buildSearchIndex(inscriptions);
    } catch (e) {
      error = e instanceof Error ? e.message : "Failed to load inscriptions";
    } finally {
      isLoading = false;
    }
  }

  async function openInscription(inscription: InscriptionFile) {
    isLoading = true;
    error = null;
    try {
      currentContent = await readInscription(inscription.path);
      currentInscription = inscription;
      isDirty = false;

      const idx = searchIndex.findIndex((n) => n.path === inscription.path);
      if (idx !== -1) {
        searchIndex[idx].content = currentContent;
      } else {
        searchIndex.push({ path: inscription.path, title: inscription.title, content: currentContent });
      }
    } catch (e) {
      error = e instanceof Error ? e.message : "Failed to open inscription";
    } finally {
      isLoading = false;
    }
  }

  async function saveCurrentInscription(content: string) {
    if (!currentInscription || !settings.vaultPath) return;
    isSaving = true;
    try {
      const titleMatch = content.match(/^#\s+(.+)/m);
      const newTitle = titleMatch ? titleMatch[1].trim() : currentInscription.title;
      const desiredSlug = titleToFilename(newTitle);
      const oldPath = currentInscription.path;

      const shouldRename = desiredSlug !== currentInscription.name;
      const newPath = `${settings.vaultPath}/${desiredSlug}.md`;
      const pathConflict = shouldRename && newPath !== oldPath && await exists(newPath);

      if (shouldRename && !pathConflict) {
        await renameAndWrite(oldPath, newPath, content);
        const renamed: InscriptionFile = { name: desiredSlug, path: newPath, title: newTitle };
        currentInscription = renamed;

        const listIdx = inscriptions.findIndex((n) => n.path === oldPath);
        if (listIdx !== -1) inscriptions[listIdx] = renamed;

        const idxEntry = searchIndex.findIndex((n) => n.path === oldPath);
        if (idxEntry !== -1) searchIndex[idxEntry] = { path: newPath, title: newTitle, content };
      } else {
        await writeInscription(oldPath, content);

        const listIdx = inscriptions.findIndex((n) => n.path === oldPath);
        if (listIdx !== -1) inscriptions[listIdx].title = newTitle;

        const idxEntry = searchIndex.findIndex((n) => n.path === oldPath);
        if (idxEntry !== -1) {
          searchIndex[idxEntry].content = content;
          searchIndex[idxEntry].title = newTitle;
        }
      }

      currentContent = content;
      isDirty = false;
    } catch (e) {
      error = e instanceof Error ? e.message : "Failed to save inscription";
    } finally {
      isSaving = false;
    }
  }

  async function newInscription() {
    if (!settings.vaultPath) return;
    try {
      const inscription = await createInscription(settings.vaultPath);
      inscriptions.unshift(inscription);
      searchIndex.push({ path: inscription.path, title: inscription.title, content: "# New Inscription\n\n" });
      await openInscription(inscription);
    } catch (e) {
      error = e instanceof Error ? e.message : "Failed to create inscription";
    }
  }

  function markDirty() {
    isDirty = true;
  }

  return {
    get inscriptions() { return inscriptions; },
    get searchIndex() { return searchIndex; },
    get currentInscription() { return currentInscription; },
    get currentContent() { return currentContent; },
    get isLoading() { return isLoading; },
    get isSaving() { return isSaving; },
    get isIndexing() { return isIndexing; },
    get isDirty() { return isDirty; },
    get error() { return error; },
    get indexSize() { return searchIndex.length; },
    loadInscriptions,
    openInscription,
    saveCurrentInscription,
    newInscription,
    markDirty,
    // legacy aliases used by quick-capture in +layout.svelte
    get currentNote() { return currentInscription; },
    saveCurrentNote: saveCurrentInscription,
    newNote: newInscription,
  };
}

export const vault = createVaultStore();
