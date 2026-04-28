<script lang="ts">
  import { goto } from "$app/navigation";
  import { commitments } from "$lib/stores/commitments.svelte";

  const MAX_VISIBLE = 6;
  const visible = $derived(commitments.open.slice(0, MAX_VISIBLE));
  const overflow = $derived(Math.max(0, commitments.open.length - MAX_VISIBLE));

  function formatDue(due?: string | null): string {
    if (!due) return "";
    const d = new Date(due);
    const now = new Date();
    const diff = Math.floor((d.getTime() - now.getTime()) / 86400000);
    if (diff < 0) return "overdue";
    if (diff === 0) return "today";
    if (diff === 1) return "tomorrow";
    if (diff <= 6) return d.toLocaleDateString("en-US", { weekday: "short" });
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }

  function isDueUrgent(due?: string | null): boolean {
    if (!due) return false;
    const diff = Math.floor((new Date(due).getTime() - Date.now()) / 86400000);
    return diff <= 1;
  }
</script>

<div class="zone zone-commitments">
  <div class="zone-header">
    <span class="zone-title">○ COMMITMENTS</span>
    {#if commitments.open.length > 0}
      <span class="zone-count">{commitments.open.length}</span>
    {/if}
  </div>

  <div class="zone-body">
    {#if visible.length === 0}
      <span class="empty-hint">No open commitments</span>
    {:else}
      {#each visible as c (c.id)}
        <div class="commitment-row">
          <button
            class="check-btn"
            onclick={() => commitments.complete(c.id)}
            title="Mark complete"
          >○</button>
          <span class="commitment-text">{c.text}</span>
          <span class="commitment-meta">
            {#if c.person}<span class="meta-person">→ {c.person}</span>{/if}
            {#if c.due}
              <span class="meta-due" class:urgent={isDueUrgent(c.due)}>{formatDue(c.due)}</span>
            {/if}
          </span>
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

  .zone-commitments {
    grid-area: commitments;
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
    color: #f59e0b;
    background: color-mix(in srgb, #f59e0b 12%, transparent);
  }

  .zone-body {
    flex: 1;
    overflow-y: auto;
    padding: 8px 12px;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .commitment-row {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 8px;
    border-radius: 6px;
    border: 1px solid var(--border);
    background: var(--surface);
    transition: border-color 0.12s;
  }

  .commitment-row:hover {
    border-color: var(--border-hover);
  }

  .check-btn {
    background: none;
    border: none;
    cursor: pointer;
    font-size: 12px;
    color: var(--text-dim);
    padding: 0;
    flex-shrink: 0;
    width: 16px;
    text-align: center;
    transition: color 0.12s;
  }

  .check-btn:hover { color: #f59e0b; }

  .commitment-text {
    flex: 1;
    font-size: 12px;
    color: var(--text);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    min-width: 0;
  }

  .commitment-meta {
    display: flex;
    align-items: center;
    gap: 4px;
    flex-shrink: 0;
  }

  .meta-person {
    font-size: 10px;
    color: var(--text-dim);
  }

  .meta-due {
    font-size: 10px;
    color: var(--text-dim);
    font-family: var(--font-mono);
  }

  .meta-due.urgent {
    color: #f87171;
    font-weight: 700;
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
