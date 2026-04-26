<script lang="ts">
  import { onMount } from "svelte";
  import { settings, type TtsProvider } from "$lib/stores/settings.svelte";
  import { MODELS, type ModelKey } from "$lib/claude";
  import { homeDir } from "@tauri-apps/api/path";

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
  let showKey = $state(false);

  const OPENAI_VOICES = ["alloy", "echo", "fable", "onyx", "nova", "shimmer"] as const;

  onMount(() => {
    if (!draftVaultPath) {
      homeDir().then((home) => {
        draftVaultPath = `${home}Documents/ThePattern/notes`;
      });
    }
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
    );
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === "Escape") settings.closeSettings();
    if (e.key === "Enter" && draftKey.trim()) save();
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
    aria-label="Configure Oberon"
    tabindex="-1"
    onclick={(e) => e.stopPropagation()}
    onkeydown={(e) => e.stopPropagation()}
  >
    <div class="dialog-header">
      <div class="dialog-mark">⬡</div>
      <div>
        <h2>Configure Oberon</h2>
        <p>Connect your Anthropic API key to start.</p>
      </div>
    </div>

    <div class="field">
      <label for="api-key">Anthropic API Key</label>
      <div class="input-wrap">
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
      <div class="field-hint">
        Get yours at console.anthropic.com — Haiku tier is very affordable for daily use.
      </div>
    </div>

    <div class="field">
      <p class="field-label">Default Model</p>
      <div class="model-toggle">
        {#each Object.entries(MODELS) as [key, _]}
          <button
            class="model-btn"
            class:selected={draftModel === key}
            onclick={() => (draftModel = key as ModelKey)}
          >
            <span class="model-name">{key === "haiku" ? "Haiku" : "Sonnet"}</span>
            <span class="model-desc">
              {key === "haiku" ? "Fast · Everyday queries" : "Powerful · Deep thinking"}
            </span>
          </button>
        {/each}
      </div>
      <div class="field-hint">Haiku is recommended — Sonnet is available for complex tasks anytime.</div>
    </div>

    <div class="field">
      <label for="vault-path">Notes Vault Path</label>
      <textarea
        id="vault-path"
        class="path-input"
        placeholder="/Users/you/Documents/ThePattern/notes"
        bind:value={draftVaultPath}
        spellcheck={false}
        rows={2}
      ></textarea>
      <div class="field-hint">
        Folder where your markdown notes are stored. Use your Google Drive path to sync across devices.
      </div>
    </div>

    <div class="field toggle-field">
      <div class="toggle-row">
        <div>
          <p class="field-label">Autosave notes</p>
          <div class="field-hint">Save automatically after 1.5 s of inactivity. Turn off to save manually with ⌘S.</div>
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
    </div>

    <!-- ── TTS ─────────────────────────────────────────────── -->
    <div class="field toggle-field">
      <div class="toggle-row">
        <div>
          <p class="field-label">Oberon reads responses aloud</p>
          <div class="field-hint">Auto-play TTS after each response.</div>
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
    </div>

    {#if draftTts}
      <div class="field">
        <p class="field-label">Voice Provider</p>
        <div class="provider-toggle">
          <button
            class="provider-btn"
            class:selected={draftTtsProvider === "system"}
            onclick={() => (draftTtsProvider = "system")}
          >
            <span class="provider-name">macOS System</span>
            <span class="provider-desc">Free · Built-in</span>
          </button>
          <button
            class="provider-btn"
            class:selected={draftTtsProvider === "elevenlabs"}
            onclick={() => (draftTtsProvider = "elevenlabs")}
          >
            <span class="provider-name">ElevenLabs</span>
            <span class="provider-desc">Best quality · 10k/mo free</span>
          </button>
          <button
            class="provider-btn"
            class:selected={draftTtsProvider === "openai"}
            onclick={() => (draftTtsProvider = "openai")}
          >
            <span class="provider-name">OpenAI</span>
            <span class="provider-desc">Very good · Pay-per-use</span>
          </button>
        </div>
      </div>

      {#if draftTtsProvider === "system"}
        <div class="field">
          <div class="field-hint provider-hint">
            For the best voice, download a Premium voice in <strong>System Settings → Accessibility → Spoken Content → System Voice → Manage Voices</strong>. Try <em>Ava (Premium)</em> or <em>Evan (Premium)</em> — they're free and sound natural.
          </div>
        </div>

      {:else if draftTtsProvider === "elevenlabs"}
        <div class="field">
          <label for="el-key">ElevenLabs API Key</label>
          <input
            id="el-key"
            type="password"
            placeholder="..."
            bind:value={draftElevenLabsKey}
            autocomplete="off"
            spellcheck={false}
          />
          <div class="field-hint">Get your key at elevenlabs.io — free tier: 10,000 chars/month.</div>
        </div>
        <div class="field">
          <label for="el-voice">Voice ID</label>
          <input
            id="el-voice"
            type="text"
            placeholder="21m00Tcm4TlvDq8ikWAM"
            bind:value={draftElevenLabsVoiceId}
            spellcheck={false}
          />
          <div class="field-hint">Default: Rachel (natural female). Browse voices at elevenlabs.io/voice-library.</div>
        </div>

      {:else if draftTtsProvider === "openai"}
        <div class="field">
          <label for="oai-key">OpenAI API Key</label>
          <input
            id="oai-key"
            type="password"
            placeholder="sk-..."
            bind:value={draftOpenaiKey}
            autocomplete="off"
            spellcheck={false}
          />
          <div class="field-hint">~$0.015 per 1,000 characters (tts-1 model).</div>
        </div>
        <div class="field">
          <p class="field-label">Voice</p>
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
          <div class="field-hint">Nova and Shimmer are popular choices.</div>
        </div>
      {/if}
    {/if}

    <div class="dialog-actions">
      {#if settings.hasApiKey}
        <button class="btn-cancel" onclick={() => settings.closeSettings()}>Cancel</button>
      {/if}
      <button class="btn-save" disabled={!draftKey.trim()} onclick={save}>
        {settings.hasApiKey ? "Save changes" : "Connect Oberon"}
      </button>
    </div>
  </div>
</div>

<style>
  .overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 100;
    backdrop-filter: blur(4px);
    overflow-y: auto;
    padding: 20px;
  }

  .dialog {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 14px;
    padding: 28px;
    width: 440px;
    max-width: calc(100vw - 40px);
    box-shadow: 0 24px 64px rgba(0, 0, 0, 0.6);
    margin: auto;
  }

  .dialog-header {
    display: flex;
    align-items: flex-start;
    gap: 14px;
    margin-bottom: 24px;
  }

  .dialog-mark {
    font-size: 28px;
    color: var(--accent);
    line-height: 1;
    margin-top: 2px;
  }

  h2 {
    margin: 0 0 4px;
    font-size: 16px;
    font-weight: 600;
    color: var(--text);
  }

  h2 + p {
    margin: 0;
    font-size: 13px;
    color: var(--text-muted);
  }

  .field {
    margin-bottom: 20px;
  }

  label, .field-label {
    display: block;
    font-size: 12px;
    font-weight: 600;
    color: var(--text-muted);
    margin-bottom: 6px;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }

  .input-wrap {
    display: flex;
    gap: 8px;
  }

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

  .field-hint {
    margin-top: 6px;
    font-size: 11px;
    color: var(--text-dim);
    line-height: 1.5;
  }

  .provider-hint {
    background: color-mix(in srgb, var(--accent) 6%, var(--bg));
    border: 1px solid color-mix(in srgb, var(--accent) 20%, transparent);
    border-radius: 8px;
    padding: 10px 12px;
    margin-top: 0;
  }

  .provider-hint strong { color: var(--text-muted); }
  .provider-hint em { color: var(--accent); font-style: normal; }

  /* ── Model toggle ───────────────────────────────────────── */
  .model-toggle {
    display: flex;
    gap: 8px;
  }

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

  .model-btn:not(.selected):hover {
    border-color: var(--border-hover);
    color: var(--text);
  }

  .model-name { font-size: 13px; font-weight: 600; display: block; }
  .model-desc { font-size: 11px; display: block; }

  /* ── Toggle switch ──────────────────────────────────────── */
  .toggle-field { margin-bottom: 20px; }

  .toggle-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
  }

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

  /* ── Provider toggle ────────────────────────────────────── */
  .provider-toggle {
    display: flex;
    gap: 6px;
  }

  .provider-btn {
    flex: 1;
    padding: 8px 10px;
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

  .provider-btn:not(.selected):hover {
    border-color: var(--border-hover);
    color: var(--text);
  }

  .provider-name { font-size: 12px; font-weight: 600; display: block; }
  .provider-desc { font-size: 10px; display: block; }

  /* ── OpenAI voice grid ──────────────────────────────────── */
  .voice-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }

  .voice-btn {
    padding: 5px 12px;
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

  .voice-btn:not(.selected):hover {
    border-color: var(--border-hover);
    color: var(--text);
  }

  /* ── Actions ────────────────────────────────────────────── */
  .dialog-actions {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    margin-top: 8px;
  }

  .btn-cancel {
    padding: 9px 16px;
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
    padding: 9px 20px;
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
</style>
