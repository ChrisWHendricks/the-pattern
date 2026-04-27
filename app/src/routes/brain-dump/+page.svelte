<script lang="ts">
  import { onMount } from "svelte";
  import { brainDumpStore, type TriageCategory } from "$lib/stores/braindump.svelte";
  import { settings } from "$lib/stores/settings.svelte";

  let dumpText = $state("");

  onMount(() => {
    const prefill = sessionStorage.getItem("braindump_prefill");
    if (prefill) {
      dumpText = prefill;
      sessionStorage.removeItem("braindump_prefill");
    }
  });

  async function handleTriage() {
    if (!dumpText.trim()) return;
    await brainDumpStore.triage(dumpText);
  }

  function handleKey(e: KeyboardEvent) {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleTriage();
    }
  }

  const CATEGORY_LABELS: Record<TriageCategory, string> = {
    inscription: "Inscription",
    commitment: "Commitment",
    spark: "Spark",
    chronicle: "Chronicle",
    discard: "Discard",
  };

  const CATEGORY_ACTIONS: Record<TriageCategory, string> = {
    inscription: "Save to vault",
    commitment: "Add to commitments",
    spark: "Capture spark",
    chronicle: "Log to chronicle",
    discard: "Skip",
  };

  function handleReset() {
    brainDumpStore.reset();
    dumpText = "";
  }
</script>

