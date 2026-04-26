<script lang="ts">
  import { marked } from "marked";
  import type { Message } from "$lib/stores/conversation.svelte";

  type Props = {
    message: Message | { id: string; role: "assistant"; content: string; timestamp?: Date };
    streaming?: boolean;
  };

  let { message, streaming = false }: Props = $props();

  const isOberon = $derived(message.role === "assistant");

  const rendered = $derived(() => {
    if (!message.content) return "";
    try {
      return marked.parse(message.content, { async: false }) as string;
    } catch {
      return message.content;
    }
  });

  const timeStr = $derived(() => {
    if (!message.timestamp) return "";
    return new Date(message.timestamp).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  });
</script>

<div class="message" class:oberon={isOberon} class:user={!isOberon}>
  {#if isOberon}
    <div class="avatar oberon-avatar">O</div>
  {/if}

  <div class="bubble-wrap">
    {#if isOberon}
      <div class="sender-name">Oberon</div>
    {/if}
    <div class="bubble" class:streaming>
      <div class="content">
        {#if isOberon}
          <!-- eslint-disable-next-line svelte/no-at-html-tags -->
          {@html rendered()}
          {#if streaming}
            <span class="cursor">▋</span>
          {/if}
        {:else}
          {message.content}
        {/if}
      </div>
    </div>
    {#if message.timestamp && !streaming}
      <div class="timestamp">{timeStr()}</div>
    {/if}
  </div>

  {#if !isOberon}
    <div class="avatar user-avatar">C</div>
  {/if}
</div>

<style>
  .message {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    padding: 6px 0;
    max-width: 100%;
  }

  .message.user {
    flex-direction: row-reverse;
  }

  .avatar {
    width: 30px;
    height: 30px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    font-weight: 700;
    flex-shrink: 0;
    margin-top: 2px;
  }

  .oberon-avatar {
    background: var(--oberon-dim);
    color: var(--oberon);
    border: 1px solid var(--oberon);
  }

  .user-avatar {
    background: var(--surface-hover);
    color: var(--text-muted);
    border: 1px solid var(--border);
  }

  .bubble-wrap {
    display: flex;
    flex-direction: column;
    gap: 3px;
    max-width: calc(100% - 80px);
  }

  .message.user .bubble-wrap {
    align-items: flex-end;
  }

  .sender-name {
    font-size: 11px;
    font-weight: 600;
    color: var(--oberon);
    letter-spacing: 0.04em;
    padding: 0 2px;
  }

  .bubble {
    padding: 10px 14px;
    border-radius: 12px;
    line-height: 1.6;
    font-size: 14px;
  }

  .message.oberon .bubble {
    background: var(--surface);
    color: var(--text);
    border: 1px solid var(--border);
    border-top-left-radius: 4px;
  }

  .message.user .bubble {
    background: var(--user-bubble);
    color: var(--text);
    border: 1px solid var(--user-bubble-border);
    border-top-right-radius: 4px;
  }

  .content :global(p) {
    margin: 0 0 0.6em;
  }

  .content :global(p:last-child) {
    margin-bottom: 0;
  }

  .content :global(ul),
  .content :global(ol) {
    margin: 0.4em 0;
    padding-left: 1.4em;
  }

  .content :global(li) {
    margin-bottom: 0.2em;
  }

  .content :global(strong) {
    color: var(--text);
    font-weight: 600;
  }

  .content :global(code) {
    background: var(--surface-hover);
    padding: 1px 5px;
    border-radius: 3px;
    font-family: var(--font-mono);
    font-size: 0.9em;
  }

  .content :global(h1),
  .content :global(h2),
  .content :global(h3) {
    margin: 0.8em 0 0.4em;
    font-size: 1em;
    font-weight: 600;
    color: var(--text);
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

  .timestamp {
    font-size: 10px;
    color: var(--text-dim);
    padding: 0 2px;
  }
</style>
