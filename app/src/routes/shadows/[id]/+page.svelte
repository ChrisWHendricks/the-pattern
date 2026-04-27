<script lang="ts">
  import { onMount } from "svelte";
  import { page } from "$app/stores";
  import { goto } from "$app/navigation";
  import { vault } from "$lib/stores/vault.svelte";
  import { settings } from "$lib/stores/settings.svelte";
  import { shadowsStore } from "$lib/stores/shadows.svelte";
  import { artifactsStore } from "$lib/stores/artifacts.svelte";
  import { artifactTypeIcon } from "$lib/artifacts";
  import { resolveCoverStyle } from "$lib/shadows";
  import Editor from "$lib/components/Editor.svelte";
  import OberonChat from "$lib/components/OberonChat.svelte";

  const shadowId = $derived($page.params.id ?? "");
  const shadow = $derived(shadowsStore.shadows.find((s) => s.id === shadowId) ?? null);

  const shadowInscriptions = $derived(
    shadow
      ? vault.inscriptions.filter((i) =>
          shadowsStore.getInscriptionPaths(shadowId).includes(i.path)
        )
      : []
  );

  const linkedArtifacts = $derived(
    vault.currentInscription
      ? artifactsStore.forInscription(vault.currentInscription.path)
      : []
  );

  let chatOpen = $state(false);
  let addingExisting = $state(false);

  const availableToAdd = $derived(
    vault.inscriptions.filter(
      (i) => !shadowsStore.getInscriptionPaths(shadowId).includes(i.path)
    )
  );

  onMount(async () => {
    shadowsStore.load();
    if (settings.vaultPath) {
      await vault.loadInscriptions();
    }
  });

  // Auto-open first inscription when entering the shadow
  $effect(() => {
    if (
      shadowInscriptions.length > 0 &&
      (!vault.currentInscription ||
        !shadowInscriptions.some((i) => i.path === vault.currentInscription?.path))
    ) {
      vault.openInscription(shadowInscriptions[0]);
    }
  });

  async function handleSave(markdown: string) {
    await vault.saveCurrentInscription(markdown);
  }

  async function createInscriptionInShadow() {
    if (!settings.vaultPath) return;
    await vault.newInscription();
    if (vault.currentInscription) {
      shadowsStore.assign(shadowId, vault.currentInscription.path);
    }
  }

  function coverStyle(): string {
    if (!shadow) return "";
    return resolveCoverStyle(shadow, settings.vaultPath ?? "");
  }
</script>

