<script lang="ts">
  import { conversation } from "$lib/stores/conversation.svelte";

  let input = $state("");
  let inputEl = $state<HTMLInputElement | null>(null);

  function handleKey(e: KeyboardEvent) {
    if (e.key !== "Enter") return;
    const text = input.trim();
    if (!text) return;
    conversation.send(`Capture: ${text}`);
    input = "";
    inputEl?.blur();
  }
</script>

<div class="quick-capture">
  <div class="capture-wrap" class:focused={!!input}>
    <span class="capture-icon">◈</span>
    <input
      bind:this={inputEl}
      bind:value={input}
      onkeydown={handleKey}
      class="capture-input"
      type="text"
      placeholder="Capture something — Oberon will categorize it…"
    />
    {#if input}
      <button
        class="capture-send"
        onclick={() => { const e = new KeyboardEvent("keydown", { key: "Enter" }); handleKey(e); }}
        title="Send to Oberon"
      >↑</button>
    {/if}
  </div>
</div>

<style>
  .quick-capture {
    padding: 10px 14px 12px;
    border-top: 1px solid var(--border);
    flex-shrink: 0;
  }

  .capture-wrap {
    display: flex;
    align-items: center;
    gap: 8px;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 6px 8px 6px 10px;
    transition: border-color 0.15s;
  }

  .capture-wrap.focused,
  .capture-wrap:focus-within {
    border-color: var(--accent);
  }

  .capture-icon {
    font-size: 12px;
    color: var(--text-dim);
    flex-shrink: 0;
  }

  .capture-input {
    flex: 1;
    background: transparent;
    border: none;
    outline: none;
    color: var(--text);
    font-size: 12px;
    font-family: var(--font-sans);
    padding: 2px 0;
  }

  .capture-input::placeholder {
    color: var(--text-dim);
  }

  .capture-send {
    width: 24px;
    height: 24px;
    border-radius: 6px;
    border: none;
    background: var(--accent);
    color: #000;
    font-size: 13px;
    font-weight: 700;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    transition: opacity 0.15s;
  }

  .capture-send:hover {
    opacity: 0.85;
  }
</style>
