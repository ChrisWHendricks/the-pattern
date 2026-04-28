<script lang="ts">
  import { goto } from "$app/navigation";
  import { sparks } from "$lib/stores/sparks.svelte";
  import { focusStore } from "$lib/stores/focus.svelte";
  import { top3Store } from "$lib/stores/top3.svelte";

  let dumpText = $state("");
  let captured = $state(false);
  let captureTimer: ReturnType<typeof setTimeout> | null = null;

  const firstTask = $derived(
    top3Store.items.find((i) => i.text.trim() && !i.done)?.text ?? ""
  );

  const focusLabel = $derived(() => {
    if (focusStore.phase === "working") return "RESUME FOCUS SESSION";
    if (focusStore.phase === "break") return "BACK TO FOCUS";
    return "BEGIN FOCUS SESSION";
  });

  function handleDumpKey(e: KeyboardEvent) {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      const text = dumpText.trim();
      if (!text) return;
      sessionStorage.setItem("braindump_prefill", text);
      goto("/brain-dump");
      return;
    }
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      const text = dumpText.trim();
      if (!text || text.includes("\n")) return;
      sparks.add(text);
      dumpText = "";
      captured = true;
      if (captureTimer) clearTimeout(captureTimer);
      captureTimer = setTimeout(() => { captured = false; }, 2000);
    }
  }

  function beginFocus() {
    if (firstTask) {
      goto(`/focus?task=${encodeURIComponent(firstTask)}`);
    } else {
      goto("/focus");
    }
  }

  function autoResize(el: HTMLTextAreaElement) {
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 120) + "px";
  }
</script>

<div class="section">
  <div class="section-label">LAUNCH PAD</div>

  <div class="dump-area">
    <div class="dump-label">What's rattling around in your head right now?</div>
    <textarea
      bind:value={dumpText}
      onkeydown={handleDumpKey}
      oninput={(e) => autoResize(e.currentTarget)}
      class="dump-textarea"
      placeholder="One thought, a list, anything. Enter = spark · ⌘↵ = full triage"
      rows={2}
    ></textarea>
    {#if captured}
      <div class="captured-hint">Captured.</div>
    {/if}
  </div>

  <button class="begin-btn" onclick={beginFocus}>
    {focusLabel()}
  </button>
</div>

<style>
  .section {
    display: flex;
    flex-direction: column;
    gap: 0;
  }

  .section-label {
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--text-muted);
    margin-bottom: 16px;
  }

  .dump-area {
    display: flex;
    flex-direction: column;
    gap: 6px;
    margin-bottom: 20px;
  }

  .dump-label {
    font-size: 14px;
    color: var(--text-muted);
    margin-bottom: 4px;
  }

  .dump-textarea {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 10px;
    color: var(--text);
    font-size: 14px;
    font-family: var(--font-sans);
    line-height: 1.6;
    padding: 12px 14px;
    resize: none;
    width: 100%;
    transition: height 0.2s ease, border-color 0.15s;
    min-height: 60px;
  }

  .dump-textarea:focus {
    outline: none;
    border-color: var(--oberon);
  }

  .dump-textarea::placeholder {
    color: var(--text-dim);
  }

  .captured-hint {
    font-size: 12px;
    color: var(--accent);
    font-weight: 600;
    padding-left: 2px;
    animation: fade-in-out 2s ease forwards;
  }

  @keyframes fade-in-out {
    0% { opacity: 0; }
    15% { opacity: 1; }
    70% { opacity: 1; }
    100% { opacity: 0; }
  }

  .begin-btn {
    width: 100%;
    height: 56px;
    background: transparent;
    border: 1px solid var(--accent);
    border-radius: 10px;
    color: var(--accent);
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    cursor: pointer;
    font-family: var(--font-sans);
    transition: background 0.25s ease, color 0.25s ease, transform 0.1s ease;
  }

  .begin-btn:hover {
    background: var(--accent);
    color: #0e0c1a;
  }

  .begin-btn:active {
    transform: scale(0.99);
  }
</style>
