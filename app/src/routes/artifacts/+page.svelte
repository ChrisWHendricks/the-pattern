<script lang="ts">
  import { page } from "$app/stores";
  import { artifactsStore } from "$lib/stores/artifacts.svelte";
  import { vault } from "$lib/stores/vault.svelte";
  import { settings } from "$lib/stores/settings.svelte";
  import { artifactTypeIcon, artifactTypeLabel } from "$lib/artifacts";
  import { onMount } from "svelte";

  let selectedId = $state<string | null>(null);

  onMount(async () => {
    const paramId = $page.url.searchParams.get("selected");
    if (paramId) selectedId = paramId;
    if (settings.vaultPath) await vault.loadInscriptions();
  });

  const selected = $derived(
    selectedId ? artifactsStore.artifacts.find((a) => a.id === selectedId) ?? null : null
  );

  const selectedUrl = $derived(selected ? artifactsStore.artifactUrl(selected) : null);

  function selectArtifact(id: string) { selectedId = id; }

  async function handleImport() {
    await artifactsStore.importArtifact();
  }

  function handleRemove(id: string) {
    artifactsStore.remove(id);
    if (selectedId === id) selectedId = artifactsStore.artifacts[0]?.id ?? null;
  }

  function formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString("en-US", {
      month: "short", day: "numeric", year: "numeric",
    });
  }

  function linkedInscriptions() {
    if (!selected) return [];
    return vault.inscriptions.filter((i) => selected.linkedPaths.includes(i.path));
  }

  let linkDropdownOpen = $state(false);

  function availableToLink() {
    if (!selected) return vault.inscriptions;
    return vault.inscriptions.filter((i) => !selected.linkedPaths.includes(i.path));
  }

  function linkInscription(inscriptionPath: string) {
    if (!selected) return;
    artifactsStore.link(selected.id, inscriptionPath);
    linkDropdownOpen = false;
  }

  function unlinkInscription(inscriptionPath: string) {
    if (!selected) return;
    artifactsStore.unlink(selected.id, inscriptionPath);
  }
</script>

