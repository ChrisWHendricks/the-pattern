import {
  streamChat,
  getMorningTrigger,
  extractCommitments,
  looksLikeCommitmentContent,
  generateSessionSummary,
} from "$lib/claude";
import { settings } from "$lib/stores/settings.svelte";
import { commitments } from "$lib/stores/commitments.svelte";
import { sessionStore } from "$lib/stores/sessions.svelte";

export type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
};

const MAX_CONTEXT_MESSAGES = 30;

function createConversation() {
  const todaySession = sessionStore.todaySession();
  let messages = $state<Message[]>(todaySession.messages ?? []);
  let streamingContent = $state("");
  let isStreaming = $state(false);
  let isSummarizing = $state(false);
  let error = $state<string | null>(null);
  let extracting = $state(false);

  function apiMessages() {
    return messages
      .slice(-MAX_CONTEXT_MESSAGES)
      .map((m) => ({ role: m.role, content: m.content }));
  }

  async function runExtractionSilently(userText: string, assistantText: string) {
    if (!looksLikeCommitmentContent(userText)) return;
    extracting = true;
    try {
      const found = await extractCommitments(settings.apiKey, userText, assistantText);
      if (found.length > 0) commitments.addMany(found);
    } catch {
      // Silent
    } finally {
      extracting = false;
    }
  }

  async function send(content: string) {
    if (isStreaming || !settings.hasApiKey) return;

    error = null;
    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content,
      timestamp: new Date(),
    };
    messages.push(userMsg);
    sessionStore.saveMessages(messages);

    isStreaming = true;
    streamingContent = "";

    let fullReply = "";
    try {
      const memories = sessionStore.recentMemories(4);
      const stream = streamChat(settings.apiKey, apiMessages(), settings.model, memories);
      for await (const chunk of stream) {
        streamingContent += chunk;
        fullReply += chunk;
      }

      messages.push({
        id: crypto.randomUUID(),
        role: "assistant",
        content: fullReply,
        timestamp: new Date(),
      });
      sessionStore.saveMessages(messages);

      runExtractionSilently(content, fullReply);
    } catch (e) {
      error =
        e instanceof Error ? e.message : "Something went wrong talking to Oberon.";
    } finally {
      isStreaming = false;
      streamingContent = "";
    }
  }

  async function startMorningBriefing() {
    await send(getMorningTrigger(commitments.openSummary()));
  }

  async function startNewSession() {
    if (messages.length < 2 || isSummarizing) return;

    isSummarizing = true;
    try {
      const currentSession = sessionStore.todaySession();
      const summary = await generateSessionSummary(
        settings.apiKey,
        currentSession.date,
        messages.map((m) => ({ role: m.role, content: m.content }))
      );
      if (summary) sessionStore.saveSummary(currentSession.id, summary);
    } catch {
      // Non-critical — start new session anyway
    } finally {
      isSummarizing = false;
    }

    // Force a new session date key by pushing a fresh session
    sessionStore.saveMessages([]);
    messages = [];
    streamingContent = "";
    error = null;
  }

  return {
    get messages() { return messages; },
    get streamingContent() { return streamingContent; },
    get isStreaming() { return isStreaming; },
    get isSummarizing() { return isSummarizing; },
    get extracting() { return extracting; },
    get error() { return error; },
    get isEmpty() { return messages.length === 0; },
    get sessionCount() { return sessionStore.sessions.length; },
    send,
    startMorningBriefing,
    startNewSession,
  };
}

export const conversation = createConversation();
