<script lang="ts">
  import { goto } from "$app/navigation";
  import { sparks } from "$lib/stores/sparks.svelte";

  let text = $state("");

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault();
      if (e.metaKey || e.ctrlKey) {
        goBrainDump();
      } else {
        captureAsSpark();
      }
    }
  }

  function captureAsSpark() {
    const t = text.trim();
    if (!t) return;
    sparks.add(t);
    text = "";
  }

  function goBrainDump() {
    const t = text.trim();
    if (t) sessionStorage.setItem("brain-dump-prefill", t);
    goto("/brain-dump");
  }
</script>

<div class="dump-bar">
  <span class="dump-icon">⟁</span>
  <input
    class="dump-input"
    type="text"
    bind:value={text}
    onkeydown={handleKeydown}
    placeholder="Capture something… Enter = spark  ⌘↵ = Brain Dump"
  />
  {#if text.trim()}
    <button class="dump-action" onclick={captureAsSpark} title="Save as spark">◇</button>
    <button class="dump-action brain-dump-btn" onclick={goBrainDump} title="Open in Brain Dump">⟁</button>
  {/if}
</div>

<style>
  .dump-bar {
    height: 56px;
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 0 18px;
    background: var(--surface);
    border-top: 1px solid var(--border);
    flex-shrink: 0;
  }

  .dump-icon {
    font-size: 16px;
    color: var(--text-dim);
    flex-shrink: 0;
  }

  .dump-input {
    flex: 1;
    background: transparent;
    border: none;
    outline: none;
    font-size: 13px;
    color: var(--text);
    font-family: var(--font-sans);
  }

  .dump-input::placeholder { color: var(--text-dim); }

  .dump-action {
    background: none;
    border: none;
    cursor: pointer;
    font-size: 14px;
    color: var(--text-dim);
    padding: 4px 6px;
    border-radius: 4px;
    transition: color 0.12s, background 0.12s;
    flex-shrink: 0;
  }

  .dump-action:hover {
    color: var(--accent);
    background: color-mix(in srgb, var(--accent) 10%, transparent);
  }

  .brain-dump-btn:hover {
    color: var(--oberon);
    background: color-mix(in srgb, var(--oberon) 10%, transparent);
  }
</style>
