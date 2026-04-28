<script lang="ts">
  import { goto } from "$app/navigation";
  import { commitments } from "$lib/stores/commitments.svelte";

  // Show commitments due within 7 days, or all open if none have due dates
  const dueThisWeek = $derived(() => {
    const now = new Date();
    const sevenDays = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const withDue = commitments.open.filter((c) => {
      if (!c.due) return false;
      // Try to parse natural-language due dates like "Friday", "end of week", ISO dates
      const d = new Date(c.due);
      return !isNaN(d.getTime()) && d <= sevenDays;
    });

    // If none have parseable due dates, show first 5 open commitments
    return withDue.length > 0 ? withDue.slice(0, 5) : commitments.open.slice(0, 5);
  });

  const overflow = $derived(Math.max(0, commitments.open.length - 5));
</script>

<div class="section">
  <div class="section-label">ON YOUR WORD</div>

  {#if commitments.open.length === 0}
    <div class="empty-state">You're clear. No open commitments.</div>
  {:else}
    <div class="commitments-list">
      {#each dueThisWeek() as item (item.id)}
        <div class="commitment-row">
          <button
            class="check-btn"
            onclick={() => commitments.complete(item.id)}
            title="Mark complete"
          >
            <span class="check-icon">○</span>
          </button>
          {#if item.person}
            <span class="person-tag">{item.person}</span>
          {/if}
          <span class="commitment-text">{item.text}</span>
          {#if item.due}
            <span class="due-chip">{item.due}</span>
          {/if}
        </div>
      {/each}
    </div>

    {#if overflow > 0}
      <button class="overflow-link" onclick={() => goto("/cockpit")}>
        +{overflow} more →
      </button>
    {/if}
  {/if}
</div>

<style>
  .section {
    display: flex;
    flex-direction: column;
    gap: 0;
  }

  .section-label {
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--text-muted);
    margin-bottom: 16px;
  }

  .empty-state {
    font-size: 14px;
    color: var(--text-dim);
    font-style: italic;
    padding: 8px 0;
  }

  .commitments-list {
    display: flex;
    flex-direction: column;
  }

  .commitment-row {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 0;
    border-bottom: 1px solid var(--border);
  }

  .commitment-row:last-child {
    border-bottom: none;
  }

  .check-btn {
    background: none;
    border: none;
    cursor: pointer;
    padding: 0;
    flex-shrink: 0;
  }

  .check-icon {
    font-size: 14px;
    color: var(--text-dim);
    display: block;
    transition: color 0.15s;
  }

  .check-btn:hover .check-icon {
    color: var(--accent);
  }

  .person-tag {
    font-size: 12px;
    font-weight: 600;
    color: var(--accent);
    flex-shrink: 0;
    min-width: 72px;
  }

  .commitment-text {
    flex: 1;
    font-size: 14px;
    color: var(--text);
    line-height: 1.4;
    min-width: 0;
  }

  .due-chip {
    font-size: 11px;
    color: var(--text-muted);
    border: 1px solid var(--border);
    border-radius: 4px;
    padding: 2px 7px;
    flex-shrink: 0;
    white-space: nowrap;
  }

  .overflow-link {
    margin-top: 10px;
    background: none;
    border: none;
    color: var(--text-dim);
    font-size: 12px;
    cursor: pointer;
    padding: 0;
    text-align: left;
    transition: color 0.15s;
  }

  .overflow-link:hover {
    color: var(--accent);
  }
</style>
