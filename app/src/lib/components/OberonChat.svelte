<script lang="ts">
  import { conversation } from "$lib/stores/conversation.svelte";
  import { settings } from "$lib/stores/settings.svelte";
  import { vault } from "$lib/stores/vault.svelte";
  import MessageBubble from "./MessageBubble.svelte";

  let input = $state("");
  let listEl = $state<HTMLElement | null>(null);
  let inputEl = $state<HTMLTextAreaElement | null>(null);

  $effect(() => {
    // Auto-scroll when messages or streaming content changes
    conversation.messages;
    conversation.streamingContent;
    if (listEl) {
      setTimeout(() => {
        if (listEl) listEl.scrollTop = listEl.scrollHeight;
      }, 10);
    }
  });

  $effect(() => {
    // Auto-start morning briefing on first load if API key exists
    if (settings.hasApiKey && conversation.isEmpty) {
      conversation.startMorningBriefing();
    }
  });

  async function send() {
    const text = input.trim();
    if (!text || conversation.isStreaming) return;
    input = "";
    await conversation.send(text);
    inputEl?.focus();
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  function autoResize(el: HTMLTextAreaElement) {
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 160) + "px";
  }
</script>

<div class="chat">
  {#if !settings.hasApiKey}
    <div class="empty-state">
      <div class="empty-mark">⬡</div>
      <h2>Welcome to The Pattern</h2>
      <p>Connect Oberon to get started. You'll need an Anthropic API key.</p>
      <button class="cta-btn" onclick={() => settings.openSettings()}>
        Connect Oberon →
      </button>
    </div>
  {:else}
    <div class="message-list" bind:this={listEl}>
      <div class="messages-inner">
        {#each conversation.messages as message (message.id)}
          <MessageBubble {message} />
        {/each}

        {#if conversation.isStreaming}
          <MessageBubble
            message={{
              id: "streaming",
              role: "assistant",
              content: conversation.streamingContent || " ",
            }}
            streaming={true}
          />
        {/if}

        {#if conversation.error}
          <div class="error-msg">
            ⚠ {conversation.error}
          </div>
        {/if}

        {#if conversation.isEmpty && !conversation.isStreaming}
          <div class="loading-state">
            <div class="dot-pulse">
              <span></span><span></span><span></span>
            </div>
            <p>Oberon is preparing your briefing…</p>
          </div>
        {/if}

        {#if conversation.isSummarizing}
          <div class="system-notice">
            Saving session memory…
          </div>
        {/if}
      </div>
    </div>

    <div class="input-area">
      <div class="input-wrap">
        <textarea
          bind:this={inputEl}
          bind:value={input}
          onkeydown={handleKeydown}
          oninput={(e) => autoResize(e.currentTarget)}
          placeholder={conversation.isStreaming ? "Oberon is thinking…" : "Talk to Oberon…"}
          disabled={conversation.isStreaming}
          rows={1}
        ></textarea>
        <button
          class="send-btn"
          onclick={send}
          disabled={!input.trim() || conversation.isStreaming}
          title="Send (Enter)"
        >
          {#if conversation.isStreaming}
            <span class="spinner"></span>
          {:else}
            ↑
          {/if}
        </button>
      </div>
      <div class="input-hint">
        {#if conversation.isSearching}
          Searching vault…
        {:else}
          Enter to send · Shift+Enter for newline
          {#if vault.indexSize > 0}
            · {vault.indexSize} notes indexed
          {/if}
        {/if}
      </div>
    </div>
  {/if}
</div>

<style>
  .chat {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-height: 0;
    position: relative;
  }

  .empty-state {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 12px;
    padding: 40px;
    text-align: center;
  }

  .empty-mark {
    font-size: 48px;
    color: var(--accent);
    opacity: 0.6;
  }

  .empty-state h2 {
    margin: 0;
    font-size: 20px;
    font-weight: 600;
    color: var(--text);
  }

  .empty-state p {
    margin: 0;
    font-size: 14px;
    color: var(--text-muted);
    max-width: 300px;
    line-height: 1.6;
  }

  .cta-btn {
    margin-top: 8px;
    padding: 10px 24px;
    background: var(--accent);
    border: none;
    border-radius: 8px;
    color: #000;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: opacity 0.15s;
  }

  .cta-btn:hover {
    opacity: 0.9;
  }

  .message-list {
    flex: 1;
    overflow-y: auto;
    min-height: 0;
    scroll-behavior: smooth;
  }

  .messages-inner {
    padding: 20px 24px;
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-height: 100%;
  }

  .loading-state {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
    padding: 10px 0;
  }

  .loading-state p {
    margin: 0;
    font-size: 13px;
    color: var(--text-muted);
  }

  .dot-pulse {
    display: flex;
    gap: 4px;
    align-items: center;
    padding-left: 40px;
  }

  .dot-pulse span {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--oberon);
    animation: pulse 1.2s ease-in-out infinite;
  }

  .dot-pulse span:nth-child(2) { animation-delay: 0.2s; }
  .dot-pulse span:nth-child(3) { animation-delay: 0.4s; }

  @keyframes pulse {
    0%, 100% { opacity: 0.3; transform: scale(0.8); }
    50% { opacity: 1; transform: scale(1); }
  }

  .error-msg {
    padding: 10px 14px;
    background: color-mix(in srgb, #ef4444 10%, var(--surface));
    border: 1px solid color-mix(in srgb, #ef4444 30%, transparent);
    border-radius: 8px;
    color: #fca5a5;
    font-size: 13px;
    margin: 4px 0;
  }

  .input-area {
    padding: 12px 20px 16px;
    border-top: 1px solid var(--border);
    background: var(--bg);
  }

  .input-wrap {
    display: flex;
    align-items: flex-end;
    gap: 8px;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 6px 6px 6px 14px;
    transition: border-color 0.15s;
  }

  .input-wrap:focus-within {
    border-color: var(--border-hover);
  }

  textarea {
    flex: 1;
    background: transparent;
    border: none;
    outline: none;
    color: var(--text);
    font-size: 14px;
    font-family: var(--font-sans);
    line-height: 1.5;
    resize: none;
    min-height: 24px;
    max-height: 160px;
    padding: 4px 0;
  }

  textarea::placeholder {
    color: var(--text-dim);
  }

  textarea:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .send-btn {
    width: 34px;
    height: 34px;
    border-radius: 8px;
    border: none;
    background: var(--accent);
    color: #000;
    font-size: 16px;
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
    width: 14px;
    height: 14px;
    border: 2px solid rgba(0, 0, 0, 0.3);
    border-top-color: #000;
    border-radius: 50%;
    animation: spin 0.7s linear infinite;
    display: block;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .system-notice {
    text-align: center;
    font-size: 11px;
    color: var(--text-dim);
    padding: 8px 0;
    font-style: italic;
  }

  .input-hint {
    margin-top: 6px;
    font-size: 10px;
    color: var(--text-dim);
    text-align: center;
  }
</style>
