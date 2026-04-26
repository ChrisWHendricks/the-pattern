# Ghostwheel — Application Reference

## What It Is

Ghostwheel is a local-first macOS **personal knowledge management (second brain) app** with an integrated AI assistant named **Oberon**. It is a desktop application that lets the user capture notes, journal daily, search across their markdown vault, and chat with an AI that has full context of their personal notes. All data stays on-device by default; cloud LLM providers are opt-in.

The app is a **proof-of-concept / personal tool**, not a commercial product.

---

## Architecture: Three Cooperating Processes

```
┌─────────────────────────────────────────────────────────┐
│                     macOS Desktop                       │
│                                                         │
│  ┌──────────────┐    IPC (invoke)    ┌───────────────┐  │
│  │  Tauri Rust  │◄──────────────────►│  SvelteKit    │  │
│  │    Shell     │                    │  WebView UI   │  │
│  │              │                    │               │  │
│  │ • Window mgmt│    HTTP on :8787   │ • Three-pane  │  │
│  │ • ⌘⇧N hotkey│◄──────────────────►│   editor UI   │  │
│  │ • FS watcher │                    │ • Chat panel  │  │
│  │ • Keychain   │                    │ • Voice I/O   │  │
│  └──────────────┘                    └───────────────┘  │
│         │                                    │          │
│         │ spawns                             │ HTTP      │
│         ▼                                    ▼          │
│  ┌──────────────────────────────────────────────────┐   │
│  │           Python FastAPI Sidecar (:8787)         │   │
│  │                                                  │   │
│  │  Ingest → Embed → Index → Retrieve → RAG chat   │   │
│  │  Voice STT/TTS, Trump cards, Shadows, Journal   │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

### 1. Tauri Rust Shell (`app-tauri/src-tauri/`)

The native macOS wrapper. Key responsibilities:

- Spawns the Python sidecar binary at startup; health-checks it and shuts it down on exit
- Registers the global `⌘⇧N` shortcut for quick-capture (opens a floating note window from anywhere on the desktop)
- Runs a filesystem watcher on the vault directory; forwards change events to the sidecar so indexes stay fresh
- Bridges macOS Keychain for API key storage (API keys are never stored in plain files)
- Exposes Tauri IPC commands (`invoke()`) callable from the UI for OS-level operations

Key files: `lib.rs`, `sidecar.rs`, `watcher.rs`, `commands.rs`, `hotkey.rs`, `settings.rs`, `pty.rs`

### 2. SvelteKit Frontend (`app-tauri/src/`)

A Svelte 5 (runes-based) WebView UI served by Vite. Layout is a resizable three-pane shell:

- **Left pane** — `NavTree.svelte`: hierarchical document browser, shows notes/journal/trumps/PDFs
- **Center pane** — editor + chat tabs. Editor is CodeMirror 6 markdown with a WYSIWYG mode via Milkdown/Crepe. Chat is a streaming SSE panel.
- **Right pane** — `Sidekick.svelte`: contextual AI panel, backlinks, entity info

Additional UI surfaces:
- `VoiceCaptureOverlay.svelte` — floating mic button for quick voice capture
- `LiveVoicePanel.svelte` — continuous conversational voice mode with Oberon
- `TrumpCard.svelte` / `TrumpCardView.svelte` — entity summary cards
- `TrumpDeck.svelte` — card deck browser for all Trump cards
- `ShadowDashboard.svelte` / `ShadowCard.svelte` — virtual collection manager
- `SettingsDialog.svelte` — LLM provider, API key, voice settings
- `Terminal.svelte` — embedded terminal (PTY via Tauri)
- `TeleportOverlay.svelte` — quick-jump / command palette

State is managed via Svelte 5 rune-based stores in `lib/stores/`: `app`, `workspace`, `chat`, `settings`, `voice`, `live-voice`.

Key files: `routes/+layout.svelte`, `routes/+page.svelte`, all `lib/components/*.svelte`

### 3. Python FastAPI Sidecar (`sidecar-py/`)

The heavyweight AI/indexing service. Runs at `http://127.0.0.1:8787`. The UI talks to it directly over HTTP. All AI features, search, and data management live here.

---

## Data Layout

### Source of Truth (vault)
```
~/Library/CloudStorage/GoogleDrive-*/My Drive/Ghostwheel/
├── notes/          # Freeform markdown notes
├── journal/        # Daily YYYY-MM-DD.md files
├── trumps/         # Structured entity pages
│   ├── people/
│   ├── projects/
│   ├── places/
│   └── topics/
└── pdfs/           # PDF documents
```

The vault is synced via Google Drive. It is user-editable plain markdown; Ghostwheel never locks you in.

### Index (local, regenerable)
```
~/Library/Application Support/Ghostwheel/
├── index.db           # SQLite: documents, chunks, FTS5, shadows, backlinks
├── vectors.lance/     # LanceDB vector store
├── conversations.db   # Conversation history
└── piper_voices/      # Downloaded TTS voice models
└── kokoro/            # Kokoro ONNX TTS model files
```

The index is fully regenerable from the vault. It is never committed to git.

---

## Sidecar Module Map

| Package | Purpose |
|---------|---------|
| `api/` | FastAPI routers — all HTTP endpoints |
| `ingest/` | Markdown + PDF parsers, text chunker, pipeline orchestrator |
| `embed/` | Embedding client abstraction (Ollama, deterministic/test) |
| `index/` | LanceDB vector store (`lance.py`) + SQLite store (`sqlite.py`) + conversation store |
| `retrieve/` | Hybrid BM25+vector search with Reciprocal Rank Fusion |
| `chat/` | RAG orchestrator, system prompt builder, citation tracking |
| `llm/` | LLM client abstraction (Ollama, Anthropic, OpenAI, echo/test) |
| `entities/` | NER and Trump card entity extractor |
| `graph/` | Wiki-link graph, backlink resolution, Trump card file manager |
| `voice/` | STT (faster-whisper), TTS (Piper/Kokoro/OpenAI/macOS `say`), intent classifier, action router |
| `tools/` | Anthropic tool-use definitions: web search (Tavily) |
| `atlassian/` | Jira + Confluence API client and Anthropic tool definitions |
| `engine.py` | Singleton that wires all components. Acquire `threading.Lock` before init. |
| `config.py` | pydantic-settings config; env prefix `GHOSTWHEEL_`; hot-patchable via `PATCH /settings` |

---

## Key Features

### Hybrid Search
Combines BM25 full-text search (SQLite FTS5) with vector similarity search (LanceDB + Ollama `nomic-embed-text` embeddings), merged via **Reciprocal Rank Fusion** (RRF). Returns ranked `SearchHit` objects with chunk text, doc metadata, and individual BM25/vector ranks.

### RAG Chat (Oberon)
The AI assistant is named Oberon. Chat flow:
1. Query → hybrid retrieval (top-k chunks from vault)
2. Chunks injected into system prompt as numbered citations
3. LLM streams response via SSE (`/chat` endpoint)
4. Citations surfaced in the UI alongside the response
5. Full conversation persisted to `conversations.db`

Supports tool use when using Anthropic backend: web search (Tavily) and Atlassian (Jira/Confluence) queries are available as Claude tools during chat.

### Voice I/O
- **STT**: `faster-whisper` (local, configurable model size, e.g. `base.en`)
- **TTS providers**: Piper (local ONNX, multiple voices), Kokoro (local ONNX, high quality), OpenAI TTS (cloud), macOS `say` (system)
- **Quick capture** (`/voice/capture`): Transcribe → classify intent → route to action
  - Intent kinds: `task` (append checkbox to today's journal), `note` (append bullet to journal), `search` (run retrieval), `chat` (single-turn RAG with Oberon)
- **Live voice mode**: Continuous back-and-forth conversation with Oberon, with persistent conversation history
- **Morning briefing** (`/voice/briefing`): Summarizes open tasks from yesterday, today's MITs, and recent conversation activity

### Trump Cards
Structured entity pages for people, projects, places, and topics. They live in `vault/trumps/<kind>/<slug>.md` with YAML frontmatter. The `@[Name]` mention syntax in notes links to them. During ingestion, the pipeline:
- Parses wiki-links and `@[mentions]`
- Auto-creates stub Trump card files if they don't exist
- Maintains a `<!-- ghostwheel:backlinks -->` block in each Trump card with all files that mention it

Trump card schema (frontmatter): `type`, `aliases`, `groups`, `tags`, `email`, `phone`, `created`

### Shadows (Virtual Collections)
Named sets of notes independent of filesystem layout. A note can belong to multiple Shadows. Kinds: `project`, `topic`, `research`, `thought`. Support cover images, colors, descriptions, and "realms" (grouping). Ordered and reorderable.

### Daily Journal
Auto-created daily files at `vault/journal/YYYY-MM-DD.md` from a template with sections: `## Today's Focus` (MITs), `## Log`, `## Brain Dump`. Voice capture appends tasks and notes to the Log section atomically.

