<script lang="ts">
  import { onMount } from "svelte";
  import { page } from "$app/stores";
  import { goto } from "$app/navigation";
  import { shadowsStore } from "$lib/stores/shadows.svelte";
  import { vault } from "$lib/stores/vault.svelte";
  import { settings } from "$lib/stores/settings.svelte";
  import Editor from "$lib/components/Editor.svelte";
  import ResizeHandle from "$lib/components/ResizeHandle.svelte";
  import { layoutStore } from "$lib/stores/layout.svelte";

  const LS_RAIL = "knowledge_rail_w";
  const LS_PANEL = "knowledge_panel_w";
  let railWidth = $state(parseInt(typeof localStorage !== "undefined" ? localStorage.getItem(LS_RAIL) ?? "250" : "250"));
  let panelWidth = $state(parseInt(typeof localStorage !== "undefined" ? localStorage.getItem(LS_PANEL) ?? "220" : "220"));
  $effect(() => localStorage.setItem(LS_RAIL, String(railWidth)));
  $effect(() => localStorage.setItem(LS_PANEL, String(panelWidth)));

  let selectedShadowId = $state<string | null>(null);
  let creatingNew = $state(false);
  let newShadowName = $state("");

  const selectedShadow = $derived(
    selectedShadowId
      ? (shadowsStore.shadows.find((s) => s.id === selectedShadowId) ?? null)
      : null
  );

  const shadowInscriptions = $derived(
    selectedShadowId
      ? vault.inscriptions.filter((i) =>
          shadowsStore.getInscriptionPaths(selectedShadowId!).includes(i.path)
        )
      : []
  );

  onMount(async () => {
    shadowsStore.load();
    if (settings.vaultPath) await vault.loadInscriptions();

    const s = $page.url.searchParams.get("s");
    if (s && shadowsStore.shadows.some((sh) => sh.id === s)) {
      selectedShadowId = s;
    } else if (shadowsStore.shadows.length > 0) {
      const first = shadowsStore.shadows[0].id;
      selectedShadowId = first;
      goto(`/knowledge?s=${first}`, { replaceState: true });
    }
  });

  // Auto-open first inscription when switching shadows
  $effect(() => {
    if (
      shadowInscriptions.length > 0 &&
      (!vault.currentInscription ||
        !shadowInscriptions.some((i) => i.path === vault.currentInscription?.path))
    ) {
      vault.openInscription(shadowInscriptions[0]);
    }
  });

  function selectShadow(id: string) {
    selectedShadowId = id;
    goto(`/knowledge?s=${id}`, { replaceState: true });
  }

  function submitNewShadow() {
    const name = newShadowName.trim();
    if (!name) return;
    const shadow = shadowsStore.createShadow(name);
    newShadowName = "";
    creatingNew = false;
    selectShadow(shadow.id);
  }

  async function handleSave(markdown: string) {
    await vault.saveCurrentInscription(markdown);
  }
</script>

