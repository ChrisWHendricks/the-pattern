<script lang="ts">
  import { goto } from "$app/navigation";
  import { top3Store } from "$lib/stores/top3.svelte";

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric",
  });

  let inputEls = $state<(HTMLInputElement | null)[]>([null, null, null]);

  function handleKey(e: KeyboardEvent, i: number) {
    if (e.key === "Enter") {
      e.preventDefault();
      inputEls[i + 1]?.focus();
    }
  }

  function launchFocus(text: string) {
    goto(`/focus?task=${encodeURIComponent(text)}`);
  }

  const allFilledDone = $derived(
    top3Store.filledCount > 0 && top3Store.doneCount === top3Store.filledCount
  );
</script>

<div class="top3-page">
  <div class="page-header">
    <div class="header-left">
      <div class="page-icon">≡</div>
      <div>
        <h1>Top 3</h1>
        <p class="header-date">{today}</p>
      </div>
    </div>
    {#if top3Store.filledCount > 0}
      <div class="progress-pill" class:complete={allFilledDone}>
        {top3Store.doneCount}/{top3Store.filledCount} done
      </div>
    {/if}
  </div>

  <div class="cards">
    {#each top3Store.items as item, i}
      <div class="card" class:done={item.done}>
        <div class="card-num" class:done={item.done}>{i + 1}</div>

        <input
          bind:this={inputEls[i]}
          type="text"
          class="card-input"
          value={item.text}
          oninput={(e) => top3Store.setText(i, (e.target as HTMLInputElement).value)}
          onkeydown={(e) => handleKey(e, i)}
          placeholder="Priority {i + 1}…"
          disabled={item.done}
        />

        <div class="card-actions">
          {#if item.text.trim() && !item.done}
            <button
              class="action-btn focus-btn"
              onclick={() => launchFocus(item.text)}
              title="Start a Focus session on this task"
            >◎</button>
          {/if}
          <button
            class="action-btn check-btn"
            class:checked={item.done}
            onclick={() => top3Store.toggle(i)}
            disabled={!item.text.trim()}
            title={item.done ? "Mark incomplete" : "Mark done"}
          >
            {item.done ? "✓" : "○"}
          </button>
        </div>
      </div>
    {/each}
  </div>

  {#if allFilledDone}
    <div class="all-done">
      <div class="done-mark">✓</div>
      <p>All done. That's a solid day.</p>
    </div>
  {:else}
    <p class="hint">Press ↵ to move between priorities · ◎ to launch a Focus session</p>
  {/if}
</div>

<style>
  .top3-page {
    flex: 1;
    display: flex;
    flex-direction: column;
    background: var(--bg);
    padding: 40px 48px;
    max-width: 680px;
    width: 100%;
    margin: 0 auto;
    box-sizing: border-box;
  }

  .page-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 36px;
  }

  .header-left {
    display: flex;
    align-items: center;
    gap: 14px;
  }

  .page-icon {
    font-size: 36px;
    color: var(--accent);
    opacity: 0.8;
    line-height: 1;
  }

  h1 {
    margin: 0 0 2px;
    font-size: 26px;
    font-weight: 700;
    color: var(--text);
  }

  .header-date {
    margin: 0;
    font-size: 13px;
    color: var(--text-muted);
  }

  .progress-pill {
    font-size: 12px;
    font-weight: 600;
    color: var(--text-muted);
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 20px;
    padding: 4px 14px;
  }

  .progress-pill.complete {
    color: #4ade80;
    border-color: color-mix(in srgb, #4ade80 40%, transparent);
    background: color-mix(in srgb, #4ade80 8%, transparent);
  }

  /* Cards */
  .cards {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .card {
    display: flex;
    align-items: center;
    gap: 14px;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 16px 20px;
    transition: border-color 0.15s, opacity 0.2s;
  }

  .card:focus-within {
    border-color: var(--accent);
  }

  .card.done {
    opacity: 0.5;
  }

  .card-num {
    font-size: 22px;
    font-weight: 800;
    color: var(--accent);
    width: 28px;
    text-align: center;
    flex-shrink: 0;
    line-height: 1;
    font-family: var(--font-mono);
    opacity: 0.7;
  }

  .card-num.done {
    color: #4ade80;
  }

  .card-input {
    flex: 1;
    background: transparent;
    border: none;
    outline: none;
    color: var(--text);
    font-size: 16px;
    font-family: var(--font-sans);
    padding: 0;
    min-width: 0;
  }

  .card-input::placeholder {
    color: var(--text-dim);
  }

  .card-input:disabled {
    text-decoration: line-through;
    color: var(--text-dim);
    cursor: default;
  }

  .card-actions {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-shrink: 0;
  }

  .action-btn {
    width: 30px;
    height: 30px;
    border: none;
    border-radius: 6px;
    background: transparent;
    cursor: pointer;
    font-size: 15px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 0.15s, color 0.15s;
  }

  .action-btn:disabled {
    opacity: 0.25;
    cursor: default;
  }

  .focus-btn {
    color: var(--text-dim);
  }

  .focus-btn:hover {
    color: var(--accent);
    background: var(--surface-hover);
  }

  .check-btn {
    color: var(--text-dim);
  }

  .check-btn:not(:disabled):hover {
    color: var(--accent);
    background: var(--surface-hover);
  }

  .check-btn.checked {
    color: #4ade80;
  }

  /* Done state */
  .all-done {
    margin-top: 40px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
    text-align: center;
  }

  .done-mark {
    font-size: 48px;
    color: #4ade80;
    line-height: 1;
  }

  .all-done p {
    margin: 0;
    font-size: 15px;
    color: var(--text-muted);
  }

  .hint {
    margin: 24px 0 0;
    font-size: 11px;
    color: var(--text-dim);
    text-align: center;
    font-family: var(--font-mono);
  }
</style>
