import {
  streamChat,
  getMorningTrigger,
  extractCommitments,
  looksLikeCommitmentContent,
  generateSessionSummary,
  APP_TOOLS,
  type OberonMode,
} from "$lib/claude";
import { findOpenLoops } from "$lib/openLoops";
import { searchInscriptions, buildVaultContext } from "$lib/search";
import { settings } from "$lib/stores/settings.svelte";
import { commitments } from "$lib/stores/commitments.svelte";
import { sparks } from "$lib/stores/sparks.svelte";
import { sessionStore } from "$lib/stores/sessions.svelte";
import { vault } from "$lib/stores/vault.svelte";
import { shadowsStore } from "$lib/stores/shadows.svelte";
import { issuesStore } from "$lib/stores/issues.svelte";
import { loadChronicleEntry, saveChronicleEntry, todayDateStr } from "$lib/vault";
import { logrusStore } from "$lib/stores/logrus.svelte";
import { logrusIcon } from "$lib/logrus";
import { top3Store } from "$lib/stores/top3.svelte";
import { invoke } from "@tauri-apps/api/core";

export type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  vaultCitations?: string[];
};

const MAX_CONTEXT_MESSAGES = 30;

function fuzzyFind<T>(items: T[], query: string, key: (item: T) => string): T | undefined {
  const q = query.toLowerCase();
  return (
    items.find((i) => key(i).toLowerCase() === q) ??
    items.find((i) => key(i).toLowerCase().includes(q)) ??
    items.find((i) => q.includes(key(i).toLowerCase()))
  );
}

