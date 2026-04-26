<script lang="ts">
  import { settings } from "$lib/stores/settings.svelte";
  import { MODELS, type ModelKey } from "$lib/claude";

  let draftKey = $state(settings.apiKey);
  let draftModel = $state<ModelKey>(settings.model);
  let showKey = $state(false);

  function save() {
    if (!draftKey.trim()) return;
    settings.save(draftKey.trim(), draftModel);
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
  }

  .dialog {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 14px;
    padding: 28px;
    width: 440px;
    max-width: calc(100vw - 40px);
    box-shadow: 0 24px 64px rgba(0, 0, 0, 0.6);
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

  input:focus {
    border-color: var(--accent);
  }

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
  }

  .show-btn:hover {
    color: var(--text);
  }

  .field-hint {
    margin-top: 6px;
    font-size: 11px;
    color: var(--text-dim);
    line-height: 1.5;
  }

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

  .model-name {
    font-size: 13px;
    font-weight: 600;
    display: block;
  }

  .model-desc {
    font-size: 11px;
    display: block;
  }

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

  .btn-cancel:hover {
    color: var(--text);
    border-color: var(--border-hover);
  }

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

  .btn-save:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .btn-save:not(:disabled):hover {
    opacity: 0.9;
  }
</style>
