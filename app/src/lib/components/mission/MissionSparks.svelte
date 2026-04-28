<script lang="ts">
  import { goto } from "$app/navigation";
  import { sparks } from "$lib/stores/sparks.svelte";
  import { commitments } from "$lib/stores/commitments.svelte";

  const MAX_VISIBLE = 8;
  const visible = $derived(sparks.open.slice(0, MAX_VISIBLE));
  const overflow = $derived(Math.max(0, sparks.open.length - MAX_VISIBLE));

  let newText = $state("");

  function addSpark() {
    const t = newText.trim();
    if (!t) return;
    sparks.add(t);
    newText = "";
  }

  function promote(id: string, text: string) {
    commitments.add({ text });
    sparks.markPromoted(id);
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault();
      addSpark();
    }
  }
</script>

<div class="zone zone-sparks">
  <div class="zone-header">
    <span class="zone-title">◇ SPARKS</span>
    {#if sparks.open.length > 0}
      <span class="zone-count">{sparks.open.length}</span>
    {/if}
  </div>

  <div class="zone-body">
    {#if visible.length === 0}
      <span class="empty-hint">No open sparks</span>
    {:else}
      {#each visible as spark (spark.id)}
        <div class="spark-row">
          <span class="spark-diamond">◇</span>
          <span class="spark-text">{spark.text}</span>
          <div class="spark-actions">
            <button
              class="action-btn promote-btn"
              onclick={() => promote(spark.id, spark.text)}
              title="Promote to commitment"
            >○</button>
            <button
              class="action-btn discard-btn"
              onclick={() => sparks.remove(spark.id)}
              title="Discard"
            >×</button>
          </div>
        </div>
      {/each}
      {#if overflow > 0}
        <button class="overflow-link" onclick={() => goto("/sparks")}>
          +{overflow} more…
        </button>
      {/if}
    {/if}
  </div>

  <div class="quick-add">
    <input
      class="quick-input"
      type="text"
      bind:value={newText}
      onkeydown={handleKeydown}
      placeholder="New spark… (Enter)"
    />
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

  .zone-sparks {
    grid-area: sparks;
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
    color: var(--oberon);
    background: color-mix(in srgb, var(--oberon) 12%, transparent);
  }

  .zone-body {
    flex: 1;
    overflow-y: auto;
    padding: 8px 12px;
    display: flex;
    flex-direction: column;
    gap: 3px;
  }

  .spark-row {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 8px;
    border-radius: 6px;
    border: 1px solid transparent;
    transition: border-color 0.1s, background 0.1s;
  }

  .spark-row:hover {
    background: var(--surface);
    border-color: var(--border);
  }

  .spark-diamond {
    font-size: 11px;
    color: var(--oberon);
    flex-shrink: 0;
    opacity: 0.7;
  }

  .spark-text {
    flex: 1;
    font-size: 12px;
    color: var(--text);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    min-width: 0;
  }

  .spark-actions {
    display: flex;
    gap: 4px;
    opacity: 0;
    transition: opacity 0.1s;
    flex-shrink: 0;
  }

  .spark-row:hover .spark-actions {
    opacity: 1;
  }

  .action-btn {
    background: none;
    border: none;
    cursor: pointer;
    font-size: 12px;
    padding: 2px 4px;
    border-radius: 3px;
    transition: color 0.1s, background 0.1s;
    color: var(--text-dim);
  }

  .promote-btn:hover {
    color: #f59e0b;
    background: color-mix(in srgb, #f59e0b 10%, transparent);
  }

  .discard-btn:hover {
    color: #f87171;
    background: color-mix(in srgb, #f87171 10%, transparent);
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

  .quick-add {
    padding: 8px 12px;
    border-top: 1px solid var(--border);
    background: var(--surface);
    flex-shrink: 0;
  }

  .quick-input {
    width: 100%;
    background: transparent;
    border: none;
    outline: none;
    font-size: 12px;
    color: var(--text);
    font-family: var(--font-sans);
  }

  .quick-input::placeholder { color: var(--text-dim); }
</style>
