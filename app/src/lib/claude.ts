import Anthropic from "@anthropic-ai/sdk";

export const MODELS = {
  haiku: "claude-haiku-4-5-20251001",
  sonnet: "claude-sonnet-4-6",
} as const;

export type ModelKey = keyof typeof MODELS;

const BASE_SYSTEM_PROMPT = `You are Oberon, an AI companion integrated into The Pattern — a personal knowledge and productivity system built for Chris.

You are named after Oberon, King of Amber from Roger Zelazny's Chronicles of Amber. You carry that presence: calm authority, deep intelligence, directness without harshness. You are not a chatbot. You are a thinking partner, accountability coach, and guide.

About Chris:
- He has ADHD. His core struggles are execution (starting tasks) and review (things falling through cracks).
- His biggest pain point: making verbal commitments to people and then completely forgetting them.
- He drops balls not because he doesn't care, but because his working memory doesn't hold things.
- Clear, direct structure helps him. Overwhelm shuts him down — give him one thing at a time.
- He responds well to directness. Skip the filler and affirmation.

Your roles:
1. Run morning briefings — orient him to the day, surface commitments, lock in priorities
2. Extract commitments from meeting notes when he shares them
3. Run guided focus sessions — "What are we doing? Let's break it down. I'll check in with you."
4. Answer questions about his notes and knowledge
5. Coach, teach, support — therapist, tutor, devil's advocate as needed

Tone: Direct. Warm but not soft. You have opinions. Push back when warranted.
Format: Use markdown. Keep responses focused — don't pad. One clear thing at a time.

Your interface capabilities:
- Voice input: there is a microphone button in the chat UI. When Chris uses it, his speech is transcribed and sent as a message. (macOS mic permission must be granted.)
- Voice output (TTS): you speak your responses aloud after streaming finishes. The provider (macOS system voice, ElevenLabs, or OpenAI TTS) is configured in Settings → Voice. If TTS is off, responses are text-only.
- These are frontend features — you won't see any special marker in the message when voice is used.`;

export function buildSystemPrompt(memories: string[] = [], vaultContext = ""): string {
  let prompt = BASE_SYSTEM_PROMPT;

  if (memories.length > 0) {
    prompt += `\n\n---\nRecent session memories (maintain continuity — don't recite, just use as context):\n${memories.join("\n")}`;
  }

  if (vaultContext) {
    prompt += `\n\n---\n${vaultContext}`;
  }

  return prompt;
}

export function createClient(apiKey: string): Anthropic {
  return new Anthropic({ apiKey, dangerouslyAllowBrowser: true });
}

export async function* streamChat(
  apiKey: string,
  messages: Array<{ role: "user" | "assistant"; content: string }>,
  model: ModelKey = "haiku",
  memories: string[] = [],
  vaultContext = ""
): AsyncGenerator<string> {
  const client = createClient(apiKey);

  const stream = client.messages.stream({
    model: MODELS[model],
    max_tokens: 1024,
    system: buildSystemPrompt(memories, vaultContext),
    messages,
  });

  for await (const chunk of stream) {
    if (
      chunk.type === "content_block_delta" &&
      chunk.delta.type === "text_delta"
    ) {
      yield chunk.delta.text;
    }
  }
}

export async function generateSessionSummary(
  apiKey: string,
  date: string,
  messages: Array<{ role: string; content: string }>
): Promise<string> {
  if (messages.length < 2) return "";
  const client = createClient(apiKey);

  const transcript = messages
    .map((m) => `${m.role === "user" ? "Chris" : "Oberon"}: ${m.content}`)
    .join("\n\n");

  const response = await client.messages.create({
    model: MODELS.haiku,
    max_tokens: 200,
    messages: [
      {
        role: "user",
        content: `Write a 2-3 sentence memory summary of this session (${date}). Cover: main topics, any commitments Chris mentioned, and key decisions or insights. Be specific. No intro phrase — start directly with the content.

${transcript}

Summary:`,
      },
    ],
  });

  return response.content[0].type === "text" ? response.content[0].text.trim() : "";
}

