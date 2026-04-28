<script lang="ts">
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";
  import { commitments } from "$lib/stores/commitments.svelte";
  import { sparks } from "$lib/stores/sparks.svelte";
  import { logrusStore } from "$lib/stores/logrus.svelte";
  import { focusStore } from "$lib/stores/focus.svelte";

  let { loopsCount }: { loopsCount: number } = $props();

  let now = $state(new Date());
  let clockTimer: ReturnType<typeof setInterval>;

  onMount(() => {
    clockTimer = setInterval(() => { now = new Date(); }, 30000);
    return () => clearInterval(clockTimer);
  });

  const timeStr = $derived(
    now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false })
  );
  const dateStr = $derived(
    now.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })
  );

  const focusPhase = $derived(focusStore.phase);
  const focusRemaining = $derived(() => {
    const secs = Math.max(0, focusStore.timerTotal - focusStore.elapsed);
    const m = Math.floor(secs / 60).toString().padStart(2, "0");
    const s = (secs % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  });
</script>

<div class="status-bar">
  <div class="cluster left">
    <span class="time">{timeStr}</span>
    <span class="date">{dateStr}</span>
    <span class="divider"></span>

    {#if commitments.open.length > 0}
      <button
        class="chip amber"
        onclick={() => {}}
        title="Open commitments"
      >○ {commitments.open.length}</button>
    {/if}

    {#if sparks.open.length > 0}
      <button
        class="chip purple"
        onclick={() => goto("/sparks")}
        title="Sparks"
      >◇ {sparks.open.length}</button>
    {/if}

    {#if logrusStore.items.length > 0}
      <button
        class="chip blue"
        onclick={() => goto("/logrus")}
        title="Logrus inbox"
      >⊗ {logrusStore.items.length}</button>
    {/if}

    {#if loopsCount > 0}
      <button
        class="chip dim"
        onclick={() => goto("/inscriptions")}
        title="Open loops in vault"
      >⊙ {loopsCount}</button>
    {/if}
  </div>

  <div class="cluster right">
    {#if focusPhase === "working" || focusPhase === "break"}
      <button
        class="focus-pill"
        class:working={focusPhase === "working"}
        class:on-break={focusPhase === "break"}
        onclick={() => goto("/focus")}
      >
        <span>◎</span>
        <span class="focus-label">{focusPhase === "break" ? "BREAK" : "FOCUS"}</span>
        <span class="focus-time">{focusRemaining()}</span>
      </button>
    {:else if focusPhase === "planning"}
      <button class="focus-pill planning" onclick={() => goto("/focus")}>
        <span>◎</span> <span class="focus-label">PLANNING…</span>
      </button>
    {:else}
      <span class="idle-hint">No active session</span>
    {/if}
  </div>
</div>

<style>
  .status-bar {
    height: 44px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 16px;
    border-bottom: 1px solid var(--border);
    background: var(--surface);
    flex-shrink: 0;
  }

  .cluster {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .time {
    font-size: 13px;
    font-weight: 700;
    font-family: var(--font-mono);
    color: var(--text);
    letter-spacing: 0.04em;
  }

  .date {
    font-size: 11px;
    color: var(--text-muted);
  }

  .divider {
    width: 1px;
    height: 18px;
    background: var(--border);
    margin: 0 4px;
  }

  .chip {
    font-size: 11px;
    font-weight: 600;
    font-family: var(--font-sans);
    padding: 2px 8px;
    border-radius: 10px;
    border: 1px solid transparent;
    background: transparent;
    cursor: pointer;
    transition: background 0.12s, border-color 0.12s;
    white-space: nowrap;
  }

  .chip.amber {
    color: #f59e0b;
    border-color: color-mix(in srgb, #f59e0b 30%, transparent);
  }
  .chip.amber:hover { background: color-mix(in srgb, #f59e0b 8%, transparent); }

  .chip.purple {
    color: var(--oberon);
    border-color: color-mix(in srgb, var(--oberon) 25%, transparent);
  }
  .chip.purple:hover { background: color-mix(in srgb, var(--oberon) 8%, transparent); }

  .chip.blue {
    color: #60a5fa;
    border-color: color-mix(in srgb, #60a5fa 25%, transparent);
  }
  .chip.blue:hover { background: color-mix(in srgb, #60a5fa 8%, transparent); }

  .chip.dim {
    color: var(--text-muted);
    border-color: var(--border);
  }
  .chip.dim:hover { background: var(--surface-hover); }

  .focus-pill {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 4px 12px;
    border-radius: 20px;
    border: 1px solid var(--border);
    background: transparent;
    font-size: 11px;
    font-family: var(--font-sans);
    cursor: pointer;
    transition: border-color 0.15s, background 0.15s;
  }

  .focus-pill.working {
    border-color: color-mix(in srgb, var(--accent) 50%, transparent);
    background: color-mix(in srgb, var(--accent) 8%, transparent);
    color: var(--accent);
  }

  .focus-pill.on-break {
    border-color: color-mix(in srgb, #4ade80 50%, transparent);
    background: color-mix(in srgb, #4ade80 8%, transparent);
    color: #4ade80;
  }

  .focus-pill.planning {
    color: var(--oberon);
    border-color: color-mix(in srgb, var(--oberon) 40%, transparent);
    background: color-mix(in srgb, var(--oberon) 8%, transparent);
  }

  .focus-label {
    font-weight: 700;
    letter-spacing: 0.06em;
  }

  .focus-time {
    font-family: var(--font-mono);
    font-size: 12px;
    opacity: 0.9;
  }

  .idle-hint {
    font-size: 11px;
    color: var(--text-dim);
  }
</style>