### Ingest Pipeline
Idempotent per-file: content hash check prevents redundant re-ingestion. On change: SQLite chunk rows and LanceDB vectors are atomically replaced, wiki-link edges are refreshed, Trump backlink blocks are rewritten. Supports `.md`, `.markdown`, `.pdf`. The filesystem watcher in Tauri triggers incremental re-ingestion on file changes.

### Atlassian Integration
When `GHOSTWHEEL_ATLASSIAN_EMAIL` and `GHOSTWHEEL_ATLASSIAN_API_TOKEN` are set, Oberon can use Anthropic tool calls to:
- Fetch Jira issues by key
- Search Jira with JQL
- Search Confluence pages
- Fetch full Confluence page content
- Return URLs for the frontend to open in the browser

---

## LLM / Embedding Backends

Controlled by `GHOSTWHEEL_CHAT_BACKEND` (default: `ollama`):

| Provider | Chat model | Embedding | Notes |
|----------|-----------|-----------|-------|
| `ollama` | `llama3.1:8b` | `nomic-embed-text` | Fully local, default |
| `anthropic` | Claude (configurable) | — | Cloud; key in Keychain; enables tool use |
| `openai` | GPT (configurable) | — | Cloud alternative |
| `echo` | — | — | Test/dev stub |

Settings hot-update via `PATCH /settings` — no sidecar restart needed.

