<script lang="ts">
  import { goto } from "$app/navigation";
  import { top3Store } from "$lib/stores/top3.svelte";

  const allDone = $derived(
    top3Store.filledCount > 0 && top3Store.doneCount === top3Store.filledCount
  );

  let completedThisSession = $state(new Set<number>());

  function toggle(i: number) {
    top3Store.toggle(i);
    if (!top3Store.items[i].done) {
      completedThisSession.delete(i);
    } else {
      completedThisSession.add(i);
    }
    completedThisSession = new Set(completedThisSession);
  }
</script>

<div class="section">
  <div class="section-label">TODAY'S FOCUS</div>

  <div class="priority-list">
    {#each top3Store.items as item, i}
      <div
        class="priority-item"
        class:completed={item.done}
        class:just-checked={completedThisSession.has(i)}
      >
        <button
          class="check-btn"
          disabled={!item.text.trim()}
          onclick={() => toggle(i)}
          title={item.done ? "Mark incomplete" : "Mark done"}
        >
          <span class="check-icon">{item.done ? "✓" : "○"}</span>
        </button>

        <input
          class="priority-text"
          type="text"
          value={item.text}
          oninput={(e) => top3Store.setText(i, (e.target as HTMLInputElement).value)}
          placeholder={i === 0
            ? "What's the one thing you must do today?"
            : `Priority ${i + 1}…`}
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
    <div class="all-done-banner">
      <span class="done-icon">✓</span> FOCUS SET — All three done. Solid day.
    </div>
  {:else if top3Store.filledCount > 0}
    <div class="progress-hint">
      {top3Store.doneCount} of {top3Store.filledCount} done
    </div>
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

  .priority-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .priority-item {
    display: flex;
    align-items: center;
    gap: 14px;
    min-height: 52px;
    padding: 10px 16px;
    border-radius: 10px;
    border: 1px solid var(--border);
    background: var(--surface);
    transition: background 0.15s, border-color 0.15s, opacity 0.2s;
  }

  .priority-item:focus-within {
    border-color: var(--border-hover);
  }

  .priority-item:hover {
    background: color-mix(in srgb, var(--surface) 80%, var(--oberon) 20%);
  }

  .priority-item.completed {
    opacity: 0.45;
  }

  .priority-item.just-checked {
    animation: check-flash 0.5s ease-out;
  }

  @keyframes check-flash {
    0% {
      background: color-mix(in srgb, #4ade80 15%, var(--surface));
      border-color: color-mix(in srgb, #4ade80 40%, transparent);
    }
    100% {
      background: var(--surface);
      border-color: var(--border);
    }
  }

  .check-btn {
    background: none;
    border: none;
    cursor: pointer;
    padding: 0;
    flex-shrink: 0;
  }

  .check-btn:disabled { cursor: default; }

  .check-icon {
    font-size: 16px;
    color: var(--text-dim);
    display: block;
    width: 20px;
    text-align: center;
    transition: color 0.15s;
  }

  .check-btn:not(:disabled):hover .check-icon {
    color: var(--accent);
  }

  .priority-item.completed .check-icon {
    color: #4ade80;
  }

  .priority-text {
    flex: 1;
    background: transparent;
    border: none;
    outline: none;
    color: var(--text);
    font-size: 14px;
    font-family: var(--font-sans);
    line-height: 1.5;
    min-width: 0;
  }

  .priority-text::placeholder {
    color: var(--text-dim);
  }

  .priority-item.completed .priority-text {
    text-decoration: line-through;
    color: var(--text-dim);
    cursor: default;
  }

  .focus-btn {
    background: none;
    border: none;
    cursor: pointer;
    font-size: 16px;
    color: var(--text-dim);
    padding: 0;
    flex-shrink: 0;
    opacity: 0;
    transition: opacity 0.12s, color 0.12s;
  }

  .priority-item:hover .focus-btn {
    opacity: 1;
  }

  .focus-btn:hover {
    color: var(--accent);
  }

  .all-done-banner {
    margin-top: 12px;
    padding: 8px 16px;
    border-radius: 8px;
    background: color-mix(in srgb, #4ade80 8%, transparent);
    border: 1px solid color-mix(in srgb, #4ade80 30%, transparent);
    color: #4ade80;
    font-size: 12px;
    font-weight: 600;
    letter-spacing: 0.06em;
    text-align: center;
  }

  .done-icon { margin-right: 4px; }

  .progress-hint {
    margin-top: 10px;
    font-size: 11px;
    color: var(--text-dim);
    text-align: right;
  }
</style>