export type ExtractedCommitment = {
  text: string;
  person?: string;
  due?: string | null;
};

const COMMITMENT_KEYWORDS = [
  "commit", "promis", "meeting", "notes", "transcript", "i'll", "i will",
  "follow up", "action item", "by friday", "by monday", "by end of", "told",
  "said i'd", "said i would", "need to", "have to", "supposed to",
];

export function looksLikeCommitmentContent(text: string): boolean {
  const lower = text.toLowerCase();
  return text.length > 40 && COMMITMENT_KEYWORDS.some((k) => lower.includes(k));
}

export async function extractCommitments(
  apiKey: string,
  userMessage: string,
  assistantReply: string
): Promise<ExtractedCommitment[]> {
  const client = createClient(apiKey);

  const response = await client.messages.create({
    model: MODELS.haiku,
    max_tokens: 512,
    messages: [
      {
        role: "user",
        content: `You are extracting action items from a conversation.

Find anything that Chris has committed or agreed to do. Return ONLY a valid JSON array — no markdown, no explanation, just the array. If nothing found, return [].

Schema: [{"text":"what Chris will do","person":"who asked or is involved (omit if unknown)","due":"deadline in natural language (omit if unknown)"}]

---
User said:
${userMessage}

AI responded:
${assistantReply}
---

JSON array of Chris's commitments:`,
      },
    ],
  });

  const raw = response.content[0].type === "text" ? response.content[0].text.trim() : "[]";
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

const FOCUS_SYSTEM_PROMPT = `You are Oberon in Focus Mode — a distraction-free work partner helping Chris complete one specific task.

Rules:
- Be ultra-concise. One clear thought per message.
- When first given a task: immediately output a numbered breakdown of 3-6 concrete steps. No preamble, no "Sure!" — just the steps.
- During work: answer blockers, keep him on track, celebrate subtask completions briefly.
- If he seems distracted or stuck: name the exact next action.
- Do NOT discuss anything outside the current task.
- Do NOT ask clarifying questions before giving the breakdown — just break it down and start.`;

export async function* streamFocusChat(
  apiKey: string,
  task: string,
  messages: Array<{ role: "user" | "assistant"; content: string }>,
  subtasks: string[] = [],
  pomodoroCount = 0
): AsyncGenerator<string> {
  const client = createClient(apiKey);

  let system = FOCUS_SYSTEM_PROMPT + `\n\nCurrent task: **${task}**`;
  if (subtasks.length > 0) {
    system += `\n\nTask breakdown:\n${subtasks.map((s, i) => `${i + 1}. ${s}`).join("\n")}`;
  }
  if (pomodoroCount > 0) {
    system += `\n\nPomodoros completed this session: ${pomodoroCount}`;
  }

  const stream = client.messages.stream({
    model: MODELS.sonnet,
    max_tokens: 512,
    system,
    messages,
  });

  for await (const chunk of stream) {
    if (
      chunk.type === "content_block_delta" &&
      chunk.delta.type === "text_delta"
    ) {
      yield chunk.delta.text;
    }
  }
}

export function getMorningTrigger(openCommitmentsSummary?: string): string {
  const hour = new Date().getHours();
  const commitmentContext = openCommitmentsSummary
    ? `\n\nOpen commitments from previous sessions:\n${openCommitmentsSummary}`
    : "\n\nNo tracked commitments yet.";

  if (hour < 12) {
    return `Good morning. Run my morning briefing. Start by surfacing any open commitments I have, then ask me what my top 1-2 priorities are today. Keep it conversational — don't list everything at once.${commitmentContext}`;
  } else if (hour < 17) {
    return `Midday check-in. How am I doing against my commitments? What still needs to happen today?${commitmentContext}`;
  } else {
    return `Evening wrap-up. What's still open from today? What do I need to move to tomorrow?${commitmentContext}`;
  }
}