---

## API Endpoints (Sidecar)

| Route | Purpose |
|-------|---------|
| `GET /health` | Liveness check |
| `POST /chat` | Streaming RAG chat (SSE) |
| `GET /conversations` | List conversation history |
| `GET /documents` | List/search indexed documents |
| `GET /files` | Raw file access |
| `POST /ingest` | Trigger ingest of vault or specific file |
| `GET /search` | Hybrid search |
| `GET /journal` | Journal file access |
| `GET /settings` | Read config |
| `PATCH /settings` | Hot-update config |
| `GET /shadows` | List virtual collections |
| `POST /shadows` | Create shadow |
| `PATCH /shadows/{id}` | Update shadow |
| `DELETE /shadows/{id}` | Delete shadow |
| `POST /shadows/{id}/members` | Add note to shadow |
| `GET /stats` | Index statistics |
| `GET /trumps` | List Trump cards |
| `GET /voice/voices` | List available TTS voices |
| `POST /voice/transcribe` | STT — audio → text |
| `POST /voice/speak` | TTS — text → WAV |
| `POST /voice/capture` | Full voice pipeline (STT → intent → action) |
| `GET /voice/briefing` | Morning briefing text or audio |

---

## Package Managers

| Layer | Tool | Commands |
|-------|------|---------|
| Python sidecar | **uv** | `uv sync`, `uv run python main.py`, `uv run pytest` |
| Frontend | **pnpm** | `pnpm install`, `pnpm dev`, `pnpm check` |
| Rust shell | **cargo** | (via `pnpm tauri dev` / `pnpm tauri build`) |

---

## Configuration

All sidecar config is via pydantic-settings with `GHOSTWHEEL_` prefix or a `.env` file. Key settings:

| Variable | Default | Purpose |
|----------|---------|---------|
| `GHOSTWHEEL_VAULT_ROOT_OVERRIDE` | `""` | Override vault location |
| `GHOSTWHEEL_OLLAMA_HOST` | `http://127.0.0.1:11434` | Ollama endpoint |
| `GHOSTWHEEL_CHAT_MODEL_LOCAL` | `llama3.1:8b` | Local chat model |
| `GHOSTWHEEL_EMBED_MODEL_LOCAL` | `nomic-embed-text` | Embedding model |
| `GHOSTWHEEL_CLOUD_LLM_ENABLED` | `false` | Enable cloud LLM |
| `GHOSTWHEEL_TTS_PROVIDER` | `piper` | TTS engine (piper/kokoro/openai/system) |
| `GHOSTWHEEL_WHISPER_MODEL` | `base.en` | STT model size |
| `GHOSTWHEEL_TAVILY_API_KEY` | `""` | Web search key |
| `GHOSTWHEEL_ATLASSIAN_EMAIL` | `""` | Jira/Confluence login |
| `GHOSTWHEEL_ATLASSIAN_API_TOKEN` | `""` | Jira/Confluence token |

---

## Development Workflow

```bash
# Start everything (sidecar + Tauri dev window)
./scripts/dev.sh

# Sidecar only
cd sidecar-py && uv run python main.py

# Frontend only (Vite on :1420)
cd app-tauri && pnpm dev

# Tests
cd sidecar-py && uv run pytest

# Lint
cd sidecar-py && uv run ruff check .

# Production .dmg
./scripts/package.sh
```
