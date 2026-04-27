<script lang="ts">
  import { onMount } from "svelte";
  import { shadowsStore } from "$lib/stores/shadows.svelte";
  import { vault } from "$lib/stores/vault.svelte";
  import { settings } from "$lib/stores/settings.svelte";
  import { nameToGradient, resolveCoverStyle, type Shadow } from "$lib/shadows";

  let newShadowName = $state("");
  let creatingNew = $state(false);
  let editingName = $state(false);
  let editingDesc = $state(false);
  let editingCover = $state(false);
  let draftName = $state("");
  let draftDesc = $state("");
  let draftCover = $state("");
  let dragOver = $state<string | null>(null); // shadowId being dragged over

  onMount(async () => {
    shadowsStore.load();
    if (settings.vaultPath) {
      await vault.loadInscriptions();
    }
  });

  const selected = $derived(shadowsStore.selected);

  const selectedInscriptions = $derived(() => {
    if (!selected) return [];
    const paths = shadowsStore.getInscriptionPaths(selected.id);
    return vault.inscriptions.filter((i) => paths.includes(i.path));
  });

  const unassignedInscriptions = $derived(() => {
    if (!selected) return vault.inscriptions;
    const paths = shadowsStore.getInscriptionPaths(selected.id);
    return vault.inscriptions.filter((i) => !paths.includes(i.path));
  });

  function submitNewShadow() {
    const name = newShadowName.trim();
    if (!name) return;
    shadowsStore.createShadow(name);
    newShadowName = "";
    creatingNew = false;
  }

  function startEditName() {
    draftName = selected?.name ?? "";
    editingName = true;
  }

  function commitName() {
    if (selected && draftName.trim()) {
      shadowsStore.updateShadow(selected.id, { name: draftName.trim() });
    }
    editingName = false;
  }

  function startEditDesc() {
    draftDesc = selected?.description ?? "";
    editingDesc = true;
  }

  function commitDesc() {
    if (selected) {
      shadowsStore.updateShadow(selected.id, { description: draftDesc });
    }
    editingDesc = false;
  }

  function startEditCover() {
    draftCover = selected?.coverImage ?? "";
    editingCover = true;
  }

  function commitCover() {
    if (selected) {
      shadowsStore.updateShadow(selected.id, { coverImage: draftCover.trim() || null });
    }
    editingCover = false;
  }

  // Drag-and-drop from InscriptionsList or the unassigned section
  function onDragOver(e: DragEvent, shadowId: string) {
    if (e.dataTransfer?.types.includes("text/inscription-path")) {
      e.preventDefault();
      dragOver = shadowId;
    }
  }

  function onDragLeave() { dragOver = null; }

  function onDrop(e: DragEvent, shadowId: string) {
    e.preventDefault();
    dragOver = null;
    const path = e.dataTransfer?.getData("text/inscription-path");
    if (path) shadowsStore.assign(shadowId, path);
  }

  async function createInscriptionInShadow() {
    if (!selected || !settings.vaultPath) return;
    await vault.newInscription();
    if (vault.currentInscription) {
      shadowsStore.assign(selected.id, vault.currentInscription.path);
    }
  }

  function coverStyle(shadow: Shadow) {
    return resolveCoverStyle(shadow, settings.vaultPath ?? "");
  }
</script>

