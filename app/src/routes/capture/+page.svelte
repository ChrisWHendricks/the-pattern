<script lang="ts">
  import { onMount } from "svelte";
  import { emit, listen } from "@tauri-apps/api/event";
  import { getCurrentWindow } from "@tauri-apps/api/window";

  let text = $state("");
  let mode = $state<"commitment" | "note">("commitment");
  let inputEl = $state<HTMLTextAreaElement | null>(null);

  const appWindow = getCurrentWindow();

  onMount(() => {
    const unlistens: Array<() => void> = [];

    // Rust emits this when the shortcut shows the window — focus the textarea
    listen<void>("capture-opened", () => {
      text = "";
      requestAnimationFrame(() => inputEl?.focus());
    }).then(fn => unlistens.push(fn));

    // Hide when window loses focus (click away)
    appWindow.onFocusChanged(({ payload: focused }) => {
      if (!focused) close();
    }).then(fn => unlistens.push(fn));

    function onKeydown(e: KeyboardEvent) {
      if (e.key === "Escape") { e.preventDefault(); close(); }
    }
    window.addEventListener("keydown", onKeydown);

    return () => {
      window.removeEventListener("keydown", onKeydown);
      unlistens.forEach(fn => fn());
    };
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
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); }
  }
</script>

<div class="capture-shell" role="dialog" aria-label="Quick Capture">
  <div class="capture-header">
    <span class="capture-icon">⬡</span>
    <span class="capture-title">Quick Capture</span>
    <span class="shortcut-hint">⌘⇧K · Esc</span>
  </div>

  <div class="capture-body">
    <textarea
      bind:this={inputEl}
      bind:value={text}
      onkeydown={handleKeydown}
      placeholder="What's on your mind…"
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
      Save
    </button>
  </div>
</div>

<style>
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
    font-size: 15px;
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
    padding: 4px 16px;
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
