import Anthropic from "@anthropic-ai/sdk";

export const MODELS = {
  haiku: "claude-haiku-4-5-20251001",
  sonnet: "claude-sonnet-4-6",
} as const;

export type ModelKey = keyof typeof MODELS;
export type OberonMode = "coach" | "assistant";

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

The Pattern app capabilities you can reference and invoke:
- **Vault**: personal knowledge base of Inscriptions (markdown notes) and Chronicles (daily journal entries)
- **Shadows**: named collections of Inscriptions — like notebooks or project folders
- **Quick Capture**: global hotkey (Cmd+Shift+K) captures a thought from anywhere on the system
- **Focus Mode**: distraction-free Pomodoro work session with task breakdown
- **Commitments**: tracks verbal promises Chris makes to people
- **Issue Tracker**: defects and feature requests for The Pattern app itself
- **Voice I/O**: microphone for voice input, TTS for voice output (configured in Settings → Voice)

Actions you can perform — use tool calls, never say you "can't do" these:
- Create a Shadow, list Shadows, assign an Inscription to a Shadow
- Create a defect or feature request, list issues, update an issue's status

Your interface capabilities:
- Voice input: microphone button in the chat UI transcribes speech (macOS mic permission must be granted)
- Voice output (TTS): responses spoken aloud after streaming; provider configured in Settings → Voice`;

const ASSISTANT_MODE_SECTION = `

---
**You are currently in Assistant mode.** Answer questions directly and helpfully — like a knowledgeable colleague, not an accountability coach. Do not volunteer coaching, push back on task framing, or redirect to "what do you need this for." Commitment extraction is paused. Just help.`;

export function buildSystemPrompt(
  memories: string[] = [],
  vaultContext = "",
  mode: OberonMode = "coach"
): string {
  let prompt = BASE_SYSTEM_PROMPT;

  if (mode === "assistant") {
    prompt += ASSISTANT_MODE_SECTION;
  }

  if (memories.length > 0) {
    prompt += `\n\n---\nRecent session memories (maintain continuity — don't recite, just use as context):\n${memories.join("\n")}`;
  }

  if (vaultContext) {
    prompt += `\n\n---\n${vaultContext}`;
  }

  return prompt;
}

// ── Tool definitions ──────────────────────────────────────────────────────────

export const APP_TOOLS: Anthropic.Tool[] = [
  {
    name: "create_shadow",
    description: "Create a new Shadow (collection/notebook) in the user's vault.",
    input_schema: {
      type: "object" as const,
      properties: {
        name: { type: "string", description: "Name for the new Shadow" },
        description: { type: "string", description: "Optional description" },
      },
      required: ["name"],
    },
  },
  {
    name: "list_shadows",
    description: "List all existing Shadows with their names and inscription counts.",
    input_schema: { type: "object" as const, properties: {} },
  },
  {
    name: "add_inscription_to_shadow",
    description: "Assign an existing Inscription (note) to a Shadow by fuzzy-matching their names.",
    input_schema: {
      type: "object" as const,
      properties: {
        shadowName: { type: "string", description: "Name or partial name of the Shadow" },
        inscriptionTitle: { type: "string", description: "Title or partial title of the Inscription to add" },
      },
      required: ["shadowName", "inscriptionTitle"],
    },
  },
  {
    name: "create_issue",
    description: "Log a defect or feature request for The Pattern app itself.",
    input_schema: {
      type: "object" as const,
      properties: {
        type: { type: "string", enum: ["defect", "feature"], description: "Bug or feature request" },
        title: { type: "string", description: "Short title" },
        description: { type: "string", description: "Optional additional detail" },
      },
      required: ["type", "title"],
    },
  },
  {
    name: "list_issues",
    description: "List defects and/or feature requests, optionally filtered by type or status.",
    input_schema: {
      type: "object" as const,
      properties: {
        type: { type: "string", enum: ["defect", "feature"], description: "Filter by type (omit for all)" },
        status: { type: "string", enum: ["open", "in-progress", "done"], description: "Filter by status (omit for all)" },
      },
    },
  },
  {
    name: "update_issue_status",
    description: "Update the status of an issue by fuzzy-matching its title.",
    input_schema: {
      type: "object" as const,
      properties: {
        title: { type: "string", description: "Title or partial title of the issue to update" },
        status: { type: "string", enum: ["open", "in-progress", "done"], description: "New status" },
      },
      required: ["title", "status"],
    },
  },
];

