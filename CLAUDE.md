# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

All commands run from `app/`:

```bash
pnpm dev          # Vite dev server only (port 1420) — no Tauri window
pnpm tauri dev    # Full app: Vite + Tauri window (use this for UI work)
pnpm build        # Production frontend build
pnpm tauri build  # Full macOS .app bundle
pnpm check        # svelte-check + TypeScript (run before committing)
```

`pnpm check` is the only test/lint step. Run it to catch type errors in Svelte and TS files.

To add a Rust dependency: edit `app/src-tauri/Cargo.toml`, then `cargo build` from `app/src-tauri/`.

## Architecture

Two cooperating processes — no Python sidecar, no network services:

```
Tauri Rust shell  ←──── invoke() IPC ────→  SvelteKit WebView (Vite)
  lib.rs                                       src/routes/ + src/lib/
  • Window management                          • All UI
  • Global hotkey (⌘⇧K)                       • Svelte 5 runes stores
  • macOS TTS via NSSpeechSynthesizer          • Claude API (streamed)
  • Raw filesystem access                      • Local search index
  • Mic permission grant (WKWebView hack)      • localStorage persistence
```

### Two windows

- **main** (1200×800) — the full app. Close button hides to dock; clicking the dock icon re-shows it.
- **capture** (520×220, always-on-top, hidden by default) — quick-capture overlay opened by the global hotkey.

### Data persistence

| What | Where |
|------|-------|
| App settings (API key, vault path, voices) | `localStorage` via `settings.svelte.ts` |
| Commitments, shadows, issues, top3, sessions | `localStorage` via their respective stores |
| Inscriptions (notes), chronicles (journal) | Markdown files on disk in the configured vault path |

The vault path is user-configured. All file I/O goes through Tauri `invoke()` commands (`read_text_file`, `write_text_file`, etc.) because Tauri's scoped `plugin-fs` can't reach arbitrary Google Drive paths.

## Frontend Structure

**Svelte 5 runes** throughout — use `$state`, `$derived`, `$effect`. No Svelte 4 stores pattern.

### Stores (`src/lib/stores/`)

Each store file exports a single reactive object. All localStorage persistence is handled inside the store. Key stores:

| Store export | Manages |
|---|---|
| `settings` | API key, model, vault path, TTS config |
| `conversation` | Active Oberon chat messages + streaming state |
| `vault` | Inscription list + in-memory search index |
| `commitments` | Open/completed commitments (ADHD working memory aid) |
| `top3Store` | Today's three priorities |
| `focusStore` | Focus/Pomodoro session state |
| `shadowsStore` | Collections (Shadows) of inscriptions |
| `chronicles` | Daily journal entries |
| `braindump` | Brain dump triage state |

### Routes (`src/routes/`)

| Route | Purpose |
|---|---|
| `/` | Oberon chat (main view) |
| `/cockpit` | Dashboard: Top 3 + commitments + quick actions |
| `/top3` | Focused Top 3 editor |
| `/focus` | Pomodoro + task breakdown with AI chat. Accepts `?task=` param to pre-fill. |
| `/brain-dump` | Paste items → AI triage → routes to inscriptions/commitments/journal |
| `/inscriptions` | Note browser |
| `/chronicles` | Daily journal viewer |
| `/shadows` + `/shadows/[id]` | Collections manager |
| `/artifacts` | AI-generated content |
| `/logrus` | Inbox |
| `/developer` | Issue tracker + dev tools |
| `/capture` | Floating quick-capture window (separate Tauri window) |

## AI Integration (`src/lib/claude.ts`)

### Models

```typescript
MODELS.haiku   // "claude-haiku-4-5-20251001" — fast, used for triage/summaries
MODELS.sonnet  // "claude-sonnet-4-6" — used for Oberon chat
```

### `streamChat(messages, options)`

Handles two-phase streaming: text stream → (if tool_use stop) → tool execution → follow-up stream. Yields tokens as `AsyncGenerator<string>`. Tool execution delegates to `executeAppTool()` in `conversation.svelte.ts`.

### Adding a new Oberon tool

1. Add the tool definition to `APP_TOOLS` array in `claude.ts` — follow the existing schema shape.
2. Add the tool name to the system prompt's "Actions you can perform" list in `buildSystemPrompt()`.
3. Add a `case` handler in `executeAppTool()` in `conversation.svelte.ts`.

### `buildSystemPrompt(mode, vault, memories)`

Injects: Oberon persona + Chris's ADHD context, app capabilities, tool list, vault context (top search results), and optional memories. Mode `"coach"` adds accountability framing; mode `"assistant"` strips it.

### Utility functions

- `triageBrainDump(items)` — Haiku classifies items as inscription/commitment/chronicle/discard
- `extractCommitments(userMsg, assistantReply)` — Haiku pulls action items from a conversation turn
- `generateSessionSummary(messages)` — Haiku summarizes a session (2-3 sentences)
- `streamFocusChat(messages)` — Sonnet in ultra-concise mode for distraction-free task breakdown
- `stripJsonFences(text)` — strips ```json fences before `JSON.parse` (Claude sometimes adds them)

## Tauri Rust Commands (`src-tauri/src/lib.rs`)

Registered IPC commands callable via `invoke("command_name", { args })`:

| Command | Notes |
|---|---|
| `speak_text(text, voice)` | macOS NSSpeechSynthesizer via unsafe ObjC. Uses `STOP_SPEAKING` atomic flag. |
| `stop_speaking_native()` | Sets the stop flag |
| `list_system_voices()` | Returns English voices (WKWebView can't enumerate premium voices itself) |
| `read_text_file(path)` / `write_text_file(path, content)` | Bypass scoped FS for arbitrary paths |
| `copy_file(src, dest)` / `delete_file(path)` / `list_dir(path)` | Standard FS ops |
| `read_file_base64(path)` | For binary files (PDFs, images) |

To add a new command: write the `#[tauri::command]` function in `lib.rs`, then add it to the `.invoke_handler(tauri::generate_handler![...])` list.

### macOS-specific setup in `run()`

- `install_media_permission_delegate` — patches WKUIDelegate to auto-grant microphone access (required; `webkitSpeechRecognition` is blocked by default in WKWebView)
- `on_window_event` — intercepts CloseRequested on `"main"` to hide instead of quit
- `RunEvent::Reopen` handler — shows and focuses the main window when clicking the dock icon

## Local Search (`src/lib/search.ts`)

Client-side only. No external search service. `searchInscriptions(query, index, topK, minScore)` uses TF-log scoring with title hits weighted 3×. `buildVaultContext(results)` formats results for injection into the system prompt. The vault store builds the index by loading all inscriptions into memory on demand.
