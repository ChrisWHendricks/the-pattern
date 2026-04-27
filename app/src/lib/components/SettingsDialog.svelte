<script lang="ts">
  import { onMount } from "svelte";
  import { settings, type TtsProvider } from "$lib/stores/settings.svelte";
  import { MODELS, type ModelKey } from "$lib/claude";
  import { homeDir } from "@tauri-apps/api/path";
  import { invoke } from "@tauri-apps/api/core";

  type Tab = "oberon" | "vault" | "voice";

  let tab = $state<Tab>("oberon");

  let draftKey = $state(settings.apiKey);
  let draftModel = $state<ModelKey>(settings.model);
  let draftVaultPath = $state(settings.vaultPath);
  let draftAutosave = $state(settings.autosave);
  let draftTts = $state(settings.ttsEnabled);
  let draftTtsProvider = $state<TtsProvider>(settings.ttsProvider);
  let draftElevenLabsKey = $state(settings.elevenLabsKey);
  let draftElevenLabsVoiceId = $state(settings.elevenLabsVoiceId);
  let draftOpenaiKey = $state(settings.openaiKey);
  let draftOpenaiVoice = $state(settings.openaiVoice);
  let draftSystemVoiceName = $state(settings.systemVoiceName);
  let draftDevMode = $state(settings.devMode);
  let systemVoiceNames = $state<string[]>([]);
  let showKey = $state(false);
  let showElKey = $state(false);
  let showOaiKey = $state(false);

  const OPENAI_VOICES = ["alloy", "echo", "fable", "onyx", "nova", "shimmer"] as const;

  const TABS: { id: Tab; icon: string; label: string }[] = [
    { id: "oberon", icon: "⬡", label: "Oberon" },
    { id: "vault",  icon: "◫", label: "Vault" },
    { id: "voice",  icon: "◎", label: "Voice" },
  ];

  onMount(() => {
    if (!draftVaultPath) {
      homeDir().then((home) => {
        draftVaultPath = `${home}Documents/ThePattern/notes`;
      });
    }
    if (!settings.hasApiKey) tab = "oberon";
    // Use the Tauri command which queries NSSpeechSynthesizer directly,
    // returning all installed voices including Premium ones.
    invoke<string[]>("list_system_voices")
      .then((names) => { systemVoiceNames = names; })
      .catch(() => {
        // Fallback to Web Speech API (won't include Premium voices)
        const all = window.speechSynthesis?.getVoices() ?? [];
        systemVoiceNames = all.filter((v) => v.lang.startsWith("en")).map((v) => v.name);
      });
  });

  function save() {
    if (!draftKey.trim()) return;
    settings.save(
      draftKey.trim(),
      draftModel,
      draftVaultPath.trim(),
      draftAutosave,
      draftTts,
      draftTtsProvider,
      draftElevenLabsKey.trim(),
      draftElevenLabsVoiceId.trim(),
      draftOpenaiKey.trim(),
      draftOpenaiVoice,
      draftSystemVoiceName,
      draftDevMode,
    );
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === "Escape") settings.closeSettings();
  }
</script>

<svelte:window onkeydown={handleKeydown} />

<div
  class="overlay"
  role="presentation"
  onclick={() => settings.hasApiKey && settings.closeSettings()}
