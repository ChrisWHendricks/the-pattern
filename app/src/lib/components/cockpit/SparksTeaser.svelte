<script lang="ts">
  import { sparks } from "$lib/stores/sparks.svelte";
  import { conversation } from "$lib/stores/conversation.svelte";
  import { layoutStore } from "$lib/stores/layout.svelte";

  const topSparks = $derived(sparks.open.slice().reverse().slice(0, 3));

  function exploreSpark(text: string) {
    conversation.send(`I want to think about my spark: "${text}"`);
    layoutStore.openOberon?.();
  }
</script>

{#if topSparks.length > 0}
  <div class="widget-section">
    <div class="widget-label">SPARKS</div>
    <div class="sparks-list">
      {#each topSparks as spark (spark.id)}
        <button class="spark-row" onclick={() => exploreSpark(spark.text)}>
          <span class="spark-icon">◇</span>
          <span class="spark-text">{spark.text}</span>
        </button>
      {/each}
      {#if sparks.open.length > 3}
        <div class="more-hint">+{sparks.open.length - 3} more</div>
      {/if}
    </div>
  </div>
{/if}

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
  }

  .sparks-list {
    display: flex;
    flex-direction: column;
    gap: 3px;
  }

  .spark-row {
    display: flex;
    align-items: flex-start;
    gap: 7px;
    padding: 6px 10px;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 8px;
    cursor: pointer;
    text-align: left;
    width: 100%;
    transition: border-color 0.15s, background 0.15s;
  }

  .spark-row:hover {
    border-color: color-mix(in srgb, var(--oberon) 40%, transparent);
    background: color-mix(in srgb, var(--oberon) 6%, var(--surface));
  }

  .spark-icon {
    font-size: 11px;
    color: var(--oberon);
    opacity: 0.7;
    flex-shrink: 0;
    margin-top: 1px;
  }

  .spark-text {
    font-size: 11px;
    color: var(--text-muted);
    line-height: 1.4;
    overflow: hidden;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
  }

  .more-hint {
    font-size: 10px;
    color: var(--text-dim);
    padding: 2px 10px;
  }
</style>
