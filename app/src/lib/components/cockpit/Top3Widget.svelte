<script lang="ts">
  import { goto } from "$app/navigation";
  import { top3Store } from "$lib/stores/top3.svelte";

  const allDone = $derived(
    top3Store.filledCount > 0 && top3Store.doneCount === top3Store.filledCount
  );
</script>

<div class="widget-section">
  <div class="widget-label">
    <span>TODAY'S TOP 3</span>
    {#if top3Store.filledCount > 0}
      <span class="progress" class:all-done={allDone}>
        {top3Store.doneCount}/{top3Store.filledCount}
      </span>
    {/if}
  </div>

  <div class="top3-list" class:all-done={allDone}>
    {#each top3Store.items as item, i}
      <div class="top3-row" class:done={item.done}>
        <button
          class="check-btn"
          disabled={!item.text.trim()}
          onclick={() => top3Store.toggle(i)}
          title={item.done ? "Mark incomplete" : "Mark done"}
        >
          <span class="check-icon">{item.done ? "✓" : "○"}</span>
        </button>
        <input
          class="top3-input"
          type="text"
          value={item.text}
          oninput={(e) => top3Store.setText(i, (e.target as HTMLInputElement).value)}
          placeholder={`Priority ${i + 1}…`}
          disabled={item.done}
        />
        {#if item.text.trim() && !item.done}
          <button
            class="focus-btn"
            onclick={() => goto(`/focus?task=${encodeURIComponent(item.text)}`)}
            title="Start focus session"
          >◎</button>
        {/if}
      </div>
    {/each}
  </div>

  {#if allDone}
    <div class="all-done-msg">All done. Solid day.</div>
  {/if}
</div>

<style>
  .widget-section {
    padding: 12px 14px 0;
  }

  .widget-label {
    font-size: 9px;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--text-dim);
    margin-bottom: 8px;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .progress {
    font-size: 10px;
    font-weight: 700;
    color: var(--text-dim);
    padding: 1px 6px;
    border-radius: 8px;
    background: var(--surface);
  }

  .progress.all-done {
    color: #4ade80;
    background: color-mix(in srgb, #4ade80 12%, transparent);
  }

  .top3-list {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .top3-list.all-done {
    opacity: 0.7;
  }

  .top3-row {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 8px;
    border-radius: 8px;
    border: 1px solid var(--border);
    background: var(--surface);
    transition: border-color 0.15s;
  }

  .top3-row:focus-within {
    border-color: var(--border-hover);
  }

  .top3-row.done {
    opacity: 0.5;
  }

  .check-btn {
    background: none;
    border: none;
    cursor: pointer;
    padding: 0;
    flex-shrink: 0;
  }

  .check-btn:disabled {
    cursor: default;
    opacity: 0.3;
  }

  .check-icon {
    font-size: 12px;
    color: var(--text-dim);
    display: block;
    width: 14px;
    text-align: center;
    transition: color 0.15s;
  }

  .check-btn:not(:disabled):hover .check-icon {
    color: var(--accent);
  }

  .top3-row.done .check-icon {
    color: #4ade80;
  }

  .top3-input {
    flex: 1;
    background: transparent;
    border: none;
    outline: none;
    color: var(--text);
    font-size: 12px;
    font-family: var(--font-sans);
    min-width: 0;
  }

  .top3-input::placeholder {
    color: var(--text-dim);
  }

  .top3-input:disabled {
    color: var(--text-dim);
    text-decoration: line-through;
    cursor: default;
  }

  .focus-btn {
    background: none;
    border: none;
    cursor: pointer;
    font-size: 13px;
    color: var(--text-dim);
    padding: 0;
    flex-shrink: 0;
    opacity: 0;
    transition: opacity 0.12s, color 0.12s;
  }

  .top3-row:hover .focus-btn {
    opacity: 1;
  }

  .focus-btn:hover {
    color: var(--accent);
  }

  .all-done-msg {
    margin-top: 8px;
    font-size: 11px;
    color: #4ade80;
    opacity: 0.8;
    text-align: center;
    padding: 4px 0 8px;
  }
</style>
