<script lang="ts">
  import { goto } from "$app/navigation";
  import { vault } from "$lib/stores/vault.svelte";
  import { findOpenLoops } from "$lib/openLoops";

  const MAX_VISIBLE = 6;

  const loops = $derived(findOpenLoops(vault.searchIndex, MAX_VISIBLE + 3));
  const visible = $derived(loops.slice(0, MAX_VISIBLE));
  const overflow = $derived(Math.max(0, loops.length - MAX_VISIBLE));
</script>

<div class="zone zone-loops">
  <div class="zone-header">
    <span class="zone-title">⊙ OPEN LOOPS</span>
    {#if loops.length > 0}
      <span class="zone-count">{loops.length}</span>
    {/if}
  </div>

  <div class="zone-body">
    {#if visible.length === 0}
      <span class="empty-hint">No open loops found</span>
    {:else}
      {#each visible as loop, i (i)}
        <div class="loop-row">
          <span class="loop-bullet">□</span>
          <div class="loop-content">
            <span class="loop-text">{loop.text}</span>
            <span class="loop-source">{loop.title}</span>
          </div>
        </div>
      {/each}
      {#if overflow > 0}
        <button class="overflow-link" onclick={() => goto("/inscriptions")}>
          +{overflow} more…
        </button>
      {/if}
    {/if}
  </div>
</div>

<style>
  .zone {
    display: flex;
    flex-direction: column;
    overflow: hidden;
    min-height: 0;
    background: var(--bg);
  }

  .zone-loops {
    grid-area: loops;
  }

  .zone-header {
    height: 34px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 14px;
    border-bottom: 1px solid var(--border);
    background: var(--surface);
    flex-shrink: 0;
  }

  .zone-title {
    font-size: 9px;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--text-dim);
  }

  .zone-count {
    font-size: 10px;
    font-weight: 700;
    padding: 1px 7px;
    border-radius: 10px;
    color: var(--text-muted);
    background: var(--surface-hover);
  }

  .zone-body {
    flex: 1;
    overflow-y: auto;
    padding: 8px 12px;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .loop-row {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    padding: 5px 8px;
    border-radius: 5px;
    transition: background 0.1s;
  }

  .loop-row:hover {
    background: var(--surface-hover);
  }

  .loop-bullet {
    font-size: 11px;
    color: var(--text-dim);
    flex-shrink: 0;
    margin-top: 1px;
  }

  .loop-content {
    display: flex;
    flex-direction: column;
    gap: 1px;
    min-width: 0;
  }

  .loop-text {
    font-size: 12px;
    color: var(--text);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .loop-source {
    font-size: 10px;
    color: var(--text-dim);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .empty-hint {
    font-size: 11px;
    color: var(--text-dim);
    padding: 8px 0;
    font-style: italic;
  }

  .overflow-link {
    background: none;
    border: none;
    cursor: pointer;
    font-size: 11px;
    color: var(--text-dim);
    padding: 4px 0;
    text-align: left;
    transition: color 0.12s;
  }

  .overflow-link:hover { color: var(--accent); }
</style>
