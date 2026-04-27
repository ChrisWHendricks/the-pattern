<script lang="ts">
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";
  import { logrusStore } from "$lib/stores/logrus.svelte";
  import { shadowsStore } from "$lib/stores/shadows.svelte";
  import { settings } from "$lib/stores/settings.svelte";
  import { logrusIcon, type LogrusItem } from "$lib/logrus";

  let selectedItem = $state<LogrusItem | null>(null);
  let textPreview = $state("");
  let claiming = $state(false);
  let claimTitle = $state("");
  let claimShadowId = $state("");
  let discardConfirm = $state(false);

  onMount(async () => {
    shadowsStore.load();
    await logrusStore.scan();
    if (logrusStore.items.length > 0) selectItem(logrusStore.items[0]);
  });

  async function selectItem(item: LogrusItem) {
    selectedItem = item;
    claiming = false;
    discardConfirm = false;
    textPreview = "";
    if (item.type === "inscription") {
      textPreview = await logrusStore.readTextPreview(item);
    }
  }

  function startClaim() {
    if (!selectedItem) return;
    claimTitle = selectedItem.name.replace(/[-_]/g, " ");
    claimShadowId = "";
    discardConfirm = false;
    claiming = true;
  }

  async function confirmClaim() {
    if (!selectedItem) return;
    let ok: boolean;
    if (selectedItem.type === "inscription") {
      ok = await logrusStore.claimAsInscription(
        selectedItem,
        claimTitle.trim() || selectedItem.name,
        claimShadowId || undefined
      );
    } else {
      ok = await logrusStore.claimAsArtifact(selectedItem, claimShadowId || undefined);
    }
    if (ok) {
      claiming = false;
      selectedItem = logrusStore.items[0] ?? null;
      if (selectedItem) await selectItem(selectedItem);
    }
  }

  async function confirmDiscard() {
    if (!selectedItem) return;
    const next = logrusStore.items.find((i) => i.path !== selectedItem!.path) ?? null;
    await logrusStore.discard(selectedItem);
    discardConfirm = false;
    selectedItem = next;
    if (selectedItem) await selectItem(selectedItem);
  }

  const selectedUrl = $derived(
    selectedItem?.type === "artifact" ? logrusStore.itemUrl(selectedItem) : null
  );
</script>

