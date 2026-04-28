<script lang="ts">
  import CommitmentList from "$lib/components/CommitmentList.svelte";
  import { commitments } from "$lib/stores/commitments.svelte";

  let prevCount = $state(commitments.open.length);
  let justUpdated = $state(false);
  let pulseTimer: ReturnType<typeof setTimeout> | null = null;

  $effect(() => {
    const count = commitments.open.length;
    if (count !== prevCount) {
      prevCount = count;
      justUpdated = true;
      if (pulseTimer) clearTimeout(pulseTimer);
      pulseTimer = setTimeout(() => { justUpdated = false; }, 1400);
    }
  });
</script>

<div class="widget-section">
  <div class="widget-label">
    <span>COMMITMENTS</span>
    {#if commitments.open.length > 0}
      <span class="count" class:warn={commitments.open.length > 3} class:danger={commitments.open.length > 6}>
        {commitments.open.length}
      </span>
    {/if}
  </div>
  <div class="widget-card" class:just-updated={justUpdated}>
    <CommitmentList />
  </div>
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

  .count {
    font-size: 10px;
    font-weight: 700;
    padding: 1px 6px;
    border-radius: 8px;
    color: var(--text-muted);
    background: var(--surface);
  }

  .count.warn {
    color: #f59e0b;
    background: color-mix(in srgb, #f59e0b 12%, transparent);
  }

  .count.danger {
    color: #ef4444;
    background: color-mix(in srgb, #ef4444 12%, transparent);
  }

  .widget-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 10px 12px;
    transition: border-color 0.15s;
  }

  .widget-card.just-updated {
    animation: widget-pulse 1.4s ease-out;
  }

  @keyframes widget-pulse {
    0% {
      border-color: var(--oberon);
      box-shadow: 0 0 0 2px color-mix(in srgb, var(--oberon) 15%, transparent);
    }
    100% {
      border-color: var(--border);
      box-shadow: none;
    }
  }
</style>
