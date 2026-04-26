import type { Message } from "$lib/stores/conversation.svelte";

const SESSIONS_KEY = "the_pattern_sessions";
const MAX_SESSIONS = 10;

export type StoredSession = {
  id: string;
  date: string; // YYYY-MM-DD
  messages: Message[];
  summary?: string;
  summarizedAt?: string;
};

function todayStr(): string {
  return new Date().toISOString().split("T")[0];
}

function loadAll(): StoredSession[] {
  if (typeof localStorage === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(SESSIONS_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function createSessionsStore() {
  let sessions = $state<StoredSession[]>(loadAll());

  function persist() {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
    }
  }

  function getOrCreateToday(): StoredSession {
    const today = todayStr();
    let session = sessions.find((s) => s.date === today);
    if (!session) {
      session = { id: crypto.randomUUID(), date: today, messages: [] };
      sessions.unshift(session);
      if (sessions.length > MAX_SESSIONS) sessions.splice(MAX_SESSIONS);
      persist();
    }
    return session;
  }

  return {
    get sessions() { return sessions; },

    todaySession(): StoredSession {
      return getOrCreateToday();
    },

    saveMessages(msgs: Message[]) {
      const session = getOrCreateToday();
      session.messages = msgs;
      persist();
    },

    saveSummary(sessionId: string, summary: string) {
      const session = sessions.find((s) => s.id === sessionId);
      if (session) {
        session.summary = summary;
        session.summarizedAt = new Date().toISOString();
        persist();
      }
    },

    // Last N session summaries for Oberon's memory context
    recentMemories(count = 4): string[] {
      return sessions
        .filter((s) => s.summary && s.date !== todayStr())
        .slice(0, count)
        .map((s) => `[${s.date}] ${s.summary}`);
    },

    // Last N messages from previous sessions for context continuity
    previousMessages(count = 10): Message[] {
      const today = todayStr();
      const prev = sessions.find((s) => s.date !== today && s.messages.length > 0);
      if (!prev) return [];
      return prev.messages.slice(-count);
    },
  };
}

export const sessionStore = createSessionsStore();
