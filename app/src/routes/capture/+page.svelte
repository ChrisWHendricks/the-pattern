<script lang="ts">
  import { onMount } from "svelte";
  import { emit } from "@tauri-apps/api/event";
  import { getCurrentWindow } from "@tauri-apps/api/window";

  let text = $state("");
  let mode = $state<"commitment" | "note">("commitment");
  let inputEl = $state<HTMLTextAreaElement | null>(null);

  const appWindow = getCurrentWindow();

  onMount(() => {
    inputEl?.focus();

    // Close when focus leaves the window
    const unlisten = appWindow.onFocusChanged(({ payload: focused }) => {
      if (!focused) close();
    });
    return () => unlisten.then((fn) => fn());
  });

  async function submit() {
    const trimmed = text.trim();
    if (!trimmed) { close(); return; }
    await emit("quick-capture", { text: trimmed, mode });
    text = "";
    close();
  }

  async function close() {
    text = "";
    await appWindow.hide();
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === "Escape") { e.preventDefault(); close(); }
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); }
  }
</script>

<div class="capture-shell" role="dialog" aria-label="Quick Capture">
  <div class="capture-header">
    <span class="capture-icon">⬡</span>
    <span class="capture-title">Quick Capture</span>
    <span class="shortcut-hint">⌘⇧K</span>
    <button class="close-btn" onclick={close} title="Close (Escape)">✕</button>
  </div>

  <div class="capture-body">
    <textarea
      bind:this={inputEl}
      bind:value={text}
      onkeydown={handleKeydown}
      placeholder="Capture a commitment, thought, or task…"
      rows={3}
      spellcheck={false}
    ></textarea>
  </div>

  <div class="capture-footer">
    <div class="mode-toggle">
      <button
        class="mode-btn"
        class:active={mode === "commitment"}
        onclick={() => (mode = "commitment")}
      >Commitment</button>
      <button
        class="mode-btn"
        class:active={mode === "note"}
        onclick={() => (mode = "note")}
      >Note</button>
    </div>
    <button class="submit-btn" onclick={submit} disabled={!text.trim()}>
      Save → Enter
    </button>
  </div>
</div>

<style>
  :global(body) {
    margin: 0;
    padding: 0;
    background: transparent;
    overflow: hidden;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  }

  .capture-shell {
    width: 100vw;
    height: 100vh;
    background: #161b27;
    border: 1px solid #2a3145;
    border-radius: 12px;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.7);
  }

  .capture-header {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 14px 8px;
    border-bottom: 1px solid #2a3145;
    -webkit-app-region: drag;
    user-select: none;
  }

  .capture-icon {
    font-size: 16px;
    color: #e8a020;
    line-height: 1;
  }

  .capture-title {
    font-size: 12px;
    font-weight: 600;
    color: #c8cdd8;
    flex: 1;
  }

  .shortcut-hint {
    font-size: 10px;
    color: #4a5168;
    letter-spacing: 0.04em;
  }

  .close-btn {
    width: 20px;
    height: 20px;
    border: none;
    background: transparent;
    color: #4a5168;
    font-size: 11px;
    cursor: pointer;
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: color 0.15s, background 0.15s;
    -webkit-app-region: no-drag;
    padding: 0;
    line-height: 1;
  }

  .close-btn:hover {
    color: #c8cdd8;
    background: #2a3145;
  }

  .capture-body {
    flex: 1;
    padding: 10px 14px;
    display: flex;
  }

  textarea {
    flex: 1;
    background: transparent;
    border: none;
    outline: none;
    color: #e8eaf0;
    font-size: 14px;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    line-height: 1.6;
    resize: none;
    padding: 0;
  }

  textarea::placeholder {
    color: #3a4158;
  }

  .capture-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 14px 10px;
    border-top: 1px solid #2a3145;
  }

  .mode-toggle {
    display: flex;
    gap: 4px;
    background: #0e1220;
    border-radius: 6px;
    padding: 2px;
  }

  .mode-btn {
    padding: 3px 10px;
    border: none;
    border-radius: 4px;
    background: transparent;
    color: #4a5168;
    font-size: 11px;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.12s, color 0.12s;
  }

  .mode-btn.active {
    background: #2a3145;
    color: #e8a020;
  }

  .submit-btn {
    padding: 4px 12px;
    border: none;
    border-radius: 6px;
    background: #e8a020;
    color: #000;
    font-size: 11px;
    font-weight: 700;
    cursor: pointer;
    transition: opacity 0.15s;
  }

  .submit-btn:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }

  .submit-btn:not(:disabled):hover {
    opacity: 0.85;
  }
</style>
