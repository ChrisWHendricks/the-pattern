<script lang="ts">
  import { vault } from "$lib/stores/vault.svelte";
  import { settings } from "$lib/stores/settings.svelte";

  function noVaultConfigured() {
    return !settings.vaultPath;
  }
</script>

<div class="notes-list">
  <div class="list-header">
    <span class="list-title">Notes</span>
    <button
      class="new-btn"
      onclick={() => vault.newNote()}
      disabled={!settings.vaultPath}
      title="New note"
    >+</button>
  </div>

  {#if noVaultConfigured()}
    <div class="empty-state">
      <p>Set your vault path in Settings to get started.</p>
      <button class="link-btn" onclick={() => settings.openSettings()}>
        Open Settings →
      </button>
    </div>
  {:else if vault.isLoading && vault.notes.length === 0}
    <div class="loading">Loading notes…</div>
  {:else if vault.notes.length === 0}
    <div class="empty-state">
      <p>No notes yet.</p>
      <button class="link-btn" onclick={() => vault.newNote()}>
        Create your first note →
      </button>
    </div>
  {:else}
    <ul class="note-items">
      {#each vault.notes as note (note.path)}
        <li>
          <button
            class="note-item"
            class:active={vault.currentNote?.path === note.path}
            onclick={() => vault.openNote(note)}
          >
            <span class="note-icon">◻</span>
            <span class="note-title">{note.title}</span>
            {#if vault.currentNote?.path === note.path && vault.isDirty}
              <span class="dirty-dot" title="Unsaved changes"></span>
            {/if}
          </button>
        </li>
      {/each}
    </ul>
  {/if}

  {#if vault.error}
    <div class="error-msg">{vault.error}</div>
  {/if}
</div>

<style>
  .notes-list {
    width: 220px;
    min-width: 220px;
    height: 100%;
    border-right: 1px solid var(--border);
    display: flex;
    flex-direction: column;
    background: var(--sidebar-bg);
    overflow: hidden;
  }

  .list-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 14px 14px 10px;
    border-bottom: 1px solid var(--border);
    flex-shrink: 0;
  }

  .list-title {
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--text-dim);
  }

  .new-btn {
    width: 22px;
    height: 22px;
    border-radius: 5px;
    border: 1px solid var(--border);
    background: transparent;
    color: var(--text-muted);
    font-size: 16px;
    line-height: 1;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: color 0.15s, border-color 0.15s;
  }

  .new-btn:hover {
    color: var(--accent);
    border-color: var(--accent);
  }

  .new-btn:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }

  .note-items {
    flex: 1;
    overflow-y: auto;
    list-style: none;
    padding: 6px 6px;
  }

  .note-item {
    display: flex;
    align-items: center;
    gap: 7px;
    width: 100%;
    padding: 6px 8px;
    border: none;
    border-radius: 6px;
    background: transparent;
    color: var(--text-muted);
    font-size: 12px;
    text-align: left;
    cursor: pointer;
    transition: background 0.1s, color 0.1s;
    overflow: hidden;
  }

  .note-item:hover {
    background: var(--surface-hover);
    color: var(--text);
  }

  .note-item.active {
    background: var(--surface-hover);
    color: var(--text);
  }

  .note-icon {
    font-size: 11px;
    flex-shrink: 0;
    color: var(--text-dim);
  }

  .note-item.active .note-icon {
    color: var(--accent);
  }

  .note-title {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .dirty-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--accent);
    flex-shrink: 0;
  }

  .empty-state {
    padding: 20px 14px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .empty-state p {
    font-size: 12px;
    color: var(--text-dim);
    line-height: 1.5;
    margin: 0;
  }

  .link-btn {
    background: none;
    border: none;
    color: var(--accent);
    font-size: 11px;
    cursor: pointer;
    padding: 0;
    text-align: left;
    opacity: 0.8;
    transition: opacity 0.15s;
  }

  .link-btn:hover { opacity: 1; }

  .loading {
    padding: 20px 14px;
    font-size: 12px;
    color: var(--text-dim);
  }

  .error-msg {
    margin: 8px;
    padding: 8px 10px;
    background: color-mix(in srgb, #ef4444 10%, transparent);
    border-radius: 6px;
    font-size: 11px;
    color: #fca5a5;
  }
</style>
