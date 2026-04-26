<script lang="ts">
  import { marked } from "marked";
  import { focusStore } from "$lib/stores/focus.svelte";
  import { settings } from "$lib/stores/settings.svelte";

  let taskInput = $state("");
  let chatInput = $state("");
  let listEl = $state<HTMLElement | null>(null);
  let inputEl = $state<HTMLTextAreaElement | null>(null);

  $effect(() => {
    focusStore.messages;
    focusStore.streamingContent;
    if (listEl) {
      setTimeout(() => { if (listEl) listEl.scrollTop = listEl.scrollHeight; }, 10);
    }
  });

  function formatTime(seconds: number): string {
    const m = Math.floor(seconds / 60).toString().padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  }

  function timeRemaining(): number {
    return Math.max(0, focusStore.timerTotal - focusStore.elapsed);
  }

  function timerProgress(): number {
    if (focusStore.timerTotal === 0) return 0;
    return focusStore.elapsed / focusStore.timerTotal;
  }

  async function startSession() {
    if (!taskInput.trim()) return;
    await focusStore.startSession(taskInput);
    taskInput = "";
  }

  async function sendChat() {
    const text = chatInput.trim();
    if (!text || focusStore.isStreaming) return;
    chatInput = "";
    await focusStore.sendMessage(text);
    inputEl?.focus();
  }

  function handleChatKey(e: KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendChat();
    }
  }

  function handleStartKey(e: KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      startSession();
    }
  }

  function renderMarkdown(content: string): string {
    try {
      return marked.parse(content, { async: false }) as string;
    } catch {
      return content;
    }
  }
</script>