// ── Streaming ─────────────────────────────────────────────────────────────────

export function createClient(apiKey: string): Anthropic {
  return new Anthropic({ apiKey, dangerouslyAllowBrowser: true });
}

type CollectedBlock =
  | { type: "text"; text: string }
  | { type: "tool_use"; id: string; name: string; input: Record<string, unknown> };

export async function* streamChat(
  apiKey: string,
  messages: Array<{ role: "user" | "assistant"; content: string }>,
  model: ModelKey = "haiku",
  memories: string[] = [],
  vaultContext = "",
  options?: {
    mode?: OberonMode;
    tools?: Anthropic.Tool[];
    onToolCall?: (name: string, input: Record<string, unknown>) => Promise<string>;
    onToolStart?: () => void;
    onToolEnd?: () => void;
  }
): AsyncGenerator<string> {
  const client = createClient(apiKey);
  const systemPrompt = buildSystemPrompt(memories, vaultContext, options?.mode ?? "coach");
  const hasTools = (options?.tools?.length ?? 0) > 0;

  // Phase 1: stream (yields text immediately; also collects blocks for tool round-trip)
  const stream = client.messages.stream({
    model: MODELS[model],
    max_tokens: 1024,
    system: systemPrompt,
    messages: messages as Anthropic.Messages.MessageParam[],
    ...(hasTools ? { tools: options!.tools } : {}),
  });

  const collectedBlocks: CollectedBlock[] = [];
  let blockIndex = -1;
  let toolInputJson = "";
  let stopReason: string | null = null;

  for await (const event of stream) {
    if (event.type === "content_block_start") {
      blockIndex++;
      toolInputJson = "";
      if (event.content_block.type === "text") {
        collectedBlocks.push({ type: "text", text: "" });
      } else if (event.content_block.type === "tool_use") {
        collectedBlocks.push({
          type: "tool_use",
          id: event.content_block.id,
          name: event.content_block.name,
          input: {},
        });
      }
    } else if (event.type === "content_block_delta") {
      if (event.delta.type === "text_delta") {
        yield event.delta.text;
        const block = collectedBlocks[blockIndex];
        if (block?.type === "text") block.text += event.delta.text;
      } else if (event.delta.type === "input_json_delta") {
        toolInputJson += event.delta.partial_json;
      }
    } else if (event.type === "content_block_stop") {
      const block = collectedBlocks[blockIndex];
      if (block?.type === "tool_use" && toolInputJson) {
        try { block.input = JSON.parse(toolInputJson); } catch { /* keep {} */ }
      }
    } else if (event.type === "message_delta") {
      stopReason = event.delta.stop_reason ?? null;
    }
  }

  if (stopReason !== "tool_use" || !options?.onToolCall) return;

  // Tool round-trip: execute tools, then stream Phase 2 response
  options.onToolStart?.();

  const toolResults: Anthropic.Messages.ToolResultBlockParam[] = [];
  for (const block of collectedBlocks) {
    if (block.type === "tool_use") {
      const result = await options.onToolCall(block.name, block.input);
      toolResults.push({ type: "tool_result", tool_use_id: block.id, content: result });
    }
  }

  options.onToolEnd?.();

  const phase2Messages: Anthropic.Messages.MessageParam[] = [
    ...(messages as Anthropic.Messages.MessageParam[]),
    { role: "assistant", content: collectedBlocks as Anthropic.Messages.ContentBlock[] },
    { role: "user", content: toolResults },
  ];

  const stream2 = client.messages.stream({
    model: MODELS[model],
    max_tokens: 1024,
    system: systemPrompt,
    messages: phase2Messages,
  });

  for await (const chunk of stream2) {
    if (chunk.type === "content_block_delta" && chunk.delta.type === "text_delta") {
      yield chunk.delta.text;
    }
  }
}

// ── Session utilities ─────────────────────────────────────────────────────────

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
