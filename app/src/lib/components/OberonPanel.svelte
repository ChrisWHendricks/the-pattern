<script lang="ts">
  import { conversation } from "$lib/stores/conversation.svelte";
  import { layoutStore } from "$lib/stores/layout.svelte";
  import OberonChat from "./OberonChat.svelte";
</script>

<div class="oberon-panel">
  <div class="panel-header">
    <div class="header-left">
      <span class="panel-icon">◈</span>
      <span class="panel-title">OBERON</span>
      {#if conversation.mode === "coach"}
        <span class="mode-badge">Coach</span>
      {/if}
    </div>
    <div class="header-right">
      {#if conversation.messages.length > 1}
        <button
          class="icon-btn"
          disabled={conversation.isSummarizing}
          onclick={() => conversation.startNewSession()}
          title={conversation.isSummarizing ? "Saving memory…" : "New session"}
        >
          {conversation.isSummarizing ? "…" : "↺"}
        </button>
      {/if}
      <button
        class="icon-btn close-btn"
        onclick={() => layoutStore.toggleOberon()}
        title="Close Oberon"
      >✕</button>
    </div>
  </div>

  <OberonChat />
</div>

<style>
  .oberon-panel {
    display: flex;
    flex-direction: column;
    height: 100%;
    overflow: hidden;
    background: var(--bg);
  }

  .panel-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 12px;
    height: 44px;
    border-bottom: 1px solid var(--border);
    background: var(--surface);
    flex-shrink: 0;
  }

  .header-left {
    display: flex;
    align-items: center;
    gap: 7px;
  }

  .panel-icon {
    font-size: 13px;
    color: var(--oberon);
    opacity: 0.8;
  }

  .panel-title {
    font-size: 9px;
    font-weight: 700;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--oberon);
  }

  .mode-badge {
    font-size: 9px;
    padding: 1px 6px;
    border-radius: 8px;
    background: color-mix(in srgb, var(--oberon) 15%, transparent);
    color: var(--oberon);
    font-weight: 600;
    letter-spacing: 0.04em;
  }

  .header-right {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .icon-btn {
    background: none;
    border: none;
    color: var(--text-dim);
    font-size: 13px;
    cursor: pointer;
    padding: 4px 7px;
    border-radius: 5px;
    line-height: 1;
    transition: color 0.12s, background 0.12s;
  }

  .icon-btn:hover {
    color: var(--text);
    background: var(--surface-hover);
  }

  .icon-btn:disabled {
    opacity: 0.4;
    cursor: default;
  }

  .close-btn:hover {
    color: #f87171;
    background: color-mix(in srgb, #f87171 10%, transparent);
  }
</style>
