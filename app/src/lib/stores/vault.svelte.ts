import {
  listNotes,
  readNote,
  writeNote,
  createNote,
  type NoteFile,
} from "$lib/vault";
import { settings } from "$lib/stores/settings.svelte";

function createVaultStore() {
  let notes = $state<NoteFile[]>([]);
  let currentNote = $state<NoteFile | null>(null);
  let currentContent = $state("");
  let isLoading = $state(false);
  let isSaving = $state(false);
  let isDirty = $state(false);
  let error = $state<string | null>(null);

  async function loadNotes() {
    if (!settings.vaultPath) return;
    isLoading = true;
    error = null;
    try {
      notes = await listNotes(settings.vaultPath);
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
    } catch (e) {
      error = e instanceof Error ? e.message : "Failed to open note";
    } finally {
      isLoading = false;
    }
  }

  async function saveCurrentNote(content: string) {
    if (!currentNote) return;
    isSaving = true;
    try {
      await writeNote(currentNote.path, content);
      currentContent = content;
      isDirty = false;

      // Refresh title in list
      const idx = notes.findIndex((n) => n.path === currentNote!.path);
      if (idx !== -1) {
        const titleMatch = content.match(/^#\s+(.+)/m);
        if (titleMatch) notes[idx].title = titleMatch[1].trim();
      }
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
    get currentNote() { return currentNote; },
    get currentContent() { return currentContent; },
    get isLoading() { return isLoading; },
    get isSaving() { return isSaving; },
    get isDirty() { return isDirty; },
    get error() { return error; },
    loadNotes,
    openNote,
    saveCurrentNote,
    newNote,
    markDirty,
  };
}

export const vault = createVaultStore();
