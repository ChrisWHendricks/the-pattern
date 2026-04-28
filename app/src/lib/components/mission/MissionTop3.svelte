<script lang="ts">
  import { goto } from "$app/navigation";
  import { top3Store } from "$lib/stores/top3.svelte";

  const allDone = $derived(
    top3Store.filledCount > 0 && top3Store.doneCount === top3Store.filledCount
  );
</script>

<div class="zone zone-top3">
  <div class="zone-header" class:all-done={allDone}>
    <span class="zone-title">≡ TODAY'S TOP 3</span>
    {#if top3Store.filledCount > 0}
      <span class="zone-count" class:gold={allDone} class:muted={!allDone}>
        {top3Store.doneCount}/{top3Store.filledCount}
      </span>
    {/if}
  </div>

  <div class="zone-body">
    {#each top3Store.items as item, i}
      <div class="top3-row" class:done={item.done}>
        <span class="row-num">{i + 1}</span>
        <button
          class="check-btn"
          disabled={!item.text.trim()}
          onclick={() => top3Store.toggle(i)}
        >{item.done ? "✓" : "○"}</button>
        <input
          class="row-input"
          type="text"
          value={item.text}
          oninput={(e) => top3Store.setText(i, (e.target as HTMLInputElement).value)}
          placeholder="Priority {i + 1}…"
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

    {#if allDone}
      <div class="all-done-msg">✓ All done. Solid day.</div>
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

  .zone-top3 {
    grid-area: top3;
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
    transition: background 0.3s;
  }

  .zone-header.all-done {
    background: color-mix(in srgb, #4ade80 6%, var(--surface));
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
  }

  .zone-count.gold {
    color: #4ade80;
    background: color-mix(in srgb, #4ade80 12%, transparent);
  }

  .zone-count.muted {
    color: var(--text-dim);
    background: var(--surface-hover);
  }

  .zone-body {
    flex: 1;
    overflow-y: auto;
    padding: 10px 14px;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .top3-row {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 10px;
    border-radius: 8px;
    border: 1px solid var(--border);
    background: var(--surface);
    transition: border-color 0.15s, opacity 0.2s;
  }

  .top3-row:focus-within {
    border-color: var(--border-hover);
  }

  .top3-row.done {
    opacity: 0.45;
  }

  .row-num {
    font-size: 13px;
    font-weight: 700;
    color: var(--accent);
    font-family: var(--font-mono);
    width: 14px;
    text-align: center;
    flex-shrink: 0;
  }

  .top3-row.done .row-num {
    color: #4ade80;
  }

  .check-btn {
    background: none;
    border: none;
    cursor: pointer;
    font-size: 12px;
    color: var(--text-dim);
    padding: 0;
    flex-shrink: 0;
    transition: color 0.12s;
    width: 16px;
    text-align: center;
  }

  .check-btn:not(:disabled):hover { color: var(--accent); }
  .check-btn:disabled { cursor: default; opacity: 0.4; }
  .top3-row.done .check-btn { color: #4ade80; }

  .row-input {
    flex: 1;
    background: transparent;
    border: none;
    outline: none;
    color: var(--text);
    font-size: 12px;
    font-family: var(--font-sans);
    min-width: 0;
  }

  .row-input::placeholder { color: var(--text-dim); }
  .row-input:disabled {
    text-decoration: line-through;
    color: var(--text-dim);
    cursor: default;
  }

  .focus-btn {
    background: none;
    border: none;
    cursor: pointer;
    font-size: 13px;
    color: var(--text-dim);
    padding: 0;
    opacity: 0;
    transition: opacity 0.12s, color 0.12s;
    flex-shrink: 0;
  }

  .top3-row:hover .focus-btn { opacity: 1; }
  .focus-btn:hover { color: var(--accent); }

  .all-done-msg {
    font-size: 11px;
    color: #4ade80;
    text-align: center;
    padding: 8px 0;
    opacity: 0.8;
  }
</style>
