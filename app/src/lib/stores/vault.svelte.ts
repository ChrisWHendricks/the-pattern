import {
  listNotes,
  readNote,
  writeNote,
  createNote,
  deleteNote,
  renameAndWrite,
  titleToFilename,
  type NoteFile,
} from "$lib/vault";
import { exists } from "@tauri-apps/plugin-fs";
import { settings } from "$lib/stores/settings.svelte";
import type { IndexedNote } from "$lib/search";

function createVaultStore() {
  let notes = $state<NoteFile[]>([]);
  let searchIndex = $state<IndexedNote[]>([]);
  let currentNote = $state<NoteFile | null>(null);
  let currentContent = $state("");
  let isLoading = $state(false);
  let isSaving = $state(false);
  let isIndexing = $state(false);
  let isDirty = $state(false);
  let error = $state<string | null>(null);

  async function buildSearchIndex(noteList: NoteFile[]) {
    if (noteList.length === 0) return;
    isIndexing = true;
    const indexed: IndexedNote[] = [];

    for (const note of noteList) {
      try {
        const content = await readNote(note.path);
        indexed.push({ path: note.path, title: note.title, content });
      } catch {
        // Skip unreadable files
      }
    }

    searchIndex = indexed;
    isIndexing = false;
  }

  async function loadNotes() {
    if (!settings.vaultPath) return;
    isLoading = true;
    error = null;
    try {
      notes = await listNotes(settings.vaultPath);
      // Build search index in background — don't await
      buildSearchIndex(notes);
    } catch (e) {
      error = e instanceof Error ? e.message : "Failed to load notes";
    } finally {
      isLoading = false;
    }
  }

  async function openNote(note: NoteFile) {
    isLoading = true;
    error = null;
    try {
      currentContent = await readNote(note.path);
      currentNote = note;
      isDirty = false;

      // Keep index entry fresh
      const idx = searchIndex.findIndex((n) => n.path === note.path);
      if (idx !== -1) {
        searchIndex[idx].content = currentContent;
      } else {
        searchIndex.push({ path: note.path, title: note.title, content: currentContent });
      }
    } catch (e) {
      error = e instanceof Error ? e.message : "Failed to open note";
    } finally {
      isLoading = false;
    }
  }

  async function saveCurrentNote(content: string) {
    if (!currentNote || !settings.vaultPath) return;
    isSaving = true;
    try {
      const titleMatch = content.match(/^#\s+(.+)/m);
      const newTitle = titleMatch ? titleMatch[1].trim() : currentNote.title;
      const desiredSlug = titleToFilename(newTitle);
      const oldPath = currentNote.path;

      // Rename the file if the title slug differs from the current filename
      const shouldRename = desiredSlug !== currentNote.name;
      const newPath = `${settings.vaultPath}/${desiredSlug}.md`;
      const pathConflict = shouldRename && newPath !== oldPath && await exists(newPath);

      if (shouldRename && !pathConflict) {
        await renameAndWrite(oldPath, newPath, content);
        const renamed: NoteFile = { name: desiredSlug, path: newPath, title: newTitle };
        currentNote = renamed;

        const noteIdx = notes.findIndex((n) => n.path === oldPath);
        if (noteIdx !== -1) notes[noteIdx] = renamed;

        const idxEntry = searchIndex.findIndex((n) => n.path === oldPath);
        if (idxEntry !== -1) searchIndex[idxEntry] = { path: newPath, title: newTitle, content };
      } else {
        await writeNote(oldPath, content);

        const noteIdx = notes.findIndex((n) => n.path === oldPath);
        if (noteIdx !== -1) notes[noteIdx].title = newTitle;

        const idxEntry = searchIndex.findIndex((n) => n.path === oldPath);
        if (idxEntry !== -1) {
          searchIndex[idxEntry].content = content;
          searchIndex[idxEntry].title = newTitle;
        }
      }

      currentContent = content;
      isDirty = false;
    } catch (e) {
      error = e instanceof Error ? e.message : "Failed to save note";
    } finally {
      isSaving = false;
    }
  }

  async function newNote() {
    if (!settings.vaultPath) return;
    try {
      const note = await createNote(settings.vaultPath);
      notes.unshift(note);
      searchIndex.push({ path: note.path, title: note.title, content: "# New Note\n\n" });
      await openNote(note);
    } catch (e) {
      error = e instanceof Error ? e.message : "Failed to create note";
    }
  }

  function markDirty() {
    isDirty = true;
  }

  return {
    get notes() { return notes; },
    get searchIndex() { return searchIndex; },
    get currentNote() { return currentNote; },
    get currentContent() { return currentContent; },
    get isLoading() { return isLoading; },
    get isSaving() { return isSaving; },
    get isIndexing() { return isIndexing; },
    get isDirty() { return isDirty; },
    get error() { return error; },
    get indexSize() { return searchIndex.length; },
    loadNotes,
    openNote,
    saveCurrentNote,
    newNote,
    markDirty,
  };
}

export const vault = createVaultStore();