<div class="focus-page">
  {#if focusStore.phase === "idle"}
    <!-- ── Idle: task entry ── -->
    <div class="idle-view">
      <div class="idle-icon">◎</div>
      <h1>Guided Focus</h1>
      <p class="idle-sub">Oberon will break it down and keep you on track.</p>

      {#if !settings.hasApiKey}
        <p class="no-key">Connect your API key in Settings first.</p>
      {:else}
        <div class="task-entry">
          <textarea
            bind:value={taskInput}
            onkeydown={handleStartKey}
            placeholder="What are we working on?"
            rows={3}
          ></textarea>
          <button
            class="start-btn"
            onclick={startSession}
            disabled={!taskInput.trim()}
          >
            Start Focus Session →
          </button>
        </div>
      {/if}
    </div>

  {:else if focusStore.phase === "done"}
    <!-- ── Done ── -->
    <div class="done-view">
      <div class="done-icon">✓</div>
      <h2>Session complete</h2>
      <p>{focusStore.pomodoroCount} pomodoro{focusStore.pomodoroCount !== 1 ? "s" : ""} · {focusStore.completedCount} of {focusStore.subtasks.length} steps done</p>
      <button class="start-btn" onclick={() => focusStore.reset()}>Start New Session</button>
    </div>

  {:else}
    <!-- ── Active session ── -->
    <div class="session-view">

      <!-- Header bar -->
      <div class="session-header">
        <div class="task-title">
          <span class="phase-label">{focusStore.phase === "break" ? "Break" : "Focus"}</span>
          <span class="task-name">{focusStore.task}</span>
        </div>
        <div class="header-actions">
          {#if focusStore.pomodoroCount > 0}
            <span class="pomo-count" title="Pomodoros completed">
              {"●".repeat(focusStore.pomodoroCount)}
            </span>
          {/if}
          <button class="end-btn" onclick={() => focusStore.endSession()}>End session</button>
        </div>
      </div>

      <!-- Timer bar -->
      <div class="timer-bar">
        <div class="timer-track">
          <div
            class="timer-fill"
            class:break={focusStore.phase === "break"}
            style="width: {timerProgress() * 100}%"
          ></div>
        </div>
        <div class="timer-controls">
          <span class="timer-display">{formatTime(timeRemaining())}</span>
          {#if focusStore.timerRunning}
            <button class="timer-btn" onclick={() => focusStore.pauseTimer()}>⏸</button>
          {:else}
            <button class="timer-btn" onclick={() => focusStore.startTimer()}>▶</button>
          {/if}
        </div>
      </div>

      <!-- Main area: subtasks + chat -->
      <div class="session-body">

        <!-- Subtasks column -->
        <div class="subtasks-col">
          <div class="col-label">Steps</div>
          {#if focusStore.phase === "planning" || focusStore.subtasks.length === 0}
            <div class="subtasks-pending">
              <span class="dot-pulse"><span></span><span></span><span></span></span>
              <span>Breaking it down…</span>
            </div>
          {:else}
            <ul class="subtask-list">
              {#each focusStore.subtasks as subtask, i}
                <li class="subtask-item" class:done={subtask.done}>
                  <button
                    class="subtask-btn"
                    onclick={() => focusStore.toggleSubtask(i)}
                    title={subtask.done ? "Mark incomplete" : "Mark complete"}
                  >
                    <span class="subtask-check">{subtask.done ? "✓" : "○"}</span>
                    <span class="subtask-text">{subtask.text}</span>
                  </button>
                </li>
              {/each}
            </ul>
            {#if focusStore.completedCount > 0}
              <div class="progress-label">
                {focusStore.completedCount}/{focusStore.subtasks.length} done
              </div>
            {/if}
          {/if}
        </div>

        <!-- Chat column -->
        <div class="chat-col">
          <div class="col-label">Oberon</div>
          <div class="chat-messages" bind:this={listEl}>
            {#each focusStore.messages as msg (msg.id)}
              {#if msg.role === "assistant"}
                <div class="msg oberon-msg">
                  <!-- eslint-disable-next-line svelte/no-at-html-tags -->
                  {@html renderMarkdown(msg.content)}
                </div>
              {:else}
                <div class="msg user-msg">{msg.content}</div>
              {/if}
            {/each}

            {#if focusStore.isStreaming}
              <div class="msg oberon-msg streaming">
                <!-- eslint-disable-next-line svelte/no-at-html-tags -->
                {@html renderMarkdown(focusStore.streamingContent || " ")}
                <span class="cursor">▋</span>
              </div>
            {/if}

            {#if focusStore.error}
              <div class="error-msg">⚠ {focusStore.error}</div>
            {/if}
          </div>

          <div class="chat-input-area">
            <div class="chat-input-wrap">
              <textarea
                bind:this={inputEl}
                bind:value={chatInput}
                onkeydown={handleChatKey}
                placeholder={focusStore.isStreaming ? "Oberon is thinking…" : "Ask Oberon or report progress…"}
                disabled={focusStore.isStreaming}
                rows={1}
              ></textarea>
              <button
                class="send-btn"
                onclick={sendChat}
                disabled={!chatInput.trim() || focusStore.isStreaming}
              >
                {#if focusStore.isStreaming}
                  <span class="spinner"></span>
                {:else}
                  ↑
                {/if}
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  {/if}
</div>

<style>
  .focus-page {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-height: 0;
    background: var(--bg);
  }

  /* ── Idle ── */
  .idle-view {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 14px;
    padding: 48px 40px;
    text-align: center;
  }

  .idle-icon {
    font-size: 52px;
    color: var(--accent);
    opacity: 0.7;
    line-height: 1;
  }

  .idle-view h1 {
    margin: 0;
    font-size: 24px;
    font-weight: 700;
    color: var(--text);
  }

  .idle-sub {
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

  .task-entry {
    width: 100%;
    max-width: 520px;
    display: flex;
    flex-direction: column;
    gap: 10px;
    margin-top: 8px;
  }

  .task-entry textarea {
    width: 100%;
    box-sizing: border-box;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 14px 16px;
    color: var(--text);
    font-size: 15px;
    font-family: var(--font-sans);
    line-height: 1.5;
    resize: none;
    outline: none;
    transition: border-color 0.15s;
  }

  .task-entry textarea:focus {
    border-color: var(--accent);
  }

  .task-entry textarea::placeholder {
    color: var(--text-dim);
  }

  .start-btn {
    padding: 12px 28px;
    background: var(--accent);
    border: none;
    border-radius: 10px;
    color: #000;
    font-size: 14px;
    font-weight: 700;
    cursor: pointer;
    transition: opacity 0.15s;
    align-self: flex-end;
  }

  .start-btn:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }

  .start-btn:not(:disabled):hover {
    opacity: 0.85;
  }

  /* ── Done ── */
  .done-view {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 12px;
    padding: 48px 40px;
    text-align: center;
  }

  .done-icon {
    font-size: 52px;
    color: #4ade80;
    line-height: 1;
  }

  .done-view h2 {
    margin: 0;
    font-size: 22px;
    font-weight: 700;
    color: var(--text);
  }

  .done-view p {
    margin: 0;
    font-size: 14px;
    color: var(--text-muted);
  }

  /* ── Session ── */
  .session-view {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-height: 0;
  }

  .session-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 14px 20px 10px;
    border-bottom: 1px solid var(--border);
    gap: 12px;
  }

  .task-title {
    display: flex;
    align-items: center;
    gap: 10px;
    min-width: 0;
  }

  .phase-label {
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--accent);
    background: color-mix(in srgb, var(--accent) 12%, transparent);
    padding: 2px 8px;
    border-radius: 10px;
    flex-shrink: 0;
  }

  .task-name {
    font-size: 15px;
    font-weight: 600;
    color: var(--text);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .header-actions {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-shrink: 0;
  }

  .pomo-count {
    font-size: 11px;
    color: var(--accent);
    letter-spacing: 2px;
  }

  .end-btn {
    padding: 5px 12px;
    border: 1px solid var(--border);
    border-radius: 6px;
    background: transparent;
    color: var(--text-muted);
    font-size: 12px;
    cursor: pointer;
    transition: background 0.15s, color 0.15s;
  }

  .end-btn:hover {
    background: var(--surface-hover);
    color: var(--text);
  }

  /* Timer */
  .timer-bar {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 8px 20px;
    border-bottom: 1px solid var(--border);
    background: var(--surface);
  }

  .timer-track {
    flex: 1;
    height: 4px;
    background: var(--surface-hover);
    border-radius: 2px;
    overflow: hidden;
  }

  .timer-fill {
    height: 100%;
    background: var(--accent);
    border-radius: 2px;
    transition: width 1s linear;
  }

  .timer-fill.break {
    background: #4ade80;
  }

  .timer-controls {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
  }

  .timer-display {
    font-size: 13px;
    font-weight: 700;
    font-family: var(--font-mono);
    color: var(--text);
    min-width: 42px;
    text-align: right;
  }

  .timer-btn {
    width: 26px;
    height: 26px;
    border: 1px solid var(--border);
    border-radius: 6px;
    background: transparent;
    color: var(--text-muted);
    font-size: 11px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 0.15s, color 0.15s;
  }

  .timer-btn:hover {
    background: var(--surface-hover);
    color: var(--accent);
  }

  /* Body */
  .session-body {
    flex: 1;
    display: flex;
    min-height: 0;
  }

  .col-label {
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--text-dim);
    padding: 0 0 10px;
  }

  /* Subtasks column */
  .subtasks-col {
    width: 260px;
    min-width: 260px;
    border-right: 1px solid var(--border);
    padding: 16px 14px;
    display: flex;
    flex-direction: column;
    overflow-y: auto;
  }

  .subtasks-pending {
    display: flex;
    align-items: center;
    gap: 8px;
    color: var(--text-muted);
    font-size: 13px;
    padding: 4px 0;
  }

  .dot-pulse {
    display: flex;
    gap: 3px;
    align-items: center;
  }

  .dot-pulse span {
    width: 5px;
    height: 5px;
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

  .subtask-list {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .subtask-item {
    list-style: none;
  }

  .subtask-btn {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    width: 100%;
    padding: 7px 8px;
    border: none;
    border-radius: 6px;
    background: transparent;
    cursor: pointer;
    transition: background 0.12s;
    font-size: 13px;
    line-height: 1.4;
    text-align: left;
  }

  .subtask-btn:hover {
    background: var(--surface-hover);
  }

  .subtask-check {
    color: var(--text-muted);
    flex-shrink: 0;
    font-size: 13px;
    margin-top: 1px;
  }

  .subtask-item.done .subtask-check {
    color: #4ade80;
  }

  .subtask-text {
    color: var(--text);
    flex: 1;
  }

  .subtask-item.done .subtask-text {
    color: var(--text-dim);
    text-decoration: line-through;
  }

  .progress-label {
    margin-top: 12px;
    font-size: 11px;
    color: var(--text-dim);
    text-align: center;
  }

  /* Chat column */
  .chat-col {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-width: 0;
    padding: 16px 16px 0;
  }

  .chat-messages {
    flex: 1;
    overflow-y: auto;
    min-height: 0;
    display: flex;
    flex-direction: column;
    gap: 8px;
    scroll-behavior: smooth;
    padding-bottom: 4px;
  }

  .msg {
    padding: 10px 14px;
    border-radius: 10px;
    font-size: 13px;
    line-height: 1.6;
    max-width: 90%;
  }

  .oberon-msg {
    background: var(--surface);
    border: 1px solid var(--border);
    color: var(--text);
    align-self: flex-start;
    border-top-left-radius: 3px;
  }

  .oberon-msg :global(p) { margin: 0 0 0.5em; }
  .oberon-msg :global(p:last-child) { margin-bottom: 0; }
  .oberon-msg :global(ol), .oberon-msg :global(ul) {
    margin: 0.3em 0;
    padding-left: 1.4em;
  }
  .oberon-msg :global(li) { margin-bottom: 0.2em; }
  .oberon-msg :global(strong) { color: var(--text); font-weight: 600; }

  .user-msg {
    background: var(--user-bubble);
    border: 1px solid var(--user-bubble-border);
    color: var(--text);
    align-self: flex-end;
    border-top-right-radius: 3px;
  }

  .cursor {
    display: inline-block;
    color: var(--oberon);
    animation: blink 1s step-end infinite;
    margin-left: 1px;
  }

  @keyframes blink {
    0%, 100% { opacity: 1; }
    50% { opacity: 0; }
  }

  .error-msg {
    padding: 8px 12px;
    background: color-mix(in srgb, #ef4444 10%, var(--surface));
    border: 1px solid color-mix(in srgb, #ef4444 30%, transparent);
    border-radius: 8px;
    color: #fca5a5;
    font-size: 12px;
  }

  .chat-input-area {
    padding: 10px 0 14px;
    border-top: 1px solid var(--border);
    margin-top: 8px;
  }

  .chat-input-wrap {
    display: flex;
    align-items: flex-end;
    gap: 8px;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 6px 6px 6px 12px;
    transition: border-color 0.15s;
  }

  .chat-input-wrap:focus-within {
    border-color: var(--border-hover);
  }

  .chat-input-wrap textarea {
    flex: 1;
    background: transparent;
    border: none;
    outline: none;
    color: var(--text);
    font-size: 13px;
    font-family: var(--font-sans);
    line-height: 1.5;
    resize: none;
    min-height: 22px;
    max-height: 100px;
    padding: 3px 0;
  }

  .chat-input-wrap textarea::placeholder {
    color: var(--text-dim);
  }

  .chat-input-wrap textarea:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .send-btn {
    width: 30px;
    height: 30px;
    border-radius: 7px;
    border: none;
    background: var(--accent);
    color: #000;
    font-size: 14px;
    font-weight: 700;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    transition: opacity 0.15s;
  }

  .send-btn:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }

  .send-btn:not(:disabled):hover {
    opacity: 0.85;
  }

  .spinner {
    width: 12px;
    height: 12px;
    border: 2px solid rgba(0, 0, 0, 0.3);
    border-top-color: #000;
    border-radius: 50%;
    animation: spin 0.7s linear infinite;
    display: block;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }
</style>
