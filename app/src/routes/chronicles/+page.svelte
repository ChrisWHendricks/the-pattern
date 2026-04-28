<script lang="ts">
  import { onMount } from "svelte";
  import { chronicles } from "$lib/stores/chronicles.svelte";
  import { settings } from "$lib/stores/settings.svelte";
  import Editor from "$lib/components/Editor.svelte";
  import OberonChat from "$lib/components/OberonChat.svelte";

  let chatOpen = $state(false);
  const hidePanel = $derived(settings.knowledgeView === "contextual");

  onMount(async () => {
    if (settings.vaultPath) {
      await chronicles.init();
    }
  });

  function formatHeading(dateStr: string): string {
    if (dateStr === chronicles.todayStr) return "Today";
    const d = new Date(dateStr + "T12:00:00");
    return d.toLocaleDateString("en-US", {
      weekday: "long", month: "long", day: "numeric",
    });
  }
</script>

<div class="chronicles-layout">
  <!-- Entry list -->
  {#if !hidePanel}
  <div class="entry-list">
    <div class="list-header">
      <span class="list-title">Chronicles</span>
    </div>

    {#if !settings.vaultPath}
      <div class="list-empty">
        <p>Set your vault path in Settings first.</p>
        <button class="link-btn" onclick={() => settings.openSettings()}>Open Settings →</button>
      </div>
    {:else if chronicles.entries.length === 0}
      <div class="list-empty"><p>Loading…</p></div>
    {:else}
      <ul class="entries">
        {#each chronicles.entries as entry (entry.dateStr)}
          <li>
            <button
              class="entry-item"
              class:active={chronicles.activeDate === entry.dateStr}
              class:today={entry.dateStr === chronicles.todayStr}
              onclick={() => chronicles.loadEntry(entry.dateStr)}
            >
              <span class="entry-label">{entry.label}</span>
              {#if chronicles.activeDate === entry.dateStr && chronicles.isDirty}
                <span class="dirty-dot"></span>
              {/if}
            </button>
          </li>
        {/each}
      </ul>
    {/if}
  </div>
  {/if}

  <!-- Editor area -->
  <div class="editor-area">
    {#if !settings.vaultPath}
      <div class="no-vault">
        <div class="no-vault-icon">◫</div>
        <h2>No vault configured</h2>
        <p>Set your vault path in Settings to start your chronicles.</p>
        <button class="cta-btn" onclick={() => settings.openSettings()}>Open Settings →</button>
      </div>
    {:else if chronicles.isLoading}
      <div class="loading">Loading…</div>
    {:else}
      <div class="entry-heading">
        <span class="entry-date">{formatHeading(chronicles.activeDate)}</span>
        {#if chronicles.activeDate === chronicles.todayStr}
          <span class="today-badge">Today</span>
        {/if}
      </div>

      {#key chronicles.activeDate}
        <Editor
          content={chronicles.content}
          onSave={(md) => chronicles.save(md)}
          onDirty={() => chronicles.markDirty()}
          saving={chronicles.isSaving}
          {chatOpen}
          onToggleChat={() => (chatOpen = !chatOpen)}
        />
      {/key}
    {/if}
  </div>

  {#if chatOpen}
    <div class="chat-panel">
      <OberonChat />
    </div>
  {/if}
</div>

{#if chronicles.error}
  <div class="toast-error">{chronicles.error}</div>
{/if}

<style>
  .chronicles-layout {
    flex: 1;
    display: flex;
    min-height: 0;
    overflow: hidden;
  }

  .entry-list {
    width: 180px;
    min-width: 180px;
    border-right: 1px solid var(--border);
    display: flex;
    flex-direction: column;
    background: var(--sidebar-bg);
    overflow: hidden;
  }

  .list-header {
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

  .list-empty {
    padding: 16px 12px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .list-empty p {
    font-size: 12px;
    color: var(--text-dim);
    margin: 0;
    line-height: 1.5;
  }

  .link-btn {
    background: none;
    border: none;
    color: var(--accent);
    font-size: 11px;
    cursor: pointer;
    padding: 0;
    text-align: left;
  }

  .entries {
    flex: 1;
    overflow-y: auto;
    list-style: none;
    padding: 6px;
    margin: 0;
  }

  .entry-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    padding: 7px 8px;
    border: none;
    border-radius: 6px;
    background: transparent;
    color: var(--text-muted);
    font-size: 12px;
    text-align: left;
    cursor: pointer;
    transition: background 0.1s, color 0.1s;
  }

  .entry-item:hover { background: var(--surface-hover); color: var(--text); }
  .entry-item.active { background: var(--surface-hover); color: var(--text); }

  .entry-item.today .entry-label {
    color: var(--accent);
    font-weight: 600;
  }

  .dirty-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--accent);
    flex-shrink: 0;
  }

  .editor-area {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-width: 0;
    overflow: hidden;
  }

  .entry-heading {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 12px 24px 0;
    flex-shrink: 0;
  }

  .entry-date {
    font-size: 18px;
    font-weight: 700;
    color: var(--text);
  }

  .today-badge {
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--accent);
    background: color-mix(in srgb, var(--accent) 12%, transparent);
    padding: 2px 8px;
    border-radius: 10px;
  }

  .no-vault {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 12px;
    padding: 40px;
    text-align: center;
  }

  .no-vault-icon { font-size: 40px; color: var(--text-dim); opacity: 0.5; }
  .no-vault h2 { margin: 0; font-size: 18px; font-weight: 600; color: var(--text); }
  .no-vault p { margin: 0; font-size: 13px; color: var(--text-muted); max-width: 260px; line-height: 1.6; }

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

  .loading { padding: 20px 24px; font-size: 13px; color: var(--text-dim); }

  .chat-panel {
    width: 340px;
    min-width: 340px;
    border-left: 1px solid var(--border);
    display: flex;
    flex-direction: column;
    min-height: 0;
    overflow: hidden;
  }

  .toast-error {
    position: fixed;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: color-mix(in srgb, #ef4444 15%, var(--surface));
    border: 1px solid color-mix(in srgb, #ef4444 30%, transparent);
    color: #fca5a5;
    padding: 8px 16px;
    border-radius: 8px;
    font-size: 12px;
    z-index: 200;
  }
</style>