>
  <div
    class="dialog"
    role="dialog"
    aria-modal="true"
    aria-label="Settings"
    tabindex="-1"
    onclick={(e) => e.stopPropagation()}
    onkeydown={(e) => e.stopPropagation()}
  >
    <!-- ── Sidebar ──────────────────────────────────────────── -->
    <aside class="sidebar">
      <div class="sidebar-header">
        <span class="sidebar-mark">⬡</span>
        <span class="sidebar-title">Settings</span>
      </div>
      <nav class="sidebar-nav">
        {#each TABS as t}
          <button
            class="nav-item"
            class:active={tab === t.id}
            onclick={() => (tab = t.id)}
          >
            <span class="nav-icon">{t.icon}</span>
            {t.label}
          </button>
        {/each}
      </nav>
    </aside>

    <!-- ── Content ─────────────────────────────────────────── -->
    <div class="content">
      {#if tab === "oberon"}
        <h2 class="section-title">Oberon</h2>

        <div class="setting-block">
          <label class="block-label" for="api-key">Anthropic API Key</label>
          <p class="block-desc">Required to connect Oberon. Get yours at console.anthropic.com.</p>
          <div class="key-wrap">
            <input
              id="api-key"
              type={showKey ? "text" : "password"}
              placeholder="sk-ant-..."
              bind:value={draftKey}
              autocomplete="off"
              spellcheck={false}
            />
            <button class="show-btn" onclick={() => (showKey = !showKey)}>
              {showKey ? "Hide" : "Show"}
            </button>
          </div>
        </div>

        <div class="divider"></div>

        <div class="setting-block">
          <p class="block-label">Default Model</p>
          <p class="block-desc">Haiku is fast and affordable for everyday queries. Switch to Sonnet for complex tasks anytime.</p>
          <div class="model-toggle">
            {#each Object.entries(MODELS) as [key, _]}
              <button
                class="model-btn"
                class:selected={draftModel === key}
                onclick={() => (draftModel = key as ModelKey)}
              >
                <span class="model-name">{key === "haiku" ? "Haiku" : "Sonnet"}</span>
                <span class="model-sub">{key === "haiku" ? "Fast · Everyday" : "Powerful · Deep thinking"}</span>
              </button>
            {/each}
          </div>
        </div>

      {:else if tab === "vault"}
        <h2 class="section-title">Vault</h2>

        <div class="setting-block">
          <label class="block-label" for="vault-path">Notes Vault Path</label>
          <p class="block-desc">Folder where your markdown inscriptions are stored. Point this at a Google Drive or iCloud folder to sync across devices.</p>
          <textarea
            id="vault-path"
            class="path-input"
            placeholder="/Users/you/Documents/ThePattern/notes"
            bind:value={draftVaultPath}
            spellcheck={false}
            rows={2}
          ></textarea>
        </div>

        <div class="divider"></div>

        <div class="setting-row">
          <div class="setting-info">
            <p class="setting-name">Autosave</p>
            <p class="setting-desc">Automatically save after 1.5 s of inactivity. Turn off to save manually with ⌘S.</p>
          </div>
          <button
            class="toggle-btn"
            class:on={draftAutosave}
            onclick={() => (draftAutosave = !draftAutosave)}
            role="switch"
            aria-checked={draftAutosave}
            aria-label="Toggle autosave"
          >
            <span class="toggle-thumb"></span>
          </button>
        </div>

        <div class="divider"></div>

        <div class="setting-row">
          <div class="setting-info">
            <p class="setting-name">Developer Mode</p>
            <p class="setting-desc">Shows the defects and feature backlog in the sidebar. For building and debugging the app.</p>
          </div>
          <button
            class="toggle-btn"
            class:on={draftDevMode}
            onclick={() => (draftDevMode = !draftDevMode)}
            role="switch"
            aria-checked={draftDevMode}
            aria-label="Toggle developer mode"
          >
            <span class="toggle-thumb"></span>
          </button>
        </div>

      {:else if tab === "voice"}
        <h2 class="section-title">Voice</h2>

        <div class="setting-row">
          <div class="setting-info">
            <p class="setting-name">Read responses aloud</p>
            <p class="setting-desc">Oberon speaks each response after it finishes streaming.</p>
          </div>
          <button
            class="toggle-btn"
            class:on={draftTts}
            onclick={() => (draftTts = !draftTts)}
            role="switch"
            aria-checked={draftTts}
            aria-label="Toggle text-to-speech"
          >
            <span class="toggle-thumb"></span>
          </button>
        </div>

        {#if draftTts}
          <div class="divider"></div>

          <div class="setting-block">
            <p class="block-label">Provider</p>
            <p class="block-desc">Choose your TTS engine. ElevenLabs sounds the most natural.</p>
            <div class="provider-toggle">
              <button
                class="provider-btn"
                class:selected={draftTtsProvider === "system"}
                onclick={() => (draftTtsProvider = "system")}
              >
                <span class="provider-name">macOS System</span>
                <span class="provider-sub">Free · Built-in</span>
              </button>
              <button
                class="provider-btn"
                class:selected={draftTtsProvider === "elevenlabs"}
                onclick={() => (draftTtsProvider = "elevenlabs")}
              >
                <span class="provider-name">ElevenLabs</span>
                <span class="provider-sub">Best quality · 10k/mo free</span>
              </button>
              <button
                class="provider-btn"
                class:selected={draftTtsProvider === "openai"}
                onclick={() => (draftTtsProvider = "openai")}
              >
                <span class="provider-name">OpenAI</span>
                <span class="provider-sub">Very good · Pay-per-use</span>
              </button>
            </div>
          </div>

          {#if draftTtsProvider === "system"}
            <div class="divider"></div>
            <div class="setting-block">
              <label class="block-label" for="system-voice">Voice Name</label>
              <p class="block-desc">
                Type a voice name — e.g. <strong>Ava</strong>, <strong>Evan</strong>, <strong>Samantha</strong>.
                Leave blank to auto-pick the best available.
                Premium voices may not appear in the suggestion list below but still work if typed correctly.
              </p>
              <input
                id="system-voice"
                type="text"
                list="voice-datalist"
                placeholder="Ava"
                bind:value={draftSystemVoiceName}
                spellcheck={false}
              />
              <datalist id="voice-datalist">
                {#each systemVoiceNames as name}
                  <option value={name}></option>
                {/each}
              </datalist>
            </div>

          {:else if draftTtsProvider === "elevenlabs"}
            <div class="divider"></div>
            <div class="setting-block">
              <label class="block-label" for="el-key">ElevenLabs API Key</label>
              <p class="block-desc">Get your key at elevenlabs.io — free tier includes 10,000 chars/month.</p>
              <div class="key-wrap">
                <input
                  id="el-key"
                  type={showElKey ? "text" : "password"}
                  placeholder="..."
                  bind:value={draftElevenLabsKey}
                  autocomplete="off"
                  spellcheck={false}
                />
                <button class="show-btn" onclick={() => (showElKey = !showElKey)}>
                  {showElKey ? "Hide" : "Show"}
                </button>
              </div>
            </div>
            <div class="setting-block">
              <label class="block-label" for="el-voice">Voice ID</label>
              <p class="block-desc">Default: Rachel — natural female. Find IDs at elevenlabs.io/voice-library.</p>
              <input
                id="el-voice"
                type="text"
                placeholder="21m00Tcm4TlvDq8ikWAM"
                bind:value={draftElevenLabsVoiceId}
                spellcheck={false}
              />
            </div>

          {:else if draftTtsProvider === "openai"}
            <div class="divider"></div>
            <div class="setting-block">
              <label class="block-label" for="oai-key">OpenAI API Key</label>
              <p class="block-desc">~$0.015 per 1,000 characters using the tts-1 model.</p>
              <div class="key-wrap">
                <input
                  id="oai-key"
                  type={showOaiKey ? "text" : "password"}
                  placeholder="sk-..."
                  bind:value={draftOpenaiKey}
                  autocomplete="off"
                  spellcheck={false}
                />
                <button class="show-btn" onclick={() => (showOaiKey = !showOaiKey)}>
                  {showOaiKey ? "Hide" : "Show"}
                </button>
              </div>
            </div>
            <div class="setting-block">
              <p class="block-label">Voice</p>
              <p class="block-desc">Nova and Shimmer are popular choices.</p>
              <div class="voice-grid">
                {#each OPENAI_VOICES as v}
                  <button
                    class="voice-btn"
                    class:selected={draftOpenaiVoice === v}
                    onclick={() => (draftOpenaiVoice = v)}
                  >
                    {v}
                  </button>
                {/each}
              </div>
            </div>
          {/if}
        {/if}
      {/if}
    </div>

    <!-- ── Footer ──────────────────────────────────────────── -->
    <div class="footer">
      {#if settings.hasApiKey}
        <button class="btn-cancel" onclick={() => settings.closeSettings()}>Cancel</button>
      {/if}
      <button class="btn-save" disabled={!draftKey.trim()} onclick={save}>
        {settings.hasApiKey ? "Save changes" : "Connect Oberon"}
      </button>
    </div>

    {#if settings.hasApiKey}
      <button class="close-btn" onclick={() => settings.closeSettings()} aria-label="Close settings">✕</button>
    {/if}
  </div>
</div>

<style>
  .overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.75);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 100;
    backdrop-filter: blur(4px);
    padding: 20px;
  }

  .dialog {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 14px;
    width: 680px;
    max-width: calc(100vw - 40px);
    max-height: calc(100vh - 40px);
    box-shadow: 0 24px 64px rgba(0, 0, 0, 0.65);
    display: grid;
    grid-template-columns: 180px 1fr;
    grid-template-rows: 1fr auto;
    overflow: hidden;
    position: relative;
  }

  /* ── Sidebar ──────────────────────────────────────────────── */
  .sidebar {
    grid-row: 1 / 3;
    background: color-mix(in srgb, var(--bg) 60%, var(--surface));
    border-right: 1px solid var(--border);
    display: flex;
    flex-direction: column;
    padding: 20px 0 20px;
  }

  .sidebar-header {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 0 16px 20px;
    border-bottom: 1px solid var(--border);
    margin-bottom: 8px;
  }

  .sidebar-mark { font-size: 20px; color: var(--accent); }

  .sidebar-title {
    font-size: 13px;
    font-weight: 600;
    color: var(--text-muted);
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }

  .sidebar-nav {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 0 8px;
  }

  .nav-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 10px;
    border: none;
    background: transparent;
    color: var(--text-muted);
    font-size: 13px;
    font-weight: 500;
    border-radius: 6px;
    cursor: pointer;
    text-align: left;
    transition: background 0.1s, color 0.1s;
  }

  .nav-item:hover { background: var(--surface-hover); color: var(--text); }

  .nav-item.active {
    background: color-mix(in srgb, var(--accent) 15%, transparent);
    color: var(--text);
  }

  .nav-icon { font-size: 14px; width: 18px; text-align: center; opacity: 0.7; }
  .nav-item.active .nav-icon { opacity: 1; }

  /* ── Content ──────────────────────────────────────────────── */
  .content {
    padding: 28px 28px 12px;
    overflow-y: auto;
    min-height: 0;
  }

  .section-title {
    margin: 0 0 24px;
    font-size: 18px;
    font-weight: 600;
    color: var(--text);
  }

  .divider {
    height: 1px;
    background: var(--border);
    margin: 20px 0;
  }

  /* Setting block — label + desc above, full-width control below */
  .setting-block { margin-bottom: 4px; }

  .block-label {
    display: block;
    font-size: 12px;
    font-weight: 600;
    color: var(--text-muted);
    letter-spacing: 0.04em;
    text-transform: uppercase;
    margin-bottom: 4px;
  }

  .block-desc {
    font-size: 12px;
    color: var(--text-dim);
    line-height: 1.5;
    margin: 0 0 10px;
  }

  /* Setting row — name/desc on left, control on right */
  .setting-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 24px;
    padding: 4px 0;
  }

  .setting-info { flex: 1; }

  .setting-name {
    font-size: 14px;
    font-weight: 500;
    color: var(--text);
    margin: 0 0 3px;
  }

  .setting-desc {
    font-size: 12px;
    color: var(--text-dim);
    margin: 0;
    line-height: 1.4;
  }

  /* ── Inputs ───────────────────────────────────────────────── */
  .key-wrap { display: flex; gap: 8px; }

  input {
    flex: 1;
    width: 100%;
    box-sizing: border-box;
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 9px 12px;
    color: var(--text);
    font-size: 13px;
    font-family: var(--font-mono);
    outline: none;
    transition: border-color 0.15s;
  }

  input:focus { border-color: var(--accent); }

  .show-btn {
    padding: 0 12px;
    background: var(--surface-hover);
    border: 1px solid var(--border);
    border-radius: 8px;
    color: var(--text-muted);
    font-size: 12px;
    cursor: pointer;
    white-space: nowrap;
    transition: color 0.15s;
    flex-shrink: 0;
  }

  .show-btn:hover { color: var(--text); }

  .path-input {
    width: 100%;
    box-sizing: border-box;
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 9px 12px;
    color: var(--text);
    font-size: 12px;
    font-family: var(--font-mono);
    line-height: 1.5;
    resize: none;
    outline: none;
    transition: border-color 0.15s;
    word-break: break-all;
  }

  .path-input:focus { border-color: var(--accent); }

  /* ── Toggle ───────────────────────────────────────────────── */
  .toggle-btn {
    width: 36px;
    height: 20px;
    border-radius: 10px;
    border: none;
    background: var(--border);
    cursor: pointer;
    padding: 2px;
    flex-shrink: 0;
    transition: background 0.2s;
    display: flex;
    align-items: center;
  }

  .toggle-btn.on { background: var(--accent); }

  .toggle-thumb {
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: #fff;
    transition: transform 0.2s;
    display: block;
  }

  .toggle-btn.on .toggle-thumb { transform: translateX(16px); }

  /* ── Model toggle ─────────────────────────────────────────── */
  .model-toggle { display: flex; gap: 8px; }

  .model-btn {
    flex: 1;
    padding: 10px 12px;
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: 8px;
    color: var(--text-muted);
    text-align: left;
    cursor: pointer;
    transition: border-color 0.15s, color 0.15s;
    display: flex;
    flex-direction: column;
    gap: 3px;
  }

  .model-btn.selected {
    border-color: var(--accent);
    color: var(--text);
    background: color-mix(in srgb, var(--accent) 8%, var(--bg));
  }

  .model-btn:not(.selected):hover { border-color: var(--border-hover); color: var(--text); }

  .model-name { font-size: 13px; font-weight: 600; display: block; }
  .model-sub  { font-size: 11px; display: block; }

  /* ── Provider toggle ──────────────────────────────────────── */
  .provider-toggle { display: flex; gap: 6px; }

  .provider-btn {
    flex: 1;
    padding: 9px 10px;
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: 8px;
    color: var(--text-muted);
    text-align: left;
    cursor: pointer;
    transition: border-color 0.15s, color 0.15s;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .provider-btn.selected {
    border-color: var(--accent);
    color: var(--text);
    background: color-mix(in srgb, var(--accent) 8%, var(--bg));
  }

  .provider-btn:not(.selected):hover { border-color: var(--border-hover); color: var(--text); }

  .provider-name { font-size: 12px; font-weight: 600; display: block; }
  .provider-sub  { font-size: 10px; display: block; }

  /* ── Info box ─────────────────────────────────────────────── */
  .info-box {
    margin-top: 16px;
    padding: 12px 14px;
    background: color-mix(in srgb, var(--accent) 6%, var(--bg));
    border: 1px solid color-mix(in srgb, var(--accent) 20%, transparent);
    border-radius: 8px;
    font-size: 12px;
    color: var(--text-dim);
    line-height: 1.6;
  }

  /* ── OpenAI voice grid ────────────────────────────────────── */
  .voice-grid { display: flex; flex-wrap: wrap; gap: 6px; }

  .voice-btn {
    padding: 5px 14px;
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: 6px;
    color: var(--text-muted);
    font-size: 12px;
    cursor: pointer;
    transition: border-color 0.15s, color 0.15s;
    text-transform: capitalize;
  }

  .voice-btn.selected {
    border-color: var(--accent);
    color: var(--text);
    background: color-mix(in srgb, var(--accent) 8%, var(--bg));
  }

  .voice-btn:not(.selected):hover { border-color: var(--border-hover); color: var(--text); }

  /* ── Footer ───────────────────────────────────────────────── */
  .footer {
    grid-column: 2;
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    padding: 16px 28px 20px;
    border-top: 1px solid var(--border);
  }

  .btn-cancel {
    padding: 8px 16px;
    background: transparent;
    border: 1px solid var(--border);
    border-radius: 8px;
    color: var(--text-muted);
    font-size: 13px;
    cursor: pointer;
    transition: color 0.15s, border-color 0.15s;
  }

  .btn-cancel:hover { color: var(--text); border-color: var(--border-hover); }

  .btn-save {
    padding: 8px 20px;
    background: var(--accent);
    border: none;
    border-radius: 8px;
    color: #000;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    transition: opacity 0.15s;
  }

  .btn-save:disabled { opacity: 0.4; cursor: not-allowed; }
  .btn-save:not(:disabled):hover { opacity: 0.9; }

  /* ── Close button ─────────────────────────────────────────── */
  .close-btn {
    position: absolute;
    top: 14px;
    right: 14px;
    width: 28px;
    height: 28px;
    border: none;
    background: transparent;
    color: var(--text-dim);
    font-size: 14px;
    cursor: pointer;
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 0.15s, color 0.15s;
  }

  .close-btn:hover { background: var(--surface-hover); color: var(--text); }
</style>
