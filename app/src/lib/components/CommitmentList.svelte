<script lang="ts">
  import { commitments } from "$lib/stores/commitments.svelte";
  import { sparks } from "$lib/stores/sparks.svelte";
  import { conversation } from "$lib/stores/conversation.svelte";
  import JiraText from "$lib/components/JiraText.svelte";

  function demote(id: string, text: string) {
    commitments.remove(id);
    sparks.add(text);
  }

  function formatDue(due?: string | null): string {
    if (!due) return "";
    return due;
  }

  function quickCapture() {
    conversation.send("I need to log a commitment. Ask me who I made it to and what I said I'd do.");
  }
</script>

<div class="commitment-list">
  {#if commitments.open.length === 0}
    <div class="empty">
      <p>No open commitments.</p>
      <button class="quick-add" onclick={quickCapture}>+ Log one</button>
    </div>
  {:else}
    <ul>
      {#each commitments.open as item (item.id)}
        <li class="commitment-item">
          <button
            class="check-btn"
            onclick={() => commitments.complete(item.id)}
            title="Mark complete"
          >
            <span class="checkbox">○</span>
          </button>
          <div class="commitment-body">
            <JiraText text={item.text} class="commitment-text" />
            {#if item.person || item.due}
              <div class="commitment-meta">
                {#if item.person}<span class="meta-person">→ {item.person}</span>{/if}
                {#if item.due}<span class="meta-due">{formatDue(item.due)}</span>{/if}
              </div>
            {/if}
          </div>
          <div class="item-actions">
            <button
              class="action-icon demote-btn"
              onclick={() => demote(item.id, item.text)}
              title="Demote to spark"
            >◇</button>
            <button
              class="action-icon delete-btn"
              onclick={() => commitments.remove(item.id)}
              title="Delete"
            >✕</button>
          </div>
        </li>
      {/each}
    </ul>
    <button class="quick-add" onclick={quickCapture}>+ Log commitment</button>
  {/if}

  {#if commitments.completed.length > 0}
    <details class="completed-section">
      <summary>
        {commitments.completed.length} completed
      </summary>
      <ul class="completed-list">
        {#each commitments.completed.slice(-5) as item (item.id)}
          <li class="commitment-item done">
            <button
              class="check-btn done"
              onclick={() => commitments.reopen(item.id)}
              title="Reopen"
            >
              <span class="checkbox">✓</span>
            </button>
            <JiraText text={item.text} class="commitment-text" />
          </li>
        {/each}
      </ul>
    </details>
  {/if}
</div>

<style>
  .commitment-list {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  ul {
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .commitment-item {
    display: flex;
    align-items: flex-start;
    gap: 6px;
    padding: 4px 0;
  }

  .item-actions {
    display: flex;
    gap: 2px;
    flex-shrink: 0;
    opacity: 0;
    transition: opacity 0.12s;
    margin-top: 1px;
  }

  .commitment-item:hover .item-actions {
    opacity: 1;
  }

  .action-icon {
    background: none;
    border: none;
    cursor: pointer;
    padding: 0;
    width: 16px;
    height: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 11px;
    border-radius: 3px;
    transition: color 0.12s, background 0.12s;
  }

  .demote-btn {
    color: var(--text-dim);
  }

  .demote-btn:hover {
    color: var(--oberon);
    background: color-mix(in srgb, var(--oberon) 12%, transparent);
  }

  .delete-btn {
    color: var(--text-dim);
    font-size: 9px;
  }

  .delete-btn:hover {
    color: #f87171;
    background: color-mix(in srgb, #f87171 12%, transparent);
  }

  .check-btn {
    background: none;
    border: none;
    cursor: pointer;
    padding: 0;
    flex-shrink: 0;
    margin-top: 1px;
  }

  .checkbox {
    font-size: 13px;
    color: var(--text-dim);
    transition: color 0.15s;
    display: block;
    width: 16px;
    text-align: center;
  }

  .check-btn:hover .checkbox {
    color: var(--accent);
  }

  .check-btn.done .checkbox {
    color: var(--accent);
    font-size: 11px;
  }

  .commitment-body {
    flex: 1;
    min-width: 0;
  }

  .commitment-text {
    font-size: 12px;
    color: var(--text);
    line-height: 1.4;
    display: block;
    word-break: break-word;
  }

  .commitment-item.done .commitment-text {
    color: var(--text-dim);
    text-decoration: line-through;
  }

  .commitment-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-top: 2px;
  }

  .meta-person {
    font-size: 10px;
    color: var(--oberon);
    opacity: 0.8;
  }

  .meta-due {
    font-size: 10px;
    color: var(--accent);
    opacity: 0.8;
  }

  .empty {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .empty p {
    font-size: 11px;
    color: var(--text-dim);
  }

  .quick-add {
    background: none;
    border: 1px dashed var(--border);
    border-radius: 5px;
    color: var(--text-dim);
    font-size: 11px;
    padding: 4px 8px;
    cursor: pointer;
    width: 100%;
    text-align: left;
    transition: border-color 0.15s, color 0.15s;
    margin-top: 4px;
  }

  .quick-add:hover {
    border-color: var(--accent);
    color: var(--accent);
  }

  .completed-section {
    margin-top: 6px;
  }

  .completed-section summary {
    font-size: 10px;
    color: var(--text-dim);
    cursor: pointer;
    letter-spacing: 0.03em;
    list-style: none;
    padding: 2px 0;
  }

  .completed-section summary:hover {
    color: var(--text-muted);
  }

  .completed-list {
    margin-top: 4px;
    opacity: 0.7;
  }
</style>