<div class="knowledge-layout">

  <!-- Left rail: shadow list + knowledge links -->
  <div class="rail" style="width: {railWidth}px">
    <div class="rail-header">
      <span class="rail-title">Shadows</span>
      <button class="new-shadow-btn" onclick={() => (creatingNew = true)}>+ New</button>
    </div>

    {#if creatingNew}
      <form
        class="new-form"
        onsubmit={(e) => { e.preventDefault(); submitNewShadow(); }}
      >
        <input
          class="new-input"
          bind:value={newShadowName}
          placeholder="Shadow name…"
          autofocus
          onkeydown={(e) => {
            if (e.key === "Escape") { creatingNew = false; newShadowName = ""; }
          }}
        />
      </form>
    {/if}

    <div class="shadow-list">
      {#each shadowsStore.shadows as shadow (shadow.id)}
        {@const count = shadowsStore.getInscriptionPaths(shadow.id).length}
        <button
          class="shadow-row"
          class:active={selectedShadowId === shadow.id}
          onclick={() => selectShadow(shadow.id)}
        >
          <span class="shadow-icon">◑</span>
          <span class="shadow-name">{shadow.name}</span>
          {#if count > 0}
            <span class="shadow-count">{count}</span>
          {/if}
        </button>
      {/each}

      {#if shadowsStore.shadows.length === 0 && !creatingNew}
        <p class="empty-msg">No shadows yet.</p>
      {/if}
    </div>

    <div class="rail-divider"></div>

    <div class="flat-links">
      {#each [
        { label: "Chronicles", icon: "◫", href: "/chronicles" },
        { label: "Artifacts",  icon: "◧", href: "/artifacts" },
        { label: "The Logrus", icon: "⊗", href: "/logrus" },
        { label: "Inscriptions", icon: "◻", href: "/inscriptions" },
      ] as link}
        <button class="flat-link" onclick={() => goto(link.href)}>
          <span class="flat-icon">{link.icon}</span>
          <span>{link.label}</span>
        </button>
      {/each}
    </div>
  </div>

  <ResizeHandle onDelta={(d) => { railWidth = Math.max(160, Math.min(480, railWidth + d)); }} />

  <!-- Right area: inscription list + editor -->
  {#if !selectedShadow}
    <div class="no-selection">
      <div class="no-selection-icon">◑</div>
      <p>Select a shadow to explore its inscriptions</p>
      {#if shadowsStore.shadows.length === 0}
        <button class="cta-btn" onclick={() => (creatingNew = true)}>
          Create your first shadow →
        </button>
      {/if}
    </div>
  {:else}
    <!-- Inscription panel -->
    <div class="inscription-panel" style="width: {panelWidth}px">
      <div class="panel-header">
        <span class="panel-icon">◑</span>
        <span class="panel-title">{selectedShadow.name}</span>
      </div>

      <ul class="inscription-list">
        {#if shadowInscriptions.length === 0}
          <li class="list-empty">No inscriptions in this shadow.</li>
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
            </li>
          {/each}
        {/if}
      </ul>
    </div>

    <ResizeHandle onDelta={(d) => { panelWidth = Math.max(160, Math.min(480, panelWidth + d)); }} />

    <!-- Editor -->
    <div class="editor-area">
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
            chatOpen={layoutStore.oberonOpen}
            onToggleChat={() => layoutStore.toggleOberon()}
          />
        {/key}
      {:else}
        <div class="no-content">
          <div class="no-content-icon">◻</div>
          <p>Select an inscription from the panel to begin</p>
        </div>
      {/if}
    </div>
  {/if}

</div>

<style>
  .knowledge-layout {
    flex: 1;
    display: flex;
    min-height: 0;
    overflow: hidden;
  }

  /* ── Left rail ── */
  .rail {
    min-width: 160px;
    border-right: none;
    display: flex;
    flex-direction: column;
    background: var(--sidebar-bg);
    overflow: hidden;
  }

  .rail-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 14px 14px 10px;
    border-bottom: 1px solid var(--border);
    flex-shrink: 0;
  }

  .rail-title {
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--text-dim);
  }

  .new-shadow-btn {
    font-size: 11px;
    padding: 3px 8px;
    border: 1px solid var(--border);
    border-radius: 5px;
    background: transparent;
    color: var(--text-muted);
    cursor: pointer;
    transition: color 0.15s, border-color 0.15s;
  }

  .new-shadow-btn:hover { color: var(--accent); border-color: var(--accent); }

  .new-form {
    padding: 8px 10px;
    flex-shrink: 0;
    border-bottom: 1px solid var(--border);
  }

  .new-input {
    width: 100%;
    box-sizing: border-box;
    background: var(--surface);
    border: 1px solid var(--accent);
    border-radius: 6px;
    color: var(--text);
    font-size: 12px;
    padding: 6px 10px;
    outline: none;
  }

  .shadow-list {
    flex: 1;
    overflow-y: auto;
    padding: 6px;
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-height: 0;
  }

  .shadow-row {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    padding: 8px 10px;
    border: none;
    border-radius: 6px;
    background: transparent;
    color: var(--text-muted);
    font-size: 13px;
    cursor: pointer;
    text-align: left;
    transition: background 0.15s, color 0.15s;
  }

  .shadow-row:hover { background: var(--surface-hover); color: var(--text); }

  .shadow-row.active {
    background: var(--surface-hover);
    color: var(--accent);
  }

  .shadow-icon {
    font-size: 13px;
    flex-shrink: 0;
  }

  .shadow-name {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .shadow-count {
    font-size: 10px;
    font-weight: 700;
    padding: 1px 6px;
    border-radius: 10px;
    background: color-mix(in srgb, var(--oberon) 20%, transparent);
    color: var(--oberon);
    flex-shrink: 0;
  }

  .empty-msg {
    font-size: 12px;
    color: var(--text-dim);
    padding: 10px 10px;
    margin: 0;
  }

  .rail-divider {
    height: 1px;
    background: var(--border);
    flex-shrink: 0;
  }

  .flat-links {
    padding: 6px;
    display: flex;
    flex-direction: column;
    gap: 2px;
    flex-shrink: 0;
  }

  .flat-link {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    padding: 6px 10px;
    border: none;
    border-radius: 6px;
    background: transparent;
    color: var(--text-muted);
    font-size: 12px;
    cursor: pointer;
    text-align: left;
    transition: background 0.15s, color 0.15s;
  }

  .flat-link:hover { background: var(--surface-hover); color: var(--text); }

  .flat-icon {
    font-size: 12px;
    width: 16px;
    text-align: center;
  }

  /* ── No selection ── */
  .no-selection {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 12px;
    text-align: center;
    padding: 40px;
  }

  .no-selection-icon {
    font-size: 52px;
    color: var(--oberon);
    opacity: 0.2;
  }

  .no-selection p {
    margin: 0;
    font-size: 13px;
    color: var(--text-muted);
    max-width: 220px;
    line-height: 1.6;
  }

  .cta-btn {
    padding: 7px 18px;
    background: var(--accent);
    border: none;
    border-radius: 8px;
    color: #000;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    transition: opacity 0.15s;
  }

  .cta-btn:hover { opacity: 0.9; }

  /* ── Inscription panel ── */
  .inscription-panel {
    min-width: 160px;
    border-right: none;
    display: flex;
    flex-direction: column;
    background: var(--sidebar-bg);
    overflow: hidden;
  }

  .panel-header {
    display: flex;
    align-items: center;
    gap: 7px;
    padding: 10px 12px;
    border-bottom: 1px solid var(--border);
    flex-shrink: 0;
  }

  .panel-icon {
    font-size: 12px;
    color: var(--oberon);
    opacity: 0.7;
  }

  .panel-title {
    font-size: 12px;
    font-weight: 600;
    color: var(--text-muted);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .inscription-list {
    flex: 1;
    overflow-y: auto;
    list-style: none;
    padding: 6px;
    margin: 0;
  }

  .list-empty {
    padding: 16px 10px;
    font-size: 12px;
    color: var(--text-dim);
    text-align: center;
  }

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
    padding: 6px 8px;
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

  /* ── Editor area ── */
  .editor-area {
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
</style>
