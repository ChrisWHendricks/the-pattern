<script lang="ts">
  import { onMount } from "svelte";
  import { vault } from "$lib/stores/vault.svelte";
  import { settings } from "$lib/stores/settings.svelte";
  import NotesList from "$lib/components/NotesList.svelte";
  import Editor from "$lib/components/Editor.svelte";

  onMount(async () => {
    if (settings.vaultPath) {
      await vault.loadNotes();
    }
  });

  async function handleSave(markdown: string) {
    await vault.saveCurrentNote(markdown);
  }
</script>

<div class="notes-page">
  <NotesList />

  <div class="editor-area">
    {#if !settings.vaultPath}
      <div class="no-vault">
        <div class="no-vault-icon">◻</div>
        <h2>No vault configured</h2>
        <p>Set your vault path in Settings to start creating notes.</p>
        <button class="cta-btn" onclick={() => settings.openSettings()}>
          Open Settings →
        </button>
      </div>
    {:else if vault.currentNote}
      {#key vault.currentNote.path}
        <Editor
          content={vault.currentContent}
          onSave={handleSave}
          onDirty={() => vault.markDirty()}
          saving={vault.isSaving}
        />
      {/key}
    {:else}
      <div class="no-note">
        <div class="no-note-icon">◻</div>
        <p>Select a note or create a new one</p>
        <button class="cta-btn" onclick={() => vault.newNote()}>
          New note +
        </button>
      </div>
    {/if}
  </div>
</div>

<style>
  .notes-page {
    flex: 1;
    display: flex;
    min-height: 0;
    overflow: hidden;
  }

  .editor-area {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-width: 0;
    overflow: hidden;
  }

  .no-vault,
  .no-note {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 12px;
    padding: 40px;
    text-align: center;
  }

  .no-vault-icon,
  .no-note-icon {
    font-size: 40px;
    color: var(--text-dim);
    opacity: 0.5;
  }

  .no-vault h2 {
    margin: 0;
    font-size: 18px;
    font-weight: 600;
    color: var(--text);
  }

  .no-vault p,
  .no-note p {
    margin: 0;
    font-size: 13px;
    color: var(--text-muted);
    max-width: 260px;
    line-height: 1.6;
  }

  .cta-btn {
    margin-top: 4px;
    padding: 8px 20px;
    background: var(--accent);
    border: none;
    border-radius: 8px;
    color: #000;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    transition: opacity 0.15s;
  }

  .cta-btn:hover { opacity: 0.9; }
</style>