<div class="shadow-layout">
  <!-- Left: filtered inscriptions for this shadow -->
  <div class="shadow-panel">
    <!-- Cover header with back nav -->
    <div class="shadow-header" style="background: {coverStyle()};">
      <div class="header-overlay">
        <button class="back-btn" onclick={() => goto("/shadows")}>
          ← Shadows
        </button>
        {#if shadow}
          <div class="shadow-title-block">
            <h2 class="shadow-title">{shadow.name}</h2>
            {#if shadow.description}
              <p class="shadow-subtitle">{shadow.description}</p>
            {/if}
          </div>
        {/if}
      </div>
    </div>

    <!-- Inscriptions list -->
    <div class="panel-list-header">
      <span class="panel-list-label">Inscriptions</span>
      <div class="panel-list-actions">
        <button
          class="action-btn"
          title="Add existing inscription"
          onclick={() => (addingExisting = !addingExisting)}
          disabled={availableToAdd.length === 0}
        >
          Link
        </button>
        <button
          class="action-btn"
          title="New inscription in this shadow"
          onclick={createInscriptionInShadow}
          disabled={!settings.vaultPath}
        >
          + New
        </button>
      </div>
    </div>

    {#if addingExisting}
      <div class="add-existing-panel">
        {#if availableToAdd.length === 0}
          <span class="add-empty">All inscriptions already linked</span>
        {:else}
          {#each availableToAdd as inscription}
            <button
              class="add-item"
              onclick={() => {
                shadowsStore.assign(shadowId, inscription.path);
                addingExisting = false;
              }}
            >
              ◻ {inscription.title}
            </button>
          {/each}
        {/if}
      </div>
    {/if}

    <ul class="inscription-list">
      {#if shadowInscriptions.length === 0}
        <li class="list-empty">
          <p>No inscriptions yet.</p>
          <button class="link-btn" onclick={createInscriptionInShadow}>
            Create one →
          </button>
        </li>
      {:else}
        {#each shadowInscriptions as inscription (inscription.path)}
          <li
            class="inscription-item"
            class:active={vault.currentInscription?.path === inscription.path}
          >
            <button
              class="inscription-select"
              onclick={() => vault.openInscription(inscription)}
            >
              <span class="item-icon">◻</span>
              <span class="item-title">{inscription.title}</span>
              {#if vault.currentInscription?.path === inscription.path && vault.isDirty}
                <span class="dirty-dot"></span>
              {/if}
            </button>
            <button
              class="unlink-btn"
              title="Remove from shadow"
              onclick={() => shadowsStore.unassign(shadowId, inscription.path)}
            >✕</button>
          </li>
        {/each}
      {/if}
    </ul>
  </div>

  <!-- Right: editor -->
  <div class="editor-wrapper">
    {#if !settings.vaultPath}
      <div class="no-content">
        <div class="no-content-icon">◻</div>
        <p>Configure your vault in Settings to start writing.</p>
      </div>
    {:else if vault.currentInscription && shadowInscriptions.some((i) => i.path === vault.currentInscription?.path)}
      {#key vault.currentInscription.path}
        <Editor
          content={vault.currentContent}
          onSave={handleSave}
          onDirty={() => vault.markDirty()}
          saving={vault.isSaving}
          {chatOpen}
          onToggleChat={() => (chatOpen = !chatOpen)}
        />
      {/key}
      {#if linkedArtifacts.length > 0}
        <div class="artifacts-strip">
          <span class="artifacts-strip-label">Artifacts</span>
          {#each linkedArtifacts as artifact (artifact.id)}
            <button
              class="artifact-chip"
              title={artifact.filename}
              onclick={() => goto(`/artifacts?selected=${artifact.id}`)}
            >
              {artifactTypeIcon(artifact.mimeType)}
              <span>{artifact.filename}</span>
            </button>
          {/each}
          <button
            class="artifact-chip artifact-chip-add"
            onclick={() =>
              vault.currentInscription &&
              artifactsStore.importArtifact(vault.currentInscription.path)}
          >+ Artifact</button>
        </div>
      {/if}
    {:else}
      <div class="no-content">
        <div class="no-content-icon">◻</div>
        <p>Select an inscription from the panel to begin</p>
      </div>
    {/if}
  </div>

  {#if chatOpen}
    <div class="chat-panel">
      <OberonChat />
    </div>
  {/if}
</div>

<style>
  .shadow-layout {
    flex: 1;
    display: flex;
    min-height: 0;
    overflow: hidden;
  }

  /* ── Left panel ── */
  .shadow-panel {
    width: 240px;
    min-width: 240px;
    border-right: 1px solid var(--border);
    display: flex;
    flex-direction: column;
    background: var(--sidebar-bg);
    overflow: hidden;
  }

  .shadow-header {
    height: 110px;
    flex-shrink: 0;
    background-size: cover;
    background-position: center;
    position: relative;
  }

  .header-overlay {
    position: absolute;
    inset: 0;
    background: linear-gradient(
      to bottom,
      rgba(0, 0, 0, 0.3) 0%,
      rgba(0, 0, 0, 0.65) 100%
    );
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    padding: 8px 10px 10px;
  }

  .back-btn {
    background: transparent;
    border: none;
    color: rgba(255, 255, 255, 0.6);
    font-size: 11px;
    cursor: pointer;
    padding: 0;
    text-align: left;
    transition: color 0.15s;
    align-self: flex-start;
  }

  .back-btn:hover { color: #fff; }

  .shadow-title-block {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .shadow-title {
    margin: 0;
    font-size: 15px;
    font-weight: 700;
    color: #fff;
    line-height: 1.2;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .shadow-subtitle {
    margin: 0;
    font-size: 10px;
    color: rgba(255, 255, 255, 0.55);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .panel-list-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 10px 6px;
    border-bottom: 1px solid var(--border);
    flex-shrink: 0;
  }

  .panel-list-label {
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--text-dim);
  }

  .panel-list-actions {
    display: flex;
    gap: 4px;
  }

  .action-btn {
    font-size: 10px;
    padding: 2px 7px;
    border: 1px solid var(--border);
    border-radius: 4px;
    background: transparent;
    color: var(--text-muted);
    cursor: pointer;
    transition: color 0.15s, border-color 0.15s;
  }

  .action-btn:hover:not(:disabled) {
    color: var(--accent);
    border-color: var(--accent);
  }

  .action-btn:disabled { opacity: 0.35; cursor: not-allowed; }

  .add-existing-panel {
    border-bottom: 1px solid var(--border);
    background: var(--surface);
    max-height: 160px;
    overflow-y: auto;
    flex-shrink: 0;
  }

  .add-item {
    display: block;
    width: 100%;
    padding: 7px 12px;
    border: none;
    background: transparent;
    color: var(--text-muted);
    font-size: 11px;
    text-align: left;
    cursor: pointer;
    transition: background 0.1s, color 0.1s;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .add-item:hover { background: var(--surface-hover); color: var(--text); }

  .add-empty {
    display: block;
    padding: 8px 12px;
    font-size: 11px;
    color: var(--text-dim);
  }

  .inscription-list {
    flex: 1;
    overflow-y: auto;
    list-style: none;
    padding: 6px;
    margin: 0;
  }

  .list-empty {
    padding: 20px 10px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    align-items: center;
    text-align: center;
  }

  .list-empty p { font-size: 12px; color: var(--text-dim); margin: 0; }

  .link-btn {
    background: none;
    border: none;
    color: var(--accent);
    font-size: 11px;
    cursor: pointer;
    padding: 0;
    opacity: 0.8;
    transition: opacity 0.15s;
  }

  .link-btn:hover { opacity: 1; }

  .inscription-item {
    display: flex;
    align-items: center;
    border-radius: 6px;
    overflow: hidden;
    transition: background 0.1s;
  }

  .inscription-item:hover { background: var(--surface-hover); }
  .inscription-item.active { background: var(--surface-hover); }

  .inscription-select {
    flex: 1;
    display: flex;
    align-items: center;
    gap: 7px;
    padding: 6px 4px 6px 8px;
    border: none;
    background: transparent;
    color: var(--text-muted);
    font-size: 12px;
    text-align: left;
    cursor: pointer;
    min-width: 0;
    transition: color 0.1s;
  }

  .inscription-item:hover .inscription-select { color: var(--text); }
  .inscription-item.active .inscription-select { color: var(--text); }

  .item-icon {
    font-size: 11px;
    color: var(--text-dim);
    flex-shrink: 0;
  }

  .inscription-item.active .item-icon { color: var(--accent); }

  .item-title {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .dirty-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--accent);
    flex-shrink: 0;
  }

  .unlink-btn {
    background: none;
    border: none;
    color: var(--text-dim);
    font-size: 9px;
    cursor: pointer;
    padding: 0 2px;
    opacity: 0;
    transition: opacity 0.1s, color 0.1s;
    flex-shrink: 0;
    line-height: 1;
  }

  .inscription-item:hover .unlink-btn { opacity: 1; }
  .unlink-btn { padding: 6px 8px 6px 4px; }
  .unlink-btn:hover { color: #e06c75; }

  /* ── Editor area ── */
  .editor-wrapper {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-width: 0;
    overflow: hidden;
  }

  .no-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 12px;
    padding: 40px;
    text-align: center;
  }

  .no-content-icon {
    font-size: 40px;
    color: var(--text-dim);
    opacity: 0.4;
  }

  .no-content p {
    margin: 0;
    font-size: 13px;
    color: var(--text-muted);
    max-width: 240px;
    line-height: 1.6;
  }

  /* ── Artifacts strip ── */
  .artifacts-strip {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 12px;
    border-top: 1px solid var(--border);
    background: var(--sidebar-bg);
    flex-shrink: 0;
    flex-wrap: wrap;
  }

  .artifacts-strip-label {
    font-size: 9px;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--text-dim);
    margin-right: 2px;
  }

  .artifact-chip {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 3px 8px;
    border: 1px solid var(--border);
    border-radius: 20px;
    background: transparent;
    color: var(--text-muted);
    font-size: 11px;
    cursor: pointer;
    transition: color 0.15s, border-color 0.15s;
    white-space: nowrap;
  }

  .artifact-chip:hover { color: var(--accent); border-color: var(--accent); }

  .artifact-chip-add {
    color: var(--text-dim);
    border-style: dashed;
  }

  /* ── Chat panel ── */
  .chat-panel {
    width: 340px;
    min-width: 340px;
    border-left: 1px solid var(--border);
    display: flex;
    flex-direction: column;
    min-height: 0;
    overflow: hidden;
  }
</style>