<div class="logrus-layout">
  <!-- Left: item list -->
  <div class="list-panel">
    <div class="panel-header">
      <div class="header-text">
        <span class="panel-title">The Logrus</span>
        {#if logrusStore.items.length > 0}
          <span class="count-badge">{logrusStore.items.length}</span>
        {/if}
      </div>
      <button
        class="refresh-btn"
        onclick={() => logrusStore.scan()}
        disabled={logrusStore.loading}
        title="Scan logrus folder"
      >
        {logrusStore.loading ? "…" : "↺"}
      </button>
    </div>

    {#if !settings.vaultPath}
      <div class="panel-empty">
        <p>Configure your vault in Settings first.</p>
      </div>
    {:else if logrusStore.items.length === 0 && !logrusStore.loading}
      <div class="panel-empty">
        <p class="empty-title">No items waiting</p>
        <p class="empty-hint">
          Drop files into the <code>logrus/</code> folder inside your vault to process them here.
        </p>
        <p class="empty-path">{settings.vaultPath}/logrus/</p>
      </div>
    {:else}
      <ul class="item-list">
        {#each logrusStore.items as item (item.path)}
          <li>
            <button
              class="item-row"
              class:active={selectedItem?.path === item.path}
              onclick={() => selectItem(item)}
            >
              <span class="item-icon">{logrusIcon(item)}</span>
              <div class="item-meta">
                <span class="item-name">{item.name}</span>
                <span class="item-type">{item.type === "artifact" ? item.ext.toUpperCase() : "Inscription"}</span>
              </div>
            </button>
          </li>
        {/each}
      </ul>
    {/if}
  </div>

  <!-- Right: preview + actions -->
  <div class="detail-panel">
    {#if !selectedItem}
      <div class="no-selection">
        <div class="no-selection-icon">⊗</div>
        <p>Select an item to review it</p>
        {#if logrusStore.items.length === 0}
          <p class="no-selection-sub">
            Add files to <code>{settings.vaultPath}/logrus/</code> to begin processing
          </p>
        {/if}
      </div>
    {:else}
      <div class="detail-header">
        <span class="detail-icon">{logrusIcon(selectedItem)}</span>
        <div class="detail-title-block">
          <span class="detail-filename">{selectedItem.filename}</span>
          <span class="detail-type">{selectedItem.type === "artifact" ? selectedItem.ext.toUpperCase() : "Inscription draft"}</span>
        </div>
      </div>

      <!-- Preview -->
      <div class="preview-area">
        {#if selectedItem.type === "artifact" && selectedUrl}
          {#if selectedItem.mimeType === "application/pdf"}
            <iframe class="pdf-frame" src={selectedUrl} title={selectedItem.filename}></iframe>
          {:else if selectedItem.mimeType.startsWith("image/")}
            <div class="image-wrap">
              <img class="image-preview" src={selectedUrl} alt={selectedItem.filename} />
            </div>
          {/if}
        {:else if selectedItem.type === "inscription"}
          <pre class="text-preview">{textPreview || "(empty)"}</pre>
        {/if}
      </div>

      <!-- Claim form -->
      {#if claiming}
        <div class="claim-form">
          <p class="claim-label">
            Claiming as {selectedItem.type === "artifact" ? "artifact" : "inscription"}
          </p>

          {#if selectedItem.type === "inscription"}
            <div class="field">
              <label class="field-label" for="claim-title">Title</label>
              <input
                id="claim-title"
                class="field-input"
                bind:value={claimTitle}
                autofocus
                onkeydown={(e) => {
                  if (e.key === "Enter") confirmClaim();
                  if (e.key === "Escape") claiming = false;
                }}
              />
            </div>
          {/if}

          <div class="field">
            <label class="field-label" for="claim-shadow">Shadow (optional)</label>
            <select id="claim-shadow" class="field-select" bind:value={claimShadowId}>
              <option value="">— None —</option>
              {#each shadowsStore.shadows as shadow (shadow.id)}
                <option value={shadow.id}>{shadow.name}</option>
              {/each}
            </select>
          </div>

          {#if logrusStore.error}
            <p class="claim-error">{logrusStore.error}</p>
          {/if}

          <div class="claim-actions">
            <button class="btn-claim" onclick={confirmClaim}>
              Claim →
            </button>
            <button class="btn-cancel" onclick={() => (claiming = false)}>
              Cancel
            </button>
          </div>
        </div>
      {:else if discardConfirm}
        <div class="discard-confirm">
          <p>Delete <strong>{selectedItem.filename}</strong> permanently? This cannot be undone.</p>
          <div class="discard-actions">
            <button class="btn-discard-confirm" onclick={confirmDiscard}>Delete</button>
            <button class="btn-cancel" onclick={() => (discardConfirm = false)}>Cancel</button>
          </div>
        </div>
      {:else}
        <div class="action-bar">
          <button class="btn-claim" onclick={startClaim}>
            ✓ Claim
          </button>
          <button class="btn-discard" onclick={() => (discardConfirm = true)}>
            ✕ Discard
          </button>
          {#if selectedItem.type === "artifact"}
            <button class="btn-open" onclick={() => goto(`/artifacts`)}>
              View in Artifacts →
            </button>
          {/if}
        </div>
      {/if}
    {/if}
  </div>
</div>

<style>
  .logrus-layout {
    flex: 1;
    display: flex;
    min-height: 0;
    overflow: hidden;
  }

  /* ── Left panel ── */
  .list-panel {
    width: 260px;
    min-width: 260px;
    border-right: 1px solid var(--border);
    display: flex;
    flex-direction: column;
    background: var(--sidebar-bg);
    overflow: hidden;
  }

  .panel-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 14px 12px 10px;
    border-bottom: 1px solid var(--border);
    flex-shrink: 0;
  }

  .header-text {
    display: flex;
    align-items: center;
    gap: 7px;
  }

  .panel-title {
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--text-dim);
  }

  .count-badge {
    font-size: 10px;
    font-weight: 700;
    color: var(--accent);
    background: color-mix(in srgb, var(--accent) 15%, transparent);
    padding: 1px 6px;
    border-radius: 10px;
  }

  .refresh-btn {
    background: transparent;
    border: none;
    color: var(--text-dim);
    font-size: 14px;
    cursor: pointer;
    padding: 2px 6px;
    border-radius: 4px;
    transition: color 0.15s;
  }

  .refresh-btn:hover { color: var(--accent); }
  .refresh-btn:disabled { opacity: 0.4; cursor: default; }

  .panel-empty {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 24px 16px;
    text-align: center;
  }

  .empty-title {
    font-size: 13px;
    color: var(--text-muted);
    font-weight: 500;
    margin: 0;
  }

  .empty-hint {
    font-size: 11px;
    color: var(--text-dim);
    line-height: 1.6;
    margin: 0;
  }

  .empty-path {
    font-size: 10px;
    color: var(--text-dim);
    font-family: var(--font-mono);
    opacity: 0.6;
    margin: 0;
    word-break: break-all;
  }

  .item-list {
    flex: 1;
    overflow-y: auto;
    list-style: none;
    padding: 6px;
    margin: 0;
  }

  .item-row {
    display: flex;
    align-items: center;
    gap: 9px;
    width: 100%;
    padding: 8px 10px;
    border: none;
    border-radius: 7px;
    background: transparent;
    color: var(--text-muted);
    cursor: pointer;
    text-align: left;
    transition: background 0.1s, color 0.1s;
  }

  .item-row:hover { background: var(--surface-hover); color: var(--text); }
  .item-row.active { background: var(--surface-hover); color: var(--text); }

  .item-icon { font-size: 14px; flex-shrink: 0; }

  .item-meta {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }

  .item-name {
    font-size: 12px;
    font-weight: 500;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .item-type {
    font-size: 10px;
    color: var(--text-dim);
  }

  /* ── Right panel ── */
  .detail-panel {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-width: 0;
    overflow: hidden;
  }

  .no-selection {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 10px;
    text-align: center;
    padding: 40px;
  }

  .no-selection-icon {
    font-size: 44px;
    color: var(--oberon);
    opacity: 0.2;
  }

  .no-selection p {
    margin: 0;
    font-size: 13px;
    color: var(--text-muted);
  }

  .no-selection-sub {
    font-size: 11px;
    color: var(--text-dim);
    font-family: var(--font-mono);
    opacity: 0.7;
  }

  .detail-header {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 14px 18px;
    border-bottom: 1px solid var(--border);
    flex-shrink: 0;
  }

  .detail-icon { font-size: 20px; flex-shrink: 0; }

  .detail-title-block {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }

  .detail-filename {
    font-size: 14px;
    font-weight: 600;
    color: var(--text);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .detail-type { font-size: 11px; color: var(--text-dim); }

  /* ── Preview ── */
  .preview-area {
    flex: 1;
    min-height: 0;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }

  .pdf-frame {
    flex: 1;
    width: 100%;
    height: 100%;
    border: none;
  }

  .image-wrap {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
    overflow: auto;
  }

  .image-preview {
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
    border-radius: 4px;
  }

  .text-preview {
    flex: 1;
    overflow: auto;
    padding: 20px 24px;
    margin: 0;
    font-size: 12px;
    font-family: var(--font-mono);
    color: var(--text-muted);
    line-height: 1.7;
    white-space: pre-wrap;
    word-break: break-word;
    background: var(--bg);
  }

  /* ── Action bar ── */
  .action-bar {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px 18px;
    border-top: 1px solid var(--border);
    flex-shrink: 0;
    background: var(--sidebar-bg);
  }

  .btn-claim {
    padding: 7px 18px;
    background: var(--accent);
    border: none;
    border-radius: 7px;
    color: #000;
    font-size: 12px;
    font-weight: 700;
    cursor: pointer;
    transition: opacity 0.15s;
  }

  .btn-claim:hover { opacity: 0.85; }

  .btn-discard {
    padding: 7px 14px;
    background: transparent;
    border: 1px solid color-mix(in srgb, #e06c75 35%, transparent);
    border-radius: 7px;
    color: #e06c75;
    font-size: 12px;
    cursor: pointer;
    transition: background 0.15s;
  }

  .btn-discard:hover { background: color-mix(in srgb, #e06c75 10%, transparent); }

  .btn-open {
    margin-left: auto;
    background: transparent;
    border: none;
    color: var(--text-dim);
    font-size: 11px;
    cursor: pointer;
    padding: 4px 8px;
    transition: color 0.15s;
  }

  .btn-open:hover { color: var(--accent); }

  /* ── Claim form ── */
  .claim-form {
    padding: 16px 18px;
    border-top: 1px solid var(--border);
    background: var(--surface);
    display: flex;
    flex-direction: column;
    gap: 12px;
    flex-shrink: 0;
  }

  .claim-label {
    margin: 0;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--text-dim);
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: 5px;
  }

  .field-label {
    font-size: 11px;
    color: var(--text-dim);
  }

  .field-input {
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: 6px;
    color: var(--text);
    font-size: 13px;
    padding: 7px 10px;
    outline: none;
  }

  .field-input:focus { border-color: var(--accent); }

  .field-select {
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: 6px;
    color: var(--text-muted);
    font-size: 12px;
    padding: 7px 10px;
    outline: none;
    cursor: pointer;
  }

  .field-select:focus { border-color: var(--accent); }

  .claim-error {
    margin: 0;
    font-size: 11px;
    color: #e06c75;
  }

  .claim-actions {
    display: flex;
    gap: 8px;
  }

  .btn-cancel {
    padding: 7px 14px;
    background: transparent;
    border: 1px solid var(--border);
    border-radius: 7px;
    color: var(--text-muted);
    font-size: 12px;
    cursor: pointer;
    transition: border-color 0.15s;
  }

  .btn-cancel:hover { border-color: var(--border-hover); }

  /* ── Discard confirm ── */
  .discard-confirm {
    padding: 16px 18px;
    border-top: 1px solid var(--border);
    background: color-mix(in srgb, #e06c75 6%, var(--surface));
    flex-shrink: 0;
  }

  .discard-confirm p {
    margin: 0 0 12px;
    font-size: 13px;
    color: var(--text-muted);
    line-height: 1.5;
  }

  .discard-actions {
    display: flex;
    gap: 8px;
  }

  .btn-discard-confirm {
    padding: 7px 16px;
    background: #e06c75;
    border: none;
    border-radius: 7px;
    color: #fff;
    font-size: 12px;
    font-weight: 700;
    cursor: pointer;
    transition: opacity 0.15s;
  }

  .btn-discard-confirm:hover { opacity: 0.85; }
</style>
