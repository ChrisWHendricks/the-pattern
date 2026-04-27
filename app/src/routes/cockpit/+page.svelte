<script lang="ts">
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";
  import { top3Store } from "$lib/stores/top3.svelte";
  import { commitments } from "$lib/stores/commitments.svelte";
  import { conversation } from "$lib/stores/conversation.svelte";

  let now = $state(new Date());
  let clockInterval: ReturnType<typeof setInterval>;

  onMount(() => {
    clockInterval = setInterval(() => { now = new Date(); }, 1000);
    return () => clearInterval(clockInterval);
  });

  const timeStr = $derived(
    now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
  );
  const dateStr = $derived(
    now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })
  );

  function launchFocus(text?: string) {
    if (text) {
      goto(`/focus?task=${encodeURIComponent(text)}`);
    } else {
      goto("/focus");
    }
  }

  async function morningBriefing() {
    await goto("/");
    conversation.startMorningBriefing();
  }

  const top3Progress = $derived(
    top3Store.filledCount > 0
      ? `${top3Store.doneCount}/${top3Store.filledCount}`
      : null
  );
</script>

<div class="cockpit">

  <!-- Header -->
  <div class="cockpit-header">
    <div class="header-left">
      <span class="cockpit-icon">⊙</span>
      <span class="cockpit-label">COCKPIT</span>
    </div>
    <div class="header-center">
      <span class="date-str">{dateStr}</span>
    </div>
    <div class="header-right">
      <span class="time-str">{timeStr}</span>
    </div>
  </div>

  <!-- Main grid -->
  <div class="main-grid">

    <!-- Top 3 panel -->
    <div class="panel top3-panel">
      <div class="panel-header">
        <span class="panel-title">Today's Top 3</span>
        {#if top3Progress}
          <span class="panel-count">{top3Progress}</span>
        {/if}
      </div>

      <div class="top3-rows">
        {#each top3Store.items as item, i}
          <div class="top3-row" class:done={item.done}>
            <span class="row-num">{i + 1}</span>
            <input
              type="text"
              class="row-input"
              value={item.text}
              oninput={(e) => top3Store.setText(i, (e.target as HTMLInputElement).value)}
              placeholder="Priority {i + 1}…"
              disabled={item.done}
            />
            <div class="row-actions">
              {#if item.text.trim() && !item.done}
                <button
                  class="row-btn focus-btn"
                  onclick={() => launchFocus(item.text)}
                  title="Start Focus session"
                >◎</button>
              {/if}
              <button
                class="row-btn check-btn"
                class:checked={item.done}
                onclick={() => top3Store.toggle(i)}
                disabled={!item.text.trim()}
                title={item.done ? "Reopen" : "Mark done"}
              >{item.done ? "✓" : "○"}</button>
            </div>
          </div>
        {/each}
      </div>

      {#if top3Store.filledCount > 0 && top3Store.doneCount === top3Store.filledCount}
        <div class="top3-complete">All done today ✓</div>
      {/if}
    </div>

    <!-- Commitments panel -->
    <div class="panel commitments-panel">
      <div class="panel-header">
        <span class="panel-title">Open Commitments</span>
        {#if commitments.open.length > 0}
          <span class="panel-count">{commitments.open.length}</span>
        {/if}
      </div>

      {#if commitments.open.length === 0}
        <p class="empty-msg">No open commitments.</p>
      {:else}
        <ul class="commitment-rows">
          {#each commitments.open as c (c.id)}
            <li class="commitment-row">
              <button
                class="commit-check"
                onclick={() => commitments.complete(c.id)}
                title="Mark complete"
              >○</button>
              <div class="commit-body">
                <span class="commit-text">{c.text}</span>
                {#if c.person || c.due}
                  <div class="commit-meta">
                    {#if c.person}<span class="meta-person">→ {c.person}</span>{/if}
                    {#if c.due}<span class="meta-due">{c.due}</span>{/if}
                  </div>
                {/if}
              </div>
            </li>
          {/each}
        </ul>
      {/if}
    </div>

  </div>

  <!-- Quick actions -->
  <div class="actions-bar">
    <button class="action-btn primary" onclick={morningBriefing}>
      <span class="action-icon">◈</span> Morning Briefing
    </button>
    <button class="action-btn" onclick={() => launchFocus()}>
      <span class="action-icon">◎</span> Start Focus
    </button>
    <button class="action-btn" onclick={() => goto("/brain-dump")}>
      <span class="action-icon">⟁</span> Brain Dump
    </button>
    <button class="action-btn" onclick={() => goto("/")}>
      <span class="action-icon">◈</span> Talk to Oberon
    </button>
  </div>

</div>

<style>
  .cockpit {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-height: 0;
    background: var(--bg);
  }

  /* Header */
  .cockpit-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 28px;
    border-bottom: 1px solid var(--border);
    background: var(--surface);
    flex-shrink: 0;
  }

  .header-left {
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 120px;
  }

  .cockpit-icon {
    font-size: 16px;
    color: var(--accent);
  }

  .cockpit-label {
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--accent);
  }

  .header-center {
    flex: 1;
    text-align: center;
  }

  .date-str {
    font-size: 14px;
    font-weight: 500;
    color: var(--text);
  }

  .header-right {
    min-width: 120px;
    text-align: right;
  }

  .time-str {
    font-size: 18px;
    font-weight: 700;
    font-family: var(--font-mono);
    color: var(--text-muted);
    letter-spacing: 0.04em;
  }

  /* Main grid */
  .main-grid {
    flex: 1;
    display: grid;
    grid-template-columns: 1fr 360px;
    gap: 0;
    min-height: 0;
    overflow: hidden;
  }

  /* Panels */
  .panel {
    padding: 24px 28px;
    overflow-y: auto;
  }

  .top3-panel {
    border-right: 1px solid var(--border);
  }

  .panel-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 20px;
  }

  .panel-title {
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--text-dim);
  }

  .panel-count {
    font-size: 11px;
    font-weight: 700;
    color: var(--accent);
    background: color-mix(in srgb, var(--accent) 12%, transparent);
    padding: 2px 9px;
    border-radius: 10px;
  }

  /* Top 3 rows */
  .top3-rows {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .top3-row {
    display: flex;
    align-items: center;
    gap: 12px;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 14px 16px;
    transition: border-color 0.15s, opacity 0.2s;
  }

  .top3-row:focus-within {
    border-color: var(--accent);
  }

  .top3-row.done {
    opacity: 0.45;
  }

  .row-num {
    font-size: 18px;
    font-weight: 800;
    color: var(--accent);
    opacity: 0.6;
    width: 22px;
    text-align: center;
    flex-shrink: 0;
    font-family: var(--font-mono);
  }

  .row-input {
    flex: 1;
    background: transparent;
    border: none;
    outline: none;
    color: var(--text);
    font-size: 15px;
    font-family: var(--font-sans);
    padding: 0;
    min-width: 0;
  }

  .row-input::placeholder { color: var(--text-dim); }

  .row-input:disabled {
    text-decoration: line-through;
    color: var(--text-dim);
    cursor: default;
  }

  .row-actions {
    display: flex;
    align-items: center;
    gap: 4px;
    flex-shrink: 0;
  }

  .row-btn {
    width: 28px;
    height: 28px;
    border: none;
    border-radius: 6px;
    background: transparent;
    cursor: pointer;
    font-size: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 0.12s, color 0.12s;
  }

  .row-btn:disabled { opacity: 0.2; cursor: default; }

  .focus-btn { color: var(--text-dim); }
  .focus-btn:hover { color: var(--accent); background: var(--surface-hover); }

  .check-btn { color: var(--text-dim); }
  .check-btn:not(:disabled):hover { color: var(--accent); background: var(--surface-hover); }
  .check-btn.checked { color: #4ade80; }

  .top3-complete {
    margin-top: 16px;
    font-size: 12px;
    color: #4ade80;
    text-align: center;
    padding: 8px;
  }

  /* Commitments */
  .empty-msg {
    font-size: 12px;
    color: var(--text-dim);
    margin: 0;
  }

  .commitment-rows {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .commitment-row {
    display: flex;
    align-items: flex-start;
    gap: 8px;
  }

  .commit-check {
    background: none;
    border: none;
    cursor: pointer;
    padding: 0;
    font-size: 13px;
    color: var(--text-dim);
    flex-shrink: 0;
    margin-top: 1px;
    transition: color 0.12s;
  }

  .commit-check:hover { color: var(--accent); }

  .commit-body { flex: 1; min-width: 0; }

  .commit-text {
    font-size: 13px;
    color: var(--text);
    line-height: 1.4;
    display: block;
    word-break: break-word;
  }

  .commit-meta {
    display: flex;
    gap: 8px;
    margin-top: 3px;
    flex-wrap: wrap;
  }

  .meta-person {
    font-size: 11px;
    color: var(--oberon);
    opacity: 0.85;
  }

  .meta-due {
    font-size: 11px;
    color: var(--accent);
    opacity: 0.85;
  }

  /* Actions bar */
  .actions-bar {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 14px 28px;
    border-top: 1px solid var(--border);
    background: var(--surface);
    flex-shrink: 0;
  }

  .action-btn {
    display: flex;
    align-items: center;
    gap: 7px;
    padding: 8px 16px;
    border: 1px solid var(--border);
    border-radius: 8px;
    background: transparent;
    color: var(--text-muted);
    font-size: 13px;
    font-family: var(--font-sans);
    cursor: pointer;
    transition: background 0.15s, color 0.15s, border-color 0.15s;
    white-space: nowrap;
  }

  .action-btn:hover {
    background: var(--surface-hover);
    color: var(--text);
    border-color: var(--border-hover);
  }

  .action-btn.primary {
    background: color-mix(in srgb, var(--accent) 12%, transparent);
    border-color: color-mix(in srgb, var(--accent) 35%, transparent);
    color: var(--accent);
  }

  .action-btn.primary:hover {
    background: color-mix(in srgb, var(--accent) 20%, transparent);
  }

  .action-icon {
    font-size: 14px;
    line-height: 1;
  }
</style>
