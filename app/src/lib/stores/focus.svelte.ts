import { streamFocusChat } from "$lib/claude";
import { settings } from "$lib/stores/settings.svelte";

export type FocusPhase = "idle" | "planning" | "working" | "break" | "done";

export type FocusMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

export type Subtask = {
  text: string;
  done: boolean;
};

const WORK_SECONDS = 25 * 60;
const BREAK_SECONDS = 5 * 60;

function extractSubtasks(reply: string): string[] {
  const items: string[] = [];
  for (const line of reply.split("\n")) {
    const match = line.match(/^\s*(?:\d+\.|[-*•])\s+(.+)/);
    if (match) items.push(match[1].replace(/\*\*/g, "").trim());
  }
  return items.slice(0, 8);
}

function createFocusStore() {
  let phase = $state<FocusPhase>("idle");
  let task = $state("");
  let subtasks = $state<Subtask[]>([]);
  let messages = $state<FocusMessage[]>([]);
  let streamingContent = $state("");
  let isStreaming = $state(false);
  let error = $state<string | null>(null);
  let elapsed = $state(0);
  let timerRunning = $state(false);
  let pomodoroCount = $state(0);
  let timerHandle: ReturnType<typeof setInterval> | null = null;

  function timerTotal() {
    return phase === "break" ? BREAK_SECONDS : WORK_SECONDS;
  }

  function startTimer() {
    if (timerRunning) return;
    timerRunning = true;
    timerHandle = setInterval(() => {
      elapsed += 1;
      if (elapsed >= timerTotal()) {
        clearInterval(timerHandle!);
        timerHandle = null;
        timerRunning = false;
        onTimerComplete();
      }
    }, 1000);
  }

  function pauseTimer() {
    if (timerHandle) {
      clearInterval(timerHandle);
      timerHandle = null;
    }
    timerRunning = false;
  }

  function resetTimer() {
    pauseTimer();
    elapsed = 0;
  }

  async function onTimerComplete() {
    if (phase === "working") {
      pomodoroCount += 1;
      phase = "break";
      resetTimer();
      pushAssistant(
        `Pomodoro ${pomodoroCount} complete. Take 5 minutes — step away from the screen. I'll let you know when time's up.`
      );
      startTimer();
    } else if (phase === "break") {
      phase = "working";
      resetTimer();
      pushAssistant("Break over. Back to it — what's next on the list?");
      startTimer();
    }
  }

  function pushAssistant(content: string) {
    messages.push({ id: crypto.randomUUID(), role: "assistant", content });
  }

  function apiMessages() {
    return messages
      .slice(-12)
      .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));
  }

  async function startSession(text: string) {
    task = text.trim();
    phase = "planning";
    messages = [];
    subtasks = [];
    streamingContent = "";
    error = null;
    elapsed = 0;
    pomodoroCount = 0;
    timerRunning = false;

    messages.push({ id: crypto.randomUUID(), role: "user", content: task });
    isStreaming = true;
    let fullReply = "";

    try {
      const stream = streamFocusChat(
        settings.apiKey,
        task,
        [{ role: "user", content: task }],
        [],
        0
      );
      for await (const chunk of stream) {
        streamingContent += chunk;
        fullReply += chunk;
      }
      messages.push({ id: crypto.randomUUID(), role: "assistant", content: fullReply });
      const extracted = extractSubtasks(fullReply);
      subtasks = extracted.map((text) => ({ text, done: false }));
      phase = "working";
    } catch (e) {
      error = e instanceof Error ? e.message : "Something went wrong.";
      phase = "idle";
    } finally {
      isStreaming = false;
      streamingContent = "";
    }
  }

  async function sendMessage(content: string) {
    if (isStreaming || phase === "idle") return;
    error = null;

    messages.push({ id: crypto.randomUUID(), role: "user", content });
    isStreaming = true;
    streamingContent = "";
    let fullReply = "";

    try {
      const stream = streamFocusChat(
        settings.apiKey,
        task,
        apiMessages(),
        subtasks.map((s) => `${s.done ? "✓" : "○"} ${s.text}`),
        pomodoroCount
      );
      for await (const chunk of stream) {
        streamingContent += chunk;
        fullReply += chunk;
      }
      messages.push({ id: crypto.randomUUID(), role: "assistant", content: fullReply });
    } catch (e) {
      error = e instanceof Error ? e.message : "Something went wrong.";
    } finally {
      isStreaming = false;
      streamingContent = "";
    }
  }

  function toggleSubtask(i: number) {
    subtasks[i].done = !subtasks[i].done;
    const allDone = subtasks.length > 0 && subtasks.every((s) => s.done);
    if (allDone) {
      sendMessage("All steps are done.");
    }
  }

  function endSession() {
    pauseTimer();
    phase = "done";
  }

  function reset() {
    pauseTimer();
    phase = "idle";
    task = "";
    subtasks = [];
    messages = [];
    streamingContent = "";
    elapsed = 0;
    pomodoroCount = 0;
    error = null;
  }

  return {
    get phase() { return phase; },
    get task() { return task; },
    get subtasks() { return subtasks; },
    get messages() { return messages; },
    get streamingContent() { return streamingContent; },
    get isStreaming() { return isStreaming; },
    get error() { return error; },
    get elapsed() { return elapsed; },
    get timerRunning() { return timerRunning; },
    get pomodoroCount() { return pomodoroCount; },
    get timerTotal() { return timerTotal(); },
    get completedCount() { return subtasks.filter((s) => s.done).length; },
    startSession,
    sendMessage,
    toggleSubtask,
    startTimer,
    pauseTimer,
    endSession,
    reset,
  };
}

export const focusStore = createFocusStore();
