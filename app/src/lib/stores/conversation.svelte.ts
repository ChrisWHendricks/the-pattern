import {
  streamChat,
  getMorningTrigger,
  extractCommitments,
  looksLikeCommitmentContent,
  generateSessionSummary,
} from "$lib/claude";
import { searchNotes, buildVaultContext } from "$lib/search";
import { settings } from "$lib/stores/settings.svelte";
import { commitments } from "$lib/stores/commitments.svelte";
import { sessionStore } from "$lib/stores/sessions.svelte";
import { vault } from "$lib/stores/vault.svelte";
import { loadJournalEntry, todayDateStr } from "$lib/vault";

export type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  vaultCitations?: string[]; // note titles used to answer this message
};

const MAX_CONTEXT_MESSAGES = 30;

function createConversation() {
  let messages = $state<Message[]>(sessionStore.todaySession().messages ?? []);
  let streamingContent = $state("");
  let isStreaming = $state(false);
  let isSearching = $state(false);
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

    // Search vault for relevant context
    isSearching = true;
    let vaultContext = "";
    let citedNotes: string[] = [];
    try {
      const results = searchNotes(content, vault.searchIndex);
      if (results.length > 0) {
        vaultContext = buildVaultContext(results);
        citedNotes = results.map((r) => r.title);
      }
    } finally {
      isSearching = false;
    }

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
      const stream = streamChat(
        settings.apiKey,
        apiMessages(),
        settings.model,
        memories,
        vaultContext
      );

      for await (const chunk of stream) {
        streamingContent += chunk;
        fullReply += chunk;
      }

      messages.push({
        id: crypto.randomUUID(),
        role: "assistant",
        content: fullReply,
        timestamp: new Date(),
        vaultCitations: citedNotes.length > 0 ? citedNotes : undefined,
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
    const vaultResults = searchNotes(
      "today priorities commitments tasks focus",
      vault.searchIndex,
      3
    );
    const vaultContext = buildVaultContext(vaultResults);
    const trigger = getMorningTrigger(commitments.openSummary());

    // Pull today's journal entry into the briefing if available
    let journalContext = "";
    if (settings.vaultPath) {
      try {
        const entry = await loadJournalEntry(settings.vaultPath, todayDateStr());
        const stripped = entry.replace(/^#.+\n/m, "").trim();
        if (stripped) journalContext = `\n\nToday's journal:\n${stripped}`;
      } catch {
        // Non-critical
      }
    }

    const parts = [trigger, journalContext];
    if (vaultContext) parts.push(`\n\nAdditional vault context:\n${vaultContext}`);

    await send(parts.join(""));
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
      // Non-critical
    } finally {
      isSummarizing = false;
    }

    sessionStore.saveMessages([]);
    messages = [];
    streamingContent = "";
    error = null;
  }

  return {
    get messages() { return messages; },
    get streamingContent() { return streamingContent; },
    get isStreaming() { return isStreaming; },
    get isSearching() { return isSearching; },
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
