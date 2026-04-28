<script lang="ts">
  import { goto } from "$app/navigation";
  import { commitments } from "$lib/stores/commitments.svelte";
  import { sparks } from "$lib/stores/sparks.svelte";
  import { logrusStore } from "$lib/stores/logrus.svelte";
  import { top3Store } from "$lib/stores/top3.svelte";

  let { loopsCount }: { loopsCount: number } = $props();

  const top3Status = $derived(() => {
    const filled = top3Store.filledCount;
    const done = top3Store.doneCount;
    if (filled === 0) return { label: "≡ Top 3 not set", cls: "dim" };
    if (done === filled) return { label: `≡ ${done}/${filled} done`, cls: "done" };
    return { label: `≡ ${done}/${filled}`, cls: "active" };
  });

  const commitCount = $derived(commitments.open.length);
  const sparkCount = $derived(sparks.open.length);
  const logrusCount = $derived(logrusStore.items.length);
</script>

<div class="status-strip">
  <button class="chip" class:done={top3Status().cls === "done"} class:active={top3Status().cls === "active"} class:dim={top3Status().cls === "dim"} onclick={() => goto("/top3")}>
    {top3Status().label}
  </button>

  {#if commitCount > 0}
    <button class="chip warn" onclick={() => {}}>
      ○ {commitCount} commitment{commitCount !== 1 ? "s" : ""}
    </button>
  {/if}

  {#if logrusCount > 0}
    <button class="chip info" onclick={() => goto("/logrus")}>
      ⊗ {logrusCount} in Logrus
    </button>
  {/if}

  {#if loopsCount > 0}
    <button class="chip dim" onclick={() => goto("/inscriptions")}>
      ◫ {loopsCount} open loop{loopsCount !== 1 ? "s" : ""}
    </button>
  {/if}

  {#if sparkCount > 0}
    <button class="chip purple" onclick={() => {}}>
      ◇ {sparkCount} spark{sparkCount !== 1 ? "s" : ""}
    </button>
  {/if}
</div>

<style>
  .status-strip {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    padding: 10px 14px;
    border-bottom: 1px solid var(--border);
    flex-shrink: 0;
  }

  .chip {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 3px 8px;
    border-radius: 10px;
    border: 1px solid var(--border);
    background: var(--surface);
    font-size: 10px;
    font-weight: 600;
    font-family: var(--font-sans);
    color: var(--text-muted);
    cursor: pointer;
    transition: border-color 0.15s, color 0.15s, background 0.15s;
    white-space: nowrap;
  }

  .chip:hover {
    border-color: var(--border-hover);
    color: var(--text);
  }

  .chip.active {
    border-color: color-mix(in srgb, var(--accent) 40%, transparent);
    color: var(--accent);
    background: color-mix(in srgb, var(--accent) 8%, transparent);
  }

  .chip.done {
    border-color: color-mix(in srgb, #4ade80 40%, transparent);
    color: #4ade80;
    background: color-mix(in srgb, #4ade80 8%, transparent);
  }

  .chip.dim {
    color: var(--text-dim);
  }

  .chip.warn {
    border-color: color-mix(in srgb, #f59e0b 35%, transparent);
    color: #f59e0b;
    background: color-mix(in srgb, #f59e0b 8%, transparent);
  }

  .chip.info {
    border-color: color-mix(in srgb, #60a5fa 35%, transparent);
    color: #60a5fa;
    background: color-mix(in srgb, #60a5fa 8%, transparent);
  }

  .chip.purple {
    border-color: color-mix(in srgb, var(--oberon) 35%, transparent);
    color: var(--oberon);
    background: color-mix(in srgb, var(--oberon) 8%, transparent);
  }
</style>