<div class="brain-dump-page">

  {#if brainDumpStore.phase === "idle"}
    <div class="dump-view">
      <div class="dump-header">
        <div class="dump-icon">⟁</div>
        <h1>Brain Dump</h1>
        <p class="dump-sub">Empty your mind. One thought per line. Oberon will sort it out.</p>
      </div>

      {#if !settings.hasApiKey}
        <p class="no-key">Connect your API key in Settings first.</p>
      {:else}
        <div class="dump-entry">
          <textarea
            bind:value={dumpText}
            onkeydown={handleKey}
            placeholder="What's rattling around in your head?&#10;&#10;• That thing you promised Sarah&#10;• The idea you had in the shower&#10;• The thing you keep forgetting to do&#10;• Whatever's bothering you"
            autofocus
          ></textarea>
          <div class="dump-actions">
            <span class="dump-hint">⌘↵ to triage</span>
            <button
              class="triage-btn"
              onclick={handleTriage}
              disabled={!dumpText.trim()}
            >
              Triage with Oberon →
            </button>
          </div>
        </div>
      {/if}
    </div>

  {:else if brainDumpStore.phase === "triaging"}
    <div class="triaging-view">
      <div class="dot-pulse"><span></span><span></span><span></span></div>
      <p>Sorting through it…</p>
    </div>

  {:else if brainDumpStore.phase === "triage"}
    <div class="triage-view">
      <div class="triage-header">
        <div>
          <h1>Triage</h1>
          <p class="triage-sub">
            {brainDumpStore.unclaimedCount} item{brainDumpStore.unclaimedCount !== 1 ? "s" : ""} to process
          </p>
        </div>
        <button class="reset-btn" onclick={handleReset}>Start over</button>
      </div>

      {#if brainDumpStore.error}
        <div class="error-bar">⚠ {brainDumpStore.error}</div>
      {/if}

      <div class="triage-list">
        {#each brainDumpStore.triageItems as item, i}
          {@const claimed = brainDumpStore.claimed.has(i)}
          <div class="triage-item" class:claimed>
            <div class="item-body">
              <span class="category-badge cat-{item.category}">{CATEGORY_LABELS[item.category]}</span>
              <span class="item-text">{item.text}</span>
            </div>
            <div class="item-meta">
              <span class="item-reason">{item.reason}</span>
              {#if claimed}
                <span class="claimed-mark">✓</span>
              {:else}
                <button
                  class="claim-btn"
                  class:discard={item.category === "discard"}
                  onclick={() => brainDumpStore.claimItem(i)}
                >
                  {CATEGORY_ACTIONS[item.category]}
                </button>
              {/if}
            </div>
          </div>
        {/each}

        {#if brainDumpStore.unclaimedCount === 0}
          <div class="all-done">
            <span class="done-icon">◎</span>
            <p>All processed. Clean slate.</p>
            <button class="triage-btn" onclick={handleReset}>Dump again</button>
          </div>
        {/if}
      </div>
    </div>
  {/if}

</div>

<style>
  .brain-dump-page {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-height: 0;
    background: var(--bg);
  }

  /* ── Dump phase ── */
  .dump-view {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 48px 40px 32px;
    max-width: 680px;
    margin: 0 auto;
    width: 100%;
    box-sizing: border-box;
  }

  .dump-header {
    text-align: center;
    margin-bottom: 28px;
  }

  .dump-icon {
    font-size: 48px;
    color: var(--accent);
    opacity: 0.7;
    line-height: 1;
    margin-bottom: 12px;
  }

  .dump-header h1 {
    margin: 0 0 8px;
    font-size: 24px;
    font-weight: 700;
    color: var(--text);
  }

  .dump-sub {
    margin: 0;
    font-size: 14px;
    color: var(--text-muted);
  }

  .no-key {
    font-size: 13px;
    color: var(--text-muted);
    padding: 12px 20px;
    background: var(--surface);
    border-radius: 8px;
    border: 1px solid var(--border);
  }

  .dump-entry {
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .dump-entry textarea {
    width: 100%;
    box-sizing: border-box;
    min-height: 280px;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 18px 20px;
    color: var(--text);
    font-size: 14px;
    font-family: var(--font-sans);
    line-height: 1.7;
    resize: vertical;
    outline: none;
    transition: border-color 0.15s;
  }

  .dump-entry textarea:focus {
    border-color: var(--accent);
  }

  .dump-entry textarea::placeholder {
    color: var(--text-dim);
    line-height: 1.8;
  }

  .dump-actions {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 12px;
  }

  .dump-hint {
    font-size: 11px;
    color: var(--text-dim);
    font-family: var(--font-mono);
  }

  .triage-btn {
    padding: 10px 24px;
    background: var(--accent);
    border: none;
    border-radius: 8px;
    color: #000;
    font-size: 13px;
    font-weight: 700;
    cursor: pointer;
    transition: opacity 0.15s;
  }

  .triage-btn:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }

  .triage-btn:not(:disabled):hover {
    opacity: 0.85;
  }

  /* ── Triaging ── */
  .triaging-view {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 16px;
    color: var(--text-muted);
    font-size: 14px;
  }

  .triaging-view p { margin: 0; }

  .dot-pulse {
    display: flex;
    gap: 6px;
    align-items: center;
  }

  .dot-pulse span {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--oberon);
    animation: dpulse 1.2s ease-in-out infinite;
  }

  .dot-pulse span:nth-child(2) { animation-delay: 0.2s; }
  .dot-pulse span:nth-child(3) { animation-delay: 0.4s; }

  @keyframes dpulse {
    0%, 100% { opacity: 0.3; transform: scale(0.8); }
    50% { opacity: 1; transform: scale(1); }
  }

  /* ── Triage phase ── */
  .triage-view {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-height: 0;
    padding: 24px 32px;
    max-width: 760px;
    margin: 0 auto;
    width: 100%;
    box-sizing: border-box;
  }

  .triage-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    margin-bottom: 20px;
  }

  .triage-header h1 {
    margin: 0 0 4px;
    font-size: 20px;
    font-weight: 700;
    color: var(--text);
  }

  .triage-sub {
    margin: 0;
    font-size: 12px;
    color: var(--text-muted);
  }

  .reset-btn {
    padding: 6px 14px;
    border: 1px solid var(--border);
    border-radius: 6px;
    background: transparent;
    color: var(--text-muted);
    font-size: 12px;
    cursor: pointer;
    transition: background 0.15s, color 0.15s;
    flex-shrink: 0;
  }

  .reset-btn:hover {
    background: var(--surface-hover);
    color: var(--text);
  }

  .error-bar {
    padding: 8px 14px;
    background: color-mix(in srgb, #ef4444 12%, var(--surface));
    border: 1px solid color-mix(in srgb, #ef4444 30%, transparent);
    border-radius: 8px;
    color: #fca5a5;
    font-size: 12px;
    margin-bottom: 16px;
  }

  .triage-list {
    flex: 1;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding-bottom: 16px;
  }

  .triage-item {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 14px 16px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    transition: opacity 0.2s;
  }

  .triage-item.claimed {
    opacity: 0.4;
  }

  .item-body {
    display: flex;
    align-items: flex-start;
    gap: 10px;
  }

  .category-badge {
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    padding: 2px 8px;
    border-radius: 10px;
    flex-shrink: 0;
    margin-top: 2px;
  }

  .cat-inscription {
    background: color-mix(in srgb, #60a5fa 15%, transparent);
    color: #60a5fa;
  }

  .cat-commitment {
    background: color-mix(in srgb, #f59e0b 15%, transparent);
    color: #f59e0b;
  }

  .cat-spark {
    background: color-mix(in srgb, var(--oberon) 15%, transparent);
    color: var(--oberon);
  }

  .cat-chronicle {
    background: color-mix(in srgb, #4ade80 15%, transparent);
    color: #4ade80;
  }

  .cat-discard {
    background: color-mix(in srgb, var(--text-dim) 15%, transparent);
    color: var(--text-dim);
  }

  .item-text {
    font-size: 13px;
    color: var(--text);
    line-height: 1.5;
    flex: 1;
  }

  .item-meta {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }

  .item-reason {
    font-size: 11px;
    color: var(--text-dim);
    flex: 1;
  }

  .claim-btn {
    padding: 5px 14px;
    border: 1px solid var(--border);
    border-radius: 6px;
    background: transparent;
    color: var(--text-muted);
    font-size: 11px;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.15s, color 0.15s, border-color 0.15s;
    white-space: nowrap;
  }

  .claim-btn:hover {
    background: var(--accent);
    border-color: var(--accent);
    color: #000;
  }

  .claim-btn.discard:hover {
    background: var(--surface-hover);
    border-color: var(--border);
    color: var(--text);
  }

  .claimed-mark {
    font-size: 13px;
    color: #4ade80;
    font-weight: 700;
    padding-right: 6px;
  }

  .all-done {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
    padding: 40px 20px;
    text-align: center;
    color: var(--text-muted);
  }

  .done-icon {
    font-size: 36px;
    color: var(--accent);
    opacity: 0.7;
  }

  .all-done p {
    margin: 0;
    font-size: 14px;
  }
</style>