<div class="shadows-layout">
  <!-- Left: shadow list -->
  <div class="shadow-list">
    <div class="list-header">
      <span class="list-title">Shadows</span>
      <button class="new-btn" onclick={() => (creatingNew = true)} title="New shadow">+</button>
    </div>

    {#if creatingNew}
      <form class="new-shadow-form" onsubmit={(e) => { e.preventDefault(); submitNewShadow(); }}>
        <input
          class="new-shadow-input"
          bind:value={newShadowName}
          placeholder="Shadow name…"
          autofocus
          onkeydown={(e) => { if (e.key === "Escape") { creatingNew = false; newShadowName = ""; } }}
        />
        <div class="new-shadow-actions">
          <button type="submit" class="btn-create" disabled={!newShadowName.trim()}>Create</button>
          <button type="button" class="btn-cancel" onclick={() => { creatingNew = false; newShadowName = ""; }}>Cancel</button>
        </div>
      </form>
    {/if}

    {#if shadowsStore.shadows.length === 0 && !creatingNew}
      <div class="list-empty">
        <p>No shadows yet.</p>
        <button class="link-btn" onclick={() => (creatingNew = true)}>Create your first shadow →</button>
      </div>
    {:else}
      <ul class="shadow-items">
        {#each shadowsStore.shadows as shadow (shadow.id)}
          <li>
            <button
              class="shadow-item"
              class:active={shadowsStore.selectedId === shadow.id}
              class:drag-target={dragOver === shadow.id}
              onclick={() => shadowsStore.select(shadow.id)}
              ondragover={(e) => onDragOver(e, shadow.id)}
              ondragleave={onDragLeave}
              ondrop={(e) => onDrop(e, shadow.id)}
            >
              <span class="shadow-swatch" style="background: {nameToGradient(shadow.name)}"></span>
              <span class="shadow-item-name">{shadow.name}</span>
              <span class="shadow-count">{shadowsStore.getInscriptionPaths(shadow.id).length}</span>
            </button>
          </li>
        {/each}
      </ul>
    {/if}
  </div>

  <!-- Right: shadow detail -->
  {#if selected}
    <div class="shadow-detail">
      <!-- Cover header -->
      <div class="shadow-cover" style="background: {coverStyle(selected)}">
        <button class="cover-edit-btn" onclick={startEditCover} title="Change cover image">
          {selected.coverImage ? "⬡ Change cover" : "⬡ Add cover image"}
        </button>
      </div>

      {#if editingCover}
        <div class="cover-editor">
          <input
            class="cover-input"
            bind:value={draftCover}
            placeholder="https://… or file:// or vault/relative/path.png"
            onkeydown={(e) => { if (e.key === "Enter") commitCover(); if (e.key === "Escape") editingCover = false; }}
            autofocus
          />
          <div class="cover-actions">
            <button class="btn-create" onclick={commitCover}>Apply</button>
            <button class="btn-cancel" onclick={() => (editingCover = false)}>Cancel</button>
            {#if selected.coverImage}
              <button class="btn-remove" onclick={() => { draftCover = ""; commitCover(); }}>Remove</button>
            {/if}
          </div>
        </div>
      {/if}

      <!-- Name & description -->
      <div class="shadow-meta">
        {#if editingName}
          <input
            class="name-input"
            bind:value={draftName}
            onblur={commitName}
            onkeydown={(e) => { if (e.key === "Enter") commitName(); if (e.key === "Escape") editingName = false; }}
            autofocus
          />
        {:else}
          <div class="shadow-name-row">
            <h1 class="shadow-name">{selected.name}</h1>
            <button class="inline-edit-btn" onclick={startEditName} title="Edit name">✎</button>
          </div>
        {/if}

        {#if editingDesc}
          <textarea
            class="desc-input"
            bind:value={draftDesc}
            rows={2}
            onblur={commitDesc}
            onkeydown={(e) => { if (e.key === "Escape") editingDesc = false; }}
            placeholder="Add a description…"
            autofocus
          ></textarea>
        {:else}
          <div class="shadow-desc-row">
            <p class="shadow-desc" class:empty={!selected.description}>
              {selected.description || "Add a description…"}
            </p>
            <button class="inline-edit-btn" onclick={startEditDesc} title="Edit description">✎</button>
          </div>
        {/if}
      </div>

      <!-- Inscriptions in this shadow -->
      <div class="section">
        <div class="section-header">
          <span class="section-title">Inscriptions</span>
          <button class="new-inscription-btn" onclick={createInscriptionInShadow} disabled={!settings.vaultPath}>
            + New
          </button>
        </div>

        {#if selectedInscriptions().length === 0}
          <p class="section-empty">No inscriptions yet — drag one from below or use right-click in Inscriptions.</p>
        {:else}
          <ul class="inscription-chips">
            {#each selectedInscriptions() as inscription (inscription.path)}
              <li class="inscription-chip">
                <span class="chip-icon">◻</span>
                <span class="chip-title">{inscription.title}</span>
                <button
                  class="chip-remove"
                  title="Remove from shadow"
                  onclick={() => shadowsStore.unassign(selected.id, inscription.path)}
                >✕</button>
              </li>
            {/each}
          </ul>
        {/if}
      </div>

      <!-- All vault inscriptions (drag source) -->
      {#if vault.inscriptions.length > 0}
        <div class="section">
          <div class="section-header">
            <span class="section-title">All Vault Inscriptions</span>
            <span class="section-hint">drag to add · click to toggle</span>
          </div>

          <ul class="inscription-chips dim">
            {#each vault.inscriptions as inscription (inscription.path)}
              {@const assigned = shadowsStore.isAssigned(selected.id, inscription.path)}
              <li
                class="inscription-chip"
                class:assigned
                draggable="true"
                ondragstart={(e) => e.dataTransfer?.setData("text/inscription-path", inscription.path)}
              >
                <span class="chip-icon">◻</span>
                <span class="chip-title">{inscription.title}</span>
                <button
                  class="chip-toggle"
                  title={assigned ? "Remove from shadow" : "Add to shadow"}
                  onclick={() => assigned
                    ? shadowsStore.unassign(selected.id, inscription.path)
                    : shadowsStore.assign(selected.id, inscription.path)}
                >{assigned ? "✓" : "+"}</button>
              </li>
            {/each}
          </ul>
        </div>
      {/if}

      <!-- Delete shadow -->
      <div class="danger-zone">
        <button class="delete-shadow-btn" onclick={() => shadowsStore.deleteShadow(selected.id)}>
          Delete shadow
        </button>
      </div>
    </div>
  {:else}
    <div class="no-selection">
      <div class="no-selection-icon">◑</div>
      <p>Select a shadow or create a new one</p>
    </div>
  {/if}
</div>

<style>
  .shadows-layout {
    flex: 1;
    display: flex;
    min-height: 0;
    overflow: hidden;
  }

  /* ── Left list ─────────────────────────────────────────────────── */
  .shadow-list {
    width: 200px;
    min-width: 200px;
    border-right: 1px solid var(--border);
    display: flex;
    flex-direction: column;
    background: var(--sidebar-bg);
    overflow: hidden;
  }

  .list-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 14px 14px 10px;
    border-bottom: 1px solid var(--border);
    flex-shrink: 0;
  }

  .list-title {
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--text-dim);
  }

  .new-btn {
    width: 22px;
    height: 22px;
    border-radius: 5px;
    border: 1px solid var(--border);
    background: transparent;
    color: var(--text-muted);
    font-size: 16px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: color 0.15s, border-color 0.15s;
  }

  .new-btn:hover { color: var(--accent); border-color: var(--accent); }

  .new-shadow-form {
    padding: 10px 10px 6px;
    display: flex;
    flex-direction: column;
    gap: 6px;
    border-bottom: 1px solid var(--border);
  }

  .new-shadow-input {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 6px;
    color: var(--text);
    font-size: 12px;
    padding: 6px 8px;
    outline: none;
    width: 100%;
  }

  .new-shadow-input:focus { border-color: var(--accent); }

  .new-shadow-actions {
    display: flex;
    gap: 6px;
  }

  .btn-create {
    flex: 1;
    padding: 4px 0;
    background: var(--accent);
    border: none;
    border-radius: 5px;
    color: #000;
    font-size: 11px;
    font-weight: 700;
    cursor: pointer;
    transition: opacity 0.15s;
  }

  .btn-create:disabled { opacity: 0.3; cursor: not-allowed; }
  .btn-create:not(:disabled):hover { opacity: 0.85; }

  .btn-cancel {
    flex: 1;
    padding: 4px 0;
    background: transparent;
    border: 1px solid var(--border);
    border-radius: 5px;
    color: var(--text-muted);
    font-size: 11px;
    cursor: pointer;
    transition: border-color 0.15s;
  }

  .btn-cancel:hover { border-color: var(--border-hover); }

  .list-empty {
    padding: 16px 12px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .list-empty p { font-size: 12px; color: var(--text-dim); margin: 0; line-height: 1.5; }

  .link-btn {
    background: none;
    border: none;
    color: var(--accent);
    font-size: 11px;
    cursor: pointer;
    padding: 0;
    text-align: left;
    opacity: 0.8;
    transition: opacity 0.15s;
  }

  .link-btn:hover { opacity: 1; }

  .shadow-items {
    flex: 1;
    overflow-y: auto;
    list-style: none;
    padding: 6px;
    margin: 0;
  }

  .shadow-item {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    padding: 6px 8px;
    border: none;
    border-radius: 6px;
    background: transparent;
    color: var(--text-muted);
    font-size: 12px;
    text-align: left;
    cursor: pointer;
    transition: background 0.1s, color 0.1s;
  }

  .shadow-item:hover { background: var(--surface-hover); color: var(--text); }
  .shadow-item.active { background: var(--surface-hover); color: var(--text); }

  .shadow-item.drag-target {
    background: color-mix(in srgb, var(--oberon) 15%, var(--surface-hover));
    border: 1px solid var(--oberon);
    color: var(--text);
  }

  .shadow-swatch {
    width: 10px;
    height: 10px;
    border-radius: 3px;
    flex-shrink: 0;
  }

  .shadow-item-name {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .shadow-count {
    font-size: 10px;
    color: var(--text-dim);
    flex-shrink: 0;
  }

  /* ── Right detail ──────────────────────────────────────────────── */
  .shadow-detail {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow-y: auto;
    min-width: 0;
  }

  .shadow-cover {
    height: 120px;
    flex-shrink: 0;
    position: relative;
    display: flex;
    align-items: flex-end;
    padding: 10px 20px;
  }

  .cover-edit-btn {
    background: rgba(0, 0, 0, 0.45);
    border: 1px solid rgba(255, 255, 255, 0.15);
    border-radius: 6px;
    color: rgba(255, 255, 255, 0.7);
    font-size: 10px;
    padding: 3px 10px;
    cursor: pointer;
    opacity: 0;
    transition: opacity 0.15s;
  }

  .shadow-cover:hover .cover-edit-btn { opacity: 1; }

  .cover-editor {
    padding: 10px 20px;
    display: flex;
    flex-direction: column;
    gap: 6px;
    border-bottom: 1px solid var(--border);
    background: var(--surface);
  }

  .cover-input {
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: 6px;
    color: var(--text);
    font-size: 12px;
    font-family: var(--font-mono);
    padding: 6px 10px;
    outline: none;
    width: 100%;
  }

  .cover-input:focus { border-color: var(--accent); }

  .cover-actions {
    display: flex;
    gap: 6px;
  }

  .btn-remove {
    padding: 4px 10px;
    background: transparent;
    border: 1px solid color-mix(in srgb, #ef4444 40%, transparent);
    border-radius: 5px;
    color: #fca5a5;
    font-size: 11px;
    cursor: pointer;
    transition: background 0.15s;
  }

  .btn-remove:hover { background: color-mix(in srgb, #ef4444 12%, transparent); }

  .shadow-meta {
    padding: 20px 24px 12px;
    border-bottom: 1px solid var(--border);
    flex-shrink: 0;
  }

  .shadow-name-row,
  .shadow-desc-row {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 6px;
  }

  .shadow-name {
    margin: 0;
    font-size: 22px;
    font-weight: 700;
    color: var(--text);
    flex: 1;
  }

  .inline-edit-btn {
    background: none;
    border: none;
    color: var(--text-dim);
    font-size: 12px;
    cursor: pointer;
    padding: 2px 4px;
    opacity: 0;
    transition: opacity 0.15s, color 0.15s;
    flex-shrink: 0;
    border-radius: 4px;
  }

  .shadow-name-row:hover .inline-edit-btn,
  .shadow-desc-row:hover .inline-edit-btn { opacity: 1; }
  .inline-edit-btn:hover { color: var(--accent); }

  .name-input {
    width: 100%;
    background: var(--surface);
    border: 1px solid var(--accent);
    border-radius: 6px;
    color: var(--text);
    font-size: 20px;
    font-weight: 700;
    padding: 4px 8px;
    outline: none;
    margin-bottom: 6px;
  }

  .shadow-desc {
    margin: 0;
    font-size: 13px;
    color: var(--text-muted);
    line-height: 1.6;
    flex: 1;
  }

  .shadow-desc.empty { color: var(--text-dim); font-style: italic; }

  .desc-input {
    width: 100%;
    background: var(--surface);
    border: 1px solid var(--accent);
    border-radius: 6px;
    color: var(--text);
    font-size: 13px;
    padding: 6px 8px;
    outline: none;
    resize: none;
    font-family: var(--font-sans);
    line-height: 1.5;
  }

  /* ── Sections ──────────────────────────────────────────────────── */
  .section {
    padding: 16px 24px;
    border-bottom: 1px solid var(--border);
  }

  .section-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 10px;
  }

  .section-title {
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--text-dim);
  }

  .section-hint {
    font-size: 10px;
    color: var(--text-dim);
    opacity: 0.6;
  }

  .section-empty {
    font-size: 12px;
    color: var(--text-dim);
    margin: 0;
    line-height: 1.6;
    font-style: italic;
  }

  .new-inscription-btn {
    background: transparent;
    border: 1px solid var(--border);
    border-radius: 5px;
    color: var(--text-muted);
    font-size: 11px;
    padding: 2px 8px;
    cursor: pointer;
    transition: color 0.15s, border-color 0.15s;
  }

  .new-inscription-btn:hover { color: var(--accent); border-color: var(--accent); }
  .new-inscription-btn:disabled { opacity: 0.3; cursor: not-allowed; }

  .inscription-chips {
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 4px;
    margin: 0;
    padding: 0;
  }

  .inscription-chip {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 10px;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 7px;
    font-size: 12px;
    color: var(--text-muted);
    cursor: grab;
    transition: border-color 0.1s, color 0.1s;
  }

  .inscription-chip:hover { border-color: var(--border-hover); color: var(--text); }

  .dim .inscription-chip { opacity: 0.6; }
  .dim .inscription-chip.assigned { opacity: 1; color: var(--accent); border-color: color-mix(in srgb, var(--accent) 30%, transparent); }

  .chip-icon { font-size: 10px; color: var(--text-dim); flex-shrink: 0; }
  .chip-title { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

  .chip-remove {
    background: none;
    border: none;
    color: var(--text-dim);
    font-size: 10px;
    cursor: pointer;
    padding: 0;
    line-height: 1;
    opacity: 0;
    transition: opacity 0.15s, color 0.15s;
    flex-shrink: 0;
  }

  .inscription-chip:hover .chip-remove { opacity: 1; }
  .chip-remove:hover { color: #fca5a5; }

  .chip-toggle {
    background: none;
    border: 1px solid var(--border);
    border-radius: 4px;
    color: var(--text-dim);
    font-size: 10px;
    width: 18px;
    height: 18px;
    cursor: pointer;
    padding: 0;
    line-height: 1;
    flex-shrink: 0;
    transition: all 0.1s;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .inscription-chip.assigned .chip-toggle {
    border-color: var(--accent);
    color: var(--accent);
  }

  /* ── No selection / danger ─────────────────────────────────────── */
  .no-selection {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 12px;
    padding: 40px;
    text-align: center;
  }

  .no-selection-icon { font-size: 48px; color: var(--oberon); opacity: 0.3; }

  .no-selection p { margin: 0; font-size: 13px; color: var(--text-muted); }

  .danger-zone {
    padding: 16px 24px 24px;
    margin-top: auto;
  }

  .delete-shadow-btn {
    background: transparent;
    border: 1px solid color-mix(in srgb, #ef4444 35%, transparent);
    border-radius: 6px;
    color: color-mix(in srgb, #ef4444 70%, var(--text-muted));
    font-size: 11px;
    padding: 5px 14px;
    cursor: pointer;
    transition: background 0.15s, border-color 0.15s;
  }

  .delete-shadow-btn:hover {
    background: color-mix(in srgb, #ef4444 10%, transparent);
    border-color: #ef4444;
  }
</style>