function createConversation() {
  let messages = $state<Message[]>(sessionStore.todaySession().messages ?? []);
  let streamingContent = $state("");
  let isStreaming = $state(false);
  let isSearching = $state(false);
  let isSummarizing = $state(false);
  let isExecutingTool = $state(false);
  let error = $state<string | null>(null);
  let extracting = $state(false);
  let mode = $state<OberonMode>(
    (localStorage.getItem("oberon_mode") as OberonMode) ?? "coach"
  );

  function setMode(m: OberonMode) {
    mode = m;
    localStorage.setItem("oberon_mode", m);
  }

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

  async function executeAppTool(name: string, input: Record<string, unknown>): Promise<string> {
    switch (name) {
      case "add_commitment": {
        commitments.add({
          text: input.text as string,
          person: (input.person as string | undefined) ?? undefined,
          due: (input.due as string | undefined) ?? null,
        });
        return `Commitment added: "${input.text}"${input.person ? ` (for ${input.person})` : ""}${input.due ? ` — due ${input.due}` : ""}`;
      }

      case "list_commitments": {
        return commitments.openSummary();
      }

      case "complete_commitment": {
        const query = (input.text as string).toLowerCase();
        const match = commitments.open.find(
          (c) => c.text.toLowerCase().includes(query) || query.includes(c.text.toLowerCase())
        );
        if (!match) return `No open commitment matching "${input.text}" found.`;
        commitments.complete(match.id);
        return `Marked complete: "${match.text}"`;
      }

      case "delete_commitment": {
        const query = (input.text as string).toLowerCase();
        const match = commitments.open.find(
          (c) => c.text.toLowerCase().includes(query) || query.includes(c.text.toLowerCase())
        );
        if (!match) return `No open commitment matching "${input.text}" found.`;
        commitments.remove(match.id);
        return `Deleted: "${match.text}"`;
      }

      case "demote_commitment": {
        const query = (input.text as string).toLowerCase();
        const match = commitments.open.find(
          (c) => c.text.toLowerCase().includes(query) || query.includes(c.text.toLowerCase())
        );
        if (!match) return `No open commitment matching "${input.text}" found.`;
        commitments.remove(match.id);
        sparks.add(match.text);
        return `Moved to sparks: "${match.text}"`;
      }

      case "add_spark": {
        sparks.add(input.text as string);
        return `Spark captured: "${input.text}"`;
      }

      case "list_sparks": {
        return sparks.openSummary();
      }

      case "promote_spark": {
        const query = (input.text as string).toLowerCase();
        const match = sparks.open.find(
          (s) => s.text.toLowerCase().includes(query) || query.includes(s.text.toLowerCase())
        );
        if (!match) return `No open spark matching "${input.text}" found.`;
        sparks.markPromoted(match.id);
        commitments.add({ text: match.text });
        return `Promoted to commitment: "${match.text}"`;
      }

      case "create_shadow": {
        if (!settings.vaultPath) return "No vault path configured. Set one in Settings first.";
        const shadow = shadowsStore.createShadow(
          input.name as string,
          (input.description as string | undefined) ?? ""
        );
        return `Created Shadow "${shadow.name}"`;
      }

      case "list_shadows": {
        const shadows = shadowsStore.shadows;
        if (shadows.length === 0) return "No Shadows exist yet.";
        return shadows
          .map((s) => {
            const count = shadowsStore.getInscriptionPaths(s.id).length;
            return `- **${s.name}**${s.description ? ` — ${s.description}` : ""} (${count} inscription${count !== 1 ? "s" : ""})`;
          })
          .join("\n");
      }

      case "add_inscription_to_shadow": {
        const shadow = fuzzyFind(shadowsStore.shadows, input.shadowName as string, (s) => s.name);
        if (!shadow) {
          const names = shadowsStore.shadows.map((s) => s.name).join(", ");
          return `Shadow "${input.shadowName}" not found. Available: ${names || "none"}`;
        }
        const inscription = fuzzyFind(vault.inscriptions, input.inscriptionTitle as string, (i) => i.title);
        if (!inscription) return `Inscription "${input.inscriptionTitle}" not found in the vault.`;
        if (shadowsStore.isAssigned(shadow.id, inscription.path)) {
          return `"${inscription.title}" is already in Shadow "${shadow.name}"`;
        }
        shadowsStore.assign(shadow.id, inscription.path);
        return `Added "${inscription.title}" to Shadow "${shadow.name}"`;
      }

      case "create_issue": {
        const issue = issuesStore.create(
          input.type as "defect" | "feature",
          input.title as string,
          (input.description as string | undefined) ?? ""
        );
        return `Logged ${issue.type}: "${issue.title}" (status: ${issue.status})`;
      }

      case "list_issues": {
        const filter: { type?: "defect" | "feature"; status?: "open" | "in-progress" | "done" } = {};
        if (input.type) filter.type = input.type as "defect" | "feature";
        if (input.status) filter.status = input.status as "open" | "in-progress" | "done";
        const items = issuesStore.list(filter);
        if (items.length === 0) return "No issues found.";
        return items
          .map((i) => `- [${i.status}] **${i.type}**: ${i.title}${i.description ? ` — ${i.description}` : ""}`)
          .join("\n");
      }

      case "update_issue_status": {
        const issue = fuzzyFind(issuesStore.issues, input.title as string, (i) => i.title);
        if (!issue) {
          return `Issue "${input.title}" not found. Use "list issues" to see what's available.`;
        }
        issuesStore.updateStatus(issue.id, input.status as "open" | "in-progress" | "done");
        return `Updated "${issue.title}" → ${input.status}`;
      }

      case "list_logrus": {
        if (!settings.vaultPath) return "No vault configured.";
        await logrusStore.scan();
        const logrusItems = logrusStore.items;
        if (logrusItems.length === 0) return "The Logrus is empty — no unprocessed items waiting.";
        const lines = logrusItems.map(
          (i) => `${logrusIcon(i)} **${i.filename}** (${i.type})`
        );
        return `${logrusItems.length} item${logrusItems.length !== 1 ? "s" : ""} in The Logrus:\n${lines.join("\n")}`;
      }

      case "read_today_chronicle": {
        if (!settings.vaultPath) return "No vault configured. Set a vault path in Settings first.";
        try {
          const entry = await loadChronicleEntry(settings.vaultPath, todayDateStr());
          const body = entry.replace(/^#.+\n/m, "").trim();
          return body || "Today's chronicle exists but is empty — nothing written yet.";
        } catch {
          return "Could not read today's chronicle.";
        }
      }

      case "append_to_chronicle": {
        if (!settings.vaultPath) return "No vault configured. Set a vault path in Settings first.";
        try {
          const existing = await loadChronicleEntry(settings.vaultPath, todayDateStr());
          const appended = existing.trimEnd() + "\n\n" + (input.content as string).trim();
          await saveChronicleEntry(settings.vaultPath, todayDateStr(), appended);
          return "Added to today's chronicle.";
        } catch (e) {
          return `Failed to write to chronicle: ${e instanceof Error ? e.message : String(e)}`;
        }
      }

      case "get_cockpit_briefing": {
        const hour = new Date().getHours();
        const timeOfDay = hour < 12 ? "morning" : hour < 17 ? "afternoon" : "evening";

        const openCommitments = commitments.open;
        const commitmentLines = openCommitments.slice(0, 6).map((c) => {
          let line = `- ${c.text}`;
          if (c.person) line += ` (→ ${c.person})`;
          if (c.due) line += ` [due: ${c.due}]`;
          return line;
        }).join("\n");

        const priorities = top3Store.items;
        const top3Filled = priorities.filter((i) => i.text.trim()).length;
        const top3Done = priorities.filter((i) => i.done).length;
        const top3Lines = priorities
          .filter((i) => i.text.trim())
          .map((item, idx) => `${idx + 1}. ${item.text}${item.done ? " ✓" : ""}`)
          .join("\n");

        const loops = findOpenLoops(vault.searchIndex, 5);
        const loopLines = loops.map((l) => `- ${l.text} (in: ${l.title})`).join("\n");

        let logrusCount = logrusStore.items.length;
        if (logrusCount === 0 && settings.vaultPath) {
          await logrusStore.scan();
          logrusCount = logrusStore.items.length;
        }

        let sparksSection = "";
        if (input.include_sparks !== false) {
          const openSparks = sparks.open.slice(0, 5);
          if (openSparks.length > 0) {
            sparksSection = `\nOpen sparks:\n${openSparks.map((s) => `- ${s.text}`).join("\n")}`;
          }
        }

        return `COCKPIT SNAPSHOT — ${timeOfDay.toUpperCase()}

Open commitments (${openCommitments.length} total):
${commitmentLines || "None"}

Top 3 today: ${top3Filled > 0 ? `${top3Done}/${top3Filled} done` : "Not set yet"}
${top3Lines || "(empty)"}

Open loops in vault: ${loops.length}
${loopLines || "None found"}

Logrus inbox: ${logrusCount} item${logrusCount !== 1 ? "s" : ""} waiting${sparksSection}`;
      }

      case "search_jira_issues": {
        if (!settings.jiraApiConnected) return "Jira API credentials not configured. Add your email and API token in Settings → Jira.";
        try {
          return await invoke<string>("jira_search", {
            baseUrl: settings.jiraBaseUrl,
            email: settings.jiraEmail,
            apiToken: settings.jiraApiToken,
            jql: input.jql as string,
            maxResults: (input.max_results as number | undefined) ?? 10,
          });
        } catch (e) {
          return `Jira search failed: ${e instanceof Error ? e.message : String(e)}`;
        }
      }

      case "get_jira_issue": {
        if (!settings.jiraApiConnected) return "Jira API credentials not configured. Add your email and API token in Settings → Jira.";
        try {
          return await invoke<string>("jira_get_issue", {
            baseUrl: settings.jiraBaseUrl,
            email: settings.jiraEmail,
            apiToken: settings.jiraApiToken,
            issueKey: input.issue_key as string,
          });
        } catch (e) {
          return `Jira get issue failed: ${e instanceof Error ? e.message : String(e)}`;
        }
      }

      case "create_jira_issue": {
        if (!settings.jiraApiConnected) return "Jira API credentials not configured. Add your email and API token in Settings → Jira.";
        try {
          return await invoke<string>("jira_create_issue", {
            baseUrl: settings.jiraBaseUrl,
            email: settings.jiraEmail,
            apiToken: settings.jiraApiToken,
            projectKey: input.project_key as string,
            issueType: (input.issue_type as string | undefined) ?? "Task",
            summary: input.summary as string,
            description: (input.description as string | undefined) ?? null,
          });
        } catch (e) {
          return `Jira create issue failed: ${e instanceof Error ? e.message : String(e)}`;
        }
      }

      case "add_jira_comment": {
        if (!settings.jiraApiConnected) return "Jira API credentials not configured. Add your email and API token in Settings → Jira.";
        try {
          return await invoke<string>("jira_add_comment", {
            baseUrl: settings.jiraBaseUrl,
            email: settings.jiraEmail,
            apiToken: settings.jiraApiToken,
            issueKey: input.issue_key as string,
            comment: input.comment as string,
          });
        } catch (e) {
          return `Jira add comment failed: ${e instanceof Error ? e.message : String(e)}`;
        }
      }

      default:
        return `Unknown tool: ${name}`;
    }
  }

  async function send(content: string) {
    if (isStreaming || !settings.hasApiKey) return;

    error = null;

    isSearching = true;
    let vaultContext = "";
    let citedNotes: string[] = [];
    try {
      const results = searchInscriptions(content, vault.searchIndex);
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
        vaultContext,
        {
          mode,
          tools: APP_TOOLS,
          onToolCall: executeAppTool,
          onToolStart: () => { isExecutingTool = true; },
          onToolEnd: () => { isExecutingTool = false; },
        }
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

      if (mode === "coach") {
        runExtractionSilently(content, fullReply);
      }
    } catch (e) {
      console.error("[conversation] send error:", e);
      error = e instanceof Error ? e.message : String(e) || "Something went wrong talking to Oberon.";
    } finally {
      isStreaming = false;
      isExecutingTool = false;
      streamingContent = "";
    }
  }

  async function startCockpitBriefing() {
    const hour = new Date().getHours();
    const greeting = hour < 12 ? "morning" : hour < 17 ? "afternoon" : "evening";
    await send(`Good ${greeting}. Run my cockpit briefing — call get_cockpit_briefing first, then give me a direct 2-3 sentence summary of what needs my attention most right now. End with one specific question: what do I want to tackle first?`);
  }

  async function startMorningBriefing() {
    const vaultResults = searchInscriptions(
      "today priorities commitments tasks focus",
      vault.searchIndex,
      3
    );
    const vaultContext = buildVaultContext(vaultResults);
    const trigger = getMorningTrigger(commitments.openSummary());

    let chronicleContext = "";
    if (settings.vaultPath) {
      try {
        const entry = await loadChronicleEntry(settings.vaultPath, todayDateStr());
        const stripped = entry.replace(/^#.+\n/m, "").trim();
        if (stripped) chronicleContext = `\n\nToday's chronicle:\n${stripped}`;
      } catch {
        // Non-critical
      }
    }

    const parts = [trigger, chronicleContext];
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
    get isExecutingTool() { return isExecutingTool; },
    get extracting() { return extracting; },
    get error() { return error; },
    get isEmpty() { return messages.length === 0; },
    get sessionCount() { return sessionStore.sessions.length; },
    get mode() { return mode; },
    setMode,
    send,
    startMorningBriefing,
    startCockpitBriefing,
    startNewSession,
  };
}

export const conversation = createConversation();
