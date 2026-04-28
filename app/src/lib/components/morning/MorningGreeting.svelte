<script lang="ts">
  import { logrusStore } from "$lib/stores/logrus.svelte";
  import { vault } from "$lib/stores/vault.svelte";
  import { findOpenLoops } from "$lib/openLoops";

  let {
    insight,
    loading,
  }: {
    insight: string;
    loading: boolean;
  } = $props();

  function greeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning, Chris.";
    if (hour < 17) return "Good afternoon, Chris.";
    return "Good evening, Chris.";
  }

  function dateStr(): string {
    return new Date().toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
    });
  }

  const logrusCount = $derived(logrusStore.items.length);
  const loopsCount = $derived(findOpenLoops(vault.searchIndex).length);

  const ambientLabel = $derived(() => {
    const parts: string[] = [];
    if (logrusCount > 0) parts.push(`${logrusCount} in inbox`);
    if (loopsCount > 0) parts.push(`${loopsCount} open loop${loopsCount !== 1 ? "s" : ""}`);
    return parts.join(" · ");
  });
</script>

<div class="greeting-area">
  <h1 class="greeting-title">{greeting()}</h1>
  <p class="greeting-date">{dateStr()}</p>

  {#if loading}
    <div class="insight-loading">
      <span></span><span></span><span></span>
    </div>
  {:else if insight}
    <p class="oberon-insight">"{insight}"</p>
  {/if}

  {#if ambientLabel()}
    <div class="ambient-badge">{ambientLabel()}</div>
  {/if}
</div>

<style>
  .greeting-area {
    padding: 8px 0 16px;
    position: relative;
  }

  .greeting-title {
    font-size: 28px;
    font-weight: 300;
    letter-spacing: 0.02em;
    color: var(--text);
    margin: 0 0 4px;
    line-height: 1.2;
  }

  .greeting-date {
    font-size: 14px;
    color: var(--text-muted);
    margin: 0 0 20px;
  }

  .oberon-insight {
    font-size: 15px;
    font-style: italic;
    color: var(--oberon);
    line-height: 1.6;
    max-width: 560px;
    margin: 0;
    opacity: 0.9;
  }

  .insight-loading {
    display: flex;
    gap: 5px;
    align-items: center;
    height: 24px;
  }

  .insight-loading span {
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: var(--oberon);
    animation: pulse 1.2s ease-in-out infinite;
    opacity: 0.5;
  }

  .insight-loading span:nth-child(2) { animation-delay: 0.2s; }
  .insight-loading span:nth-child(3) { animation-delay: 0.4s; }

  @keyframes pulse {
    0%, 100% { opacity: 0.2; transform: scale(0.8); }
    50% { opacity: 0.8; transform: scale(1); }
  }

  .ambient-badge {
    position: absolute;
    top: 0;
    right: 0;
    font-size: 11px;
    color: var(--text-muted);
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 20px;
    padding: 4px 10px;
    white-space: nowrap;
  }
</style>