<div class="artifacts-layout">
  <!-- Left panel: artifact list -->
  <div class="artifact-list-panel">
    <div class="panel-header">
      <span class="panel-title">Artifacts</span>
      <button
        class="import-btn"
        onclick={handleImport}
        disabled={artifactsStore.importing || !settings.vaultPath}
        title={!settings.vaultPath ? "Configure vault in Settings first" : "Import PDF or image"}
      >
        {artifactsStore.importing ? "…" : "+ Import"}
      </button>
    </div>

    {#if artifactsStore.importError}
      <div class="import-error">{artifactsStore.importError}</div>
    {/if}

    {#if artifactsStore.artifacts.length === 0}
      <div class="list-empty">
        <p>No artifacts yet.</p>
        <p>Import a PDF or image to attach it to your inscriptions.</p>
      </div>
    {:else}
      <ul class="artifact-list">
        {#each artifactsStore.artifacts as artifact (artifact.id)}
          <li>
            <button
              class="artifact-item"
              class:active={selectedId === artifact.id}
              onclick={() => selectArtifact(artifact.id)}
            >
              <span class="artifact-icon">{artifactTypeIcon(artifact.mimeType)}</span>
              <div class="artifact-meta">
                <span class="artifact-name">{artifact.filename}</span>
                <span class="artifact-detail">
                  {artifactTypeLabel(artifact.mimeType)} · {formatDate(artifact.createdAt)}
                  {#if artifact.linkedPaths.length > 0}
                    · {artifact.linkedPaths.length} link{artifact.linkedPaths.length !== 1 ? "s" : ""}
                  {/if}
                </span>
              </div>
            </button>
          </li>
        {/each}
      </ul>
    {/if}
  </div>

  <!-- Right panel: viewer + detail -->
  <div class="artifact-detail-panel">
    {#if !selected}
      <div class="no-selection">
        <div class="no-selection-icon">◧</div>
        <p>Select an artifact to view it</p>
      </div>
    {:else}
      <div class="detail-header">
        <div class="detail-title-row">
          <span class="detail-icon">{artifactTypeIcon(selected.mimeType)}</span>
          <div class="detail-title-text">
            <span class="detail-filename">{selected.filename}</span>
            <span class="detail-sub">{artifactTypeLabel(selected.mimeType)} · {formatDate(selected.createdAt)}</span>
          </div>
        </div>
        <button class="delete-btn" onclick={() => handleRemove(selected.id)} title="Remove artifact">✕</button>
      </div>

      <!-- Viewer — vault:// protocol serves files directly, no base64 needed -->
      <div class="viewer-area">
        {#if selectedUrl}
          {#if selected.mimeType === "application/pdf"}
            <iframe
              class="pdf-frame"
              src={selectedUrl}
              title={selected.filename}
            ></iframe>
          {:else if selected.mimeType.startsWith("image/")}
            <div class="image-wrapper">
              <img class="image-view" src={selectedUrl} alt={selected.filename} />
            </div>
          {/if}
        {/if}
      </div>

      <!-- Linked inscriptions -->
      <div class="links-section">
        <div class="links-header">
          <span class="links-label">Linked Inscriptions</span>
          <div class="link-add-wrap">
            <button
              class="link-add-btn"
              onclick={() => { linkDropdownOpen = !linkDropdownOpen; }}
              disabled={availableToLink().length === 0}
            >+ Link</button>
            {#if linkDropdownOpen}
              <div class="link-dropdown">
                {#each availableToLink() as inscription}
                  <button
                    class="link-dropdown-item"
                    onclick={() => linkInscription(inscription.path)}
                  >{inscription.title}</button>
                {:else}
                  <span class="link-dropdown-empty">All inscriptions linked</span>
                {/each}
              </div>
            {/if}
          </div>
        </div>

        {#if linkedInscriptions().length === 0}
          <p class="links-empty">No inscriptions linked to this artifact.</p>
        {:else}
          <div class="link-chips">
            {#each linkedInscriptions() as inscription}
              <div class="link-chip">
                <span class="chip-text">◻ {inscription.title}</span>
                <button
                  class="chip-remove"
                  title="Unlink"
                  onclick={() => unlinkInscription(inscription.path)}
                >✕</button>
              </div>
            {/each}
          </div>
        {/if}
      </div>
    {/if}
  </div>
</div>

<style>
  .artifacts-layout {
    flex: 1;
    display: flex;
    min-height: 0;
    overflow: hidden;
  }

  /* ── Left panel ── */
  .artifact-list-panel {
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
  }

  .panel-title {
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--text-dim);
  }

  .import-btn {
    font-size: 11px;
    padding: 3px 8px;
    border: 1px solid var(--border);
    border-radius: 4px;
    background: transparent;
    color: var(--text-muted);
    cursor: pointer;
    transition: color 0.15s, border-color 0.15s;
  }

  .import-btn:hover:not(:disabled) {
    color: var(--accent);
    border-color: var(--accent);
  }

  .import-btn:disabled { opacity: 0.4; cursor: default; }

  .import-error {
    padding: 6px 12px;
    font-size: 11px;
    color: #e06c75;
    background: color-mix(in srgb, #e06c75 10%, transparent);
    border-bottom: 1px solid var(--border);
  }

  .list-empty {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 24px;
    text-align: center;
  }

  .list-empty p {
    font-size: 12px;
    color: var(--text-dim);
    margin: 0;
    line-height: 1.5;
  }

  .artifact-list {
    flex: 1;
    overflow-y: auto;
    list-style: none;
    padding: 6px;
    margin: 0;
  }

  .artifact-item {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    width: 100%;
    padding: 8px 8px;
    border: none;
    border-radius: 6px;
    background: transparent;
    color: var(--text-muted);
    cursor: pointer;
    text-align: left;
    transition: background 0.15s, color 0.15s;
  }

  .artifact-item:hover { background: var(--surface-hover); color: var(--text); }
  .artifact-item.active { background: var(--surface-hover); color: var(--text); }

  .artifact-icon {
    font-size: 14px;
    margin-top: 1px;
    flex-shrink: 0;
  }

  .artifact-meta {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }

  .artifact-name {
    font-size: 12px;
    font-weight: 500;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 190px;
  }

  .artifact-detail {
    font-size: 10px;
    color: var(--text-dim);
  }

  /* ── Right panel ── */
  .artifact-detail-panel {
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
  }

  .no-selection-icon {
    font-size: 40px;
    color: var(--text-dim);
    opacity: 0.4;
  }

  .no-selection p {
    font-size: 13px;
    color: var(--text-dim);
    margin: 0;
  }

  .detail-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 16px;
    border-bottom: 1px solid var(--border);
    flex-shrink: 0;
  }

  .detail-title-row {
    display: flex;
    align-items: center;
    gap: 10px;
    min-width: 0;
  }

  .detail-icon { font-size: 18px; flex-shrink: 0; }

  .detail-title-text {
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
    max-width: 400px;
  }

  .detail-sub {
    font-size: 11px;
    color: var(--text-dim);
  }

  .delete-btn {
    border: none;
    background: transparent;
    color: var(--text-dim);
    font-size: 13px;
    cursor: pointer;
    padding: 4px 6px;
    border-radius: 4px;
    flex-shrink: 0;
    transition: color 0.15s;
  }

  .delete-btn:hover { color: #e06c75; }

  /* ── Viewer ── */
  .viewer-area {
    flex: 1;
    min-height: 0;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    background: var(--bg);
  }

  .viewer-loading, .viewer-error {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 13px;
    color: var(--text-dim);
  }

  .viewer-error { color: #e06c75; }

  .pdf-frame {
    flex: 1;
    width: 100%;
    height: 100%;
    border: none;
  }

  .image-wrapper {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
    overflow: auto;
  }

  .image-view {
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
    border-radius: 4px;
  }

  /* ── Linked inscriptions ── */
  .links-section {
    flex-shrink: 0;
    border-top: 1px solid var(--border);
    padding: 12px 16px;
    background: var(--sidebar-bg);
  }

  .links-header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;
  }

  .links-label {
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--text-dim);
    flex: 1;
  }

  .link-add-wrap { position: relative; }

  .link-add-btn {
    font-size: 11px;
    padding: 3px 8px;
    border: 1px solid var(--border);
    border-radius: 4px;
    background: transparent;
    color: var(--text-muted);
    cursor: pointer;
    transition: color 0.15s, border-color 0.15s;
  }

  .link-add-btn:hover:not(:disabled) { color: var(--accent); border-color: var(--accent); }
  .link-add-btn:disabled { opacity: 0.4; cursor: default; }

  .link-dropdown {
    position: absolute;
    right: 0;
    bottom: calc(100% + 4px);
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 6px;
    min-width: 200px;
    max-height: 200px;
    overflow-y: auto;
    z-index: 100;
    box-shadow: 0 4px 16px rgba(0,0,0,0.3);
  }

  .link-dropdown-item {
    display: block;
    width: 100%;
    padding: 7px 12px;
    border: none;
    background: transparent;
    color: var(--text-muted);
    font-size: 12px;
    text-align: left;
    cursor: pointer;
    transition: background 0.1s;
  }

  .link-dropdown-item:hover { background: var(--surface-hover); color: var(--text); }

  .link-dropdown-empty {
    display: block;
    padding: 8px 12px;
    font-size: 11px;
    color: var(--text-dim);
  }

  .links-empty {
    font-size: 12px;
    color: var(--text-dim);
    margin: 0;
  }

  .link-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }

  .link-chip {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 3px 8px 3px 8px;
    background: var(--surface-hover);
    border-radius: 20px;
    border: 1px solid var(--border);
  }

  .chip-text {
    font-size: 11px;
    color: var(--text-muted);
  }

  .chip-remove {
    border: none;
    background: transparent;
    color: var(--text-dim);
    font-size: 10px;
    cursor: pointer;
    padding: 0 2px;
    line-height: 1;
    transition: color 0.1s;
  }

  .chip-remove:hover { color: #e06c75; }
</style>
