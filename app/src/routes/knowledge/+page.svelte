<script lang="ts">
  import { onMount } from "svelte";
  import { page } from "$app/stores";
  import { goto } from "$app/navigation";
  import { shadowsStore } from "$lib/stores/shadows.svelte";
  import { vault } from "$lib/stores/vault.svelte";
  import { chronicles } from "$lib/stores/chronicles.svelte";
  import { settings } from "$lib/stores/settings.svelte";
  import { artifactsStore } from "$lib/stores/artifacts.svelte";
  import { artifactTypeIcon } from "$lib/artifacts";
  import Editor from "$lib/components/Editor.svelte";
  import ResizeHandle from "$lib/components/ResizeHandle.svelte";
  import ContextMenu from "$lib/components/ContextMenu.svelte";
  import type { MenuEntry } from "$lib/components/ContextMenu.svelte";
  import type { InscriptionFile } from "$lib/vault";
  import { layoutStore } from "$lib/stores/layout.svelte";

  type Tab = "shadows" | "inscriptions" | "chronicles";

  const LS_TAB = "knowledge_tab";
  const LS_RAIL = "knowledge_rail_w";
  const LS_PANEL = "knowledge_panel_w";

  let tab = $state<Tab>((typeof localStorage !== "undefined" ? localStorage.getItem(LS_TAB) as Tab : null) ?? "shadows");
  let railWidth = $state(parseInt(typeof localStorage !== "undefined" ? localStorage.getItem(LS_RAIL) ?? "220" : "220"));
  let panelWidth = $state(parseInt(typeof localStorage !== "undefined" ? localStorage.getItem(LS_PANEL) ?? "200" : "200"));

  $effect(() => localStorage.setItem(LS_TAB, tab));
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

  const linkedArtifacts = $derived(
    vault.currentInscription
      ? artifactsStore.forInscription(vault.currentInscription.path)
      : []
  );

  onMount(async () => {
    shadowsStore.load();
    if (settings.vaultPath) {
      await vault.loadInscriptions();
      await chronicles.init();
    }

    const s = $page.url.searchParams.get("s");
    const t = $page.url.searchParams.get("tab") as Tab | null;
    if (t && ["shadows", "inscriptions", "chronicles"].includes(t)) {
      tab = t;
    }
    if (s && shadowsStore.shadows.some((sh) => sh.id === s)) {
      selectedShadowId = s;
      tab = "shadows";
    } else if (shadowsStore.shadows.length > 0 && !selectedShadowId) {
      selectedShadowId = shadowsStore.shadows[0].id;
    }
  });

  $effect(() => {
    if (
      tab === "shadows" &&
      shadowInscriptions.length > 0 &&
      (!vault.currentInscription ||
        !shadowInscriptions.some((i) => i.path === vault.currentInscription?.path))
    ) {
      vault.openInscription(shadowInscriptions[0]);
    }
  });

  function selectTab(t: Tab) {
    tab = t;
    goto(`/knowledge?tab=${t}`, { replaceState: true });
  }

  function selectShadow(id: string) {
    selectedShadowId = id;
    goto(`/knowledge?tab=shadows&s=${id}`, { replaceState: true });
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

  let contextMenu = $state<{ x: number; y: number; inscription: InscriptionFile; shadowId?: string } | null>(null);

  function onInscriptionContextMenu(e: MouseEvent, inscription: InscriptionFile, shadowId?: string) {
    e.preventDefault();
    e.stopPropagation();
    contextMenu = { x: e.clientX, y: e.clientY, inscription, shadowId };
  }

  function inscriptionMenuItems(inscription: InscriptionFile, shadowId?: string): MenuEntry[] {
    const items: MenuEntry[] = [];
    if (shadowId) {
      items.push({
        label: "Remove from Shadow",
        action: () => shadowsStore.unassign(shadowId, inscription.path),
      });
      items.push({ separator: true });
    }
    items.push({
      label: "Delete Inscription",
      danger: true,
      action: () => {
        if (confirm(`Delete "${inscription.title}"? This cannot be undone.`)) {
          vault.removeInscription(inscription.path);
        }
      },
    });
    return items;
  }

  function formatDateLabel(dateStr: string): string {
    if (dateStr === chronicles.todayStr) return "Today";
    const d = new Date(dateStr + "T12:00:00");
    return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  }
</script>

<div class="knowledge-layout">

  <!-- Tab strip -->
  <div class="tab-strip">
    <button
      class="tab-btn"
      class:active={tab === "shadows"}
      onclick={() => selectTab("shadows")}
    >
      <span class="tab-icon">◑</span> Shadows
    </button>
    <button
      class="tab-btn"
      class:active={tab === "inscriptions"}
      onclick={() => selectTab("inscriptions")}
    >
      <span class="tab-icon">◻</span> Inscriptions
    </button>
    <button
      class="tab-btn"
      class:active={tab === "chronicles"}
      onclick={() => selectTab("chronicles")}
    >
      <span class="tab-icon">◫</span> Chronicles
    </button>
  </div>

  <div class="knowledge-body">

    {#if tab === "shadows"}
      <!-- Left rail: shadow list -->
      <div class="rail" style="width: {railWidth}px">
        <div class="rail-header">
          <span class="rail-title">Shadows</span>
          <button class="rail-add-btn" onclick={() => (creatingNew = true)}>+ New</button>
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
              <span class="row-icon">◑</span>
              <span class="row-name">{shadow.name}</span>
              {#if count > 0}
                <span class="row-count">{count}</span>
              {/if}
            </button>
          {/each}

          {#if shadowsStore.shadows.length === 0 && !creatingNew}
            <p class="empty-msg">No shadows yet.</p>
          {/if}
        </div>
      </div>

      <ResizeHandle onDelta={(d) => { railWidth = Math.max(140, Math.min(400, railWidth + d)); }} />

      {#if !selectedShadow}
        <div class="no-selection">
          <div class="no-sel-icon">◑</div>
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
            <button
              class="panel-add-btn"
              onclick={async () => {
                if (!settings.vaultPath) return;
                await vault.newInscription();
                if (vault.currentInscription) {
                  shadowsStore.assign(selectedShadowId!, vault.currentInscription.path);
                }
              }}
              disabled={!settings.vaultPath}
              title="New inscription"
            >+</button>
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
                    oncontextmenu={(e) => onInscriptionContextMenu(e, inscription, selectedShadowId ?? undefined)}
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

        <ResizeHandle onDelta={(d) => { panelWidth = Math.max(140, Math.min(400, panelWidth + d)); }} />

        <!-- Editor -->
        <div class="editor-area">
          {#if !settings.vaultPath}
            <div class="no-content">
              <div class="no-content-icon">◻</div>
              <p>Configure your vault in Settings to start writing.</p>
            </div>
          {:else if vault.currentInscription && shadowInscriptions.some((i) => i.path === vault.currentInscription?.path)}
            {#key vault.openEpoch}
              <Editor
                content={vault.currentContent}
                onSave={handleSave}
                onDirty={() => vault.markDirty()}
                saving={vault.isSaving}
                chatOpen={layoutStore.oberonOpen}
                onToggleChat={() => layoutStore.toggleOberon()}
              />
            {/key}
            {#if linkedArtifacts.length > 0}
              <div class="artifacts-strip">
                <span class="artifacts-label">Artifacts</span>
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
              </div>
            {/if}
          {:else}
            <div class="no-content">
              <div class="no-content-icon">◻</div>
              <p>Select an inscription to begin</p>
            </div>
          {/if}
        </div>
      {/if}

    {:else if tab === "inscriptions"}
      <!-- Inscriptions: list + editor -->
      <div class="rail" style="width: {railWidth}px">
        <div class="rail-header">
          <span class="rail-title">Inscriptions</span>
          <button
            class="rail-add-btn"
            onclick={() => vault.newInscription()}
            disabled={!settings.vaultPath}
            title="New inscription"
          >+</button>
        </div>
        <div class="inscription-flat-list">
          {#if !settings.vaultPath}
            <p class="empty-msg">Set your vault path in Settings.</p>
          {:else if vault.isLoading && vault.inscriptions.length === 0}
            <p class="empty-msg">Loading…</p>
          {:else if vault.inscriptions.length === 0}
            <p class="empty-msg">No inscriptions yet.</p>
          {:else}
            {#each vault.inscriptions as inscription (inscription.path)}
              <button
                class="shadow-row"
                class:active={vault.currentInscription?.path === inscription.path}
                onclick={() => vault.openInscription(inscription)}
                oncontextmenu={(e) => onInscriptionContextMenu(e, inscription)}
              >
                <span class="row-icon">◻</span>
                <span class="row-name">{inscription.title}</span>
                {#if vault.currentInscription?.path === inscription.path && vault.isDirty}
                  <span class="dirty-dot-sm"></span>
                {/if}
              </button>
            {/each}
          {/if}
        </div>
      </div>

      <ResizeHandle onDelta={(d) => { railWidth = Math.max(140, Math.min(400, railWidth + d)); }} />

      <div class="editor-area">
        {#if !settings.vaultPath}
          <div class="no-content">
            <div class="no-content-icon">◻</div>
            <p>Configure your vault in Settings to start writing.</p>
          </div>
        {:else if vault.currentInscription}
          {#key vault.openEpoch}
            <Editor
              content={vault.currentContent}
              onSave={handleSave}
              onDirty={() => vault.markDirty()}
              saving={vault.isSaving}
              chatOpen={layoutStore.oberonOpen}
              onToggleChat={() => layoutStore.toggleOberon()}
            />
          {/key}
          {#if linkedArtifacts.length > 0}
            <div class="artifacts-strip">
              <span class="artifacts-label">Artifacts</span>
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
            </div>
          {/if}
        {:else}
          <div class="no-content">
            <div class="no-content-icon">◻</div>
            <p>Select an inscription to begin</p>
          </div>
        {/if}
      </div>

    {:else}
      <!-- Chronicles: date list + editor -->
      <div class="rail" style="width: {railWidth}px">
        <div class="rail-header">
          <span class="rail-title">Chronicles</span>
        </div>
        <div class="inscription-flat-list">
          {#if !settings.vaultPath}
            <p class="empty-msg">Set your vault path in Settings.</p>
          {:else if chronicles.entries.length === 0}
            <p class="empty-msg">Loading…</p>
          {:else}
            {#each chronicles.entries as entry (entry.dateStr)}
              <button
                class="shadow-row"
                class:active={chronicles.activeDate === entry.dateStr}
                class:today={entry.dateStr === chronicles.todayStr}
                onclick={() => chronicles.loadEntry(entry.dateStr)}
              >
                <span class="row-icon">◫</span>
                <span class="row-name">{formatDateLabel(entry.dateStr)}</span>
                {#if chronicles.activeDate === entry.dateStr && chronicles.isDirty}
                  <span class="dirty-dot-sm"></span>
                {/if}
              </button>
            {/each}
          {/if}
        </div>
      </div>

      <ResizeHandle onDelta={(d) => { railWidth = Math.max(140, Math.min(400, railWidth + d)); }} />

      <div class="editor-area">
        {#if !settings.vaultPath}
          <div class="no-content">
            <div class="no-content-icon">◫</div>
            <p>Configure your vault in Settings.</p>
          </div>
        {:else if chronicles.isLoading}
          <div class="loading">Loading…</div>
        {:else}
          <div class="entry-heading">
            <span class="entry-date">{formatDateLabel(chronicles.activeDate)}</span>
            {#if chronicles.activeDate === chronicles.todayStr}
              <span class="today-badge">Today</span>
            {/if}
          </div>
          {#key chronicles.activeDate}
            <Editor
              content={chronicles.content}
              onSave={(md) => chronicles.save(md)}
              onDirty={() => chronicles.markDirty()}
              saving={chronicles.isSaving}
              chatOpen={layoutStore.oberonOpen}
              onToggleChat={() => layoutStore.toggleOberon()}
            />
          {/key}
        {/if}
      </div>
    {/if}

  </div>
</div>

{#if contextMenu}
  <ContextMenu
    x={contextMenu.x}
    y={contextMenu.y}
    items={inscriptionMenuItems(contextMenu.inscription, contextMenu.shadowId)}
    onClose={() => (contextMenu = null)}
  />
{/if}

<style>
  .knowledge-layout {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-height: 0;
    overflow: hidden;
  }

  /* ── Tab strip ── */
  .tab-strip {
    display: flex;
    align-items: center;
    gap: 2px;
    padding: 8px 12px 0;
    border-bottom: 1px solid var(--border);
    flex-shrink: 0;
    background: var(--sidebar-bg);
  }

  .tab-btn {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 7px 14px;
    border: none;
    border-bottom: 2px solid transparent;
    margin-bottom: -1px;
    background: transparent;
    color: var(--text-muted);
    font-size: 12px;
    font-weight: 500;
    cursor: pointer;
    border-radius: 6px 6px 0 0;
    transition: color 0.15s, border-color 0.15s;
  }

  .tab-btn:hover { color: var(--text); }

  .tab-btn.active {
    color: var(--accent);
    border-bottom-color: var(--accent);
  }

  .tab-icon { font-size: 12px; }

  /* ── Body (content below tabs) ── */
  .knowledge-body {
    flex: 1;
    display: flex;
    min-height: 0;
    overflow: hidden;
  }

  /* ── Left rail ── */
  .rail {
    min-width: 140px;
    display: flex;
    flex-direction: column;
    background: var(--sidebar-bg);
    border-right: 1px solid var(--border);
    overflow: hidden;
    flex-shrink: 0;
  }

  .rail-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 12px 8px;
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

  .rail-add-btn {
    font-size: 11px;
    padding: 2px 7px;
    border: 1px solid var(--border);
    border-radius: 4px;
    background: transparent;
    color: var(--text-muted);
    cursor: pointer;
    transition: color 0.15s, border-color 0.15s;
  }

  .rail-add-btn:hover { color: var(--accent); border-color: var(--accent); }
  .rail-add-btn:disabled { opacity: 0.3; cursor: not-allowed; }

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

  .shadow-list,
  .inscription-flat-list {
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
    gap: 7px;
    width: 100%;
    padding: 7px 8px;
    border: none;
    border-radius: 6px;
    background: transparent;
    color: var(--text-muted);
    font-size: 12px;
    cursor: pointer;
    text-align: left;
    transition: background 0.15s, color 0.15s;
    min-width: 0;
  }

  .shadow-row:hover { background: var(--surface-hover); color: var(--text); }
  .shadow-row.active { background: var(--surface-hover); color: var(--accent); }
  .shadow-row.today .row-name { color: var(--accent); font-weight: 600; }

  .row-icon { font-size: 12px; flex-shrink: 0; color: var(--text-dim); }
  .shadow-row.active .row-icon { color: var(--accent); }

  .row-name {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .row-count {
    font-size: 10px;
    font-weight: 700;
    padding: 1px 5px;
    border-radius: 8px;
    background: color-mix(in srgb, var(--oberon) 20%, transparent);
    color: var(--oberon);
    flex-shrink: 0;
  }

  .dirty-dot-sm {
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: var(--accent);
    flex-shrink: 0;
  }

  .empty-msg {
    font-size: 12px;
    color: var(--text-dim);
    padding: 10px;
    margin: 0;
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

  .no-sel-icon { font-size: 48px; color: var(--oberon); opacity: 0.2; }

  .no-selection p { margin: 0; font-size: 13px; color: var(--text-muted); max-width: 200px; line-height: 1.6; }

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

  /* ── Inscription panel (shadows tab) ── */
  .inscription-panel {
    min-width: 140px;
    display: flex;
    flex-direction: column;
    background: var(--sidebar-bg);
    border-right: 1px solid var(--border);
    overflow: hidden;
    flex-shrink: 0;
  }

  .panel-header {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 10px 10px 8px;
    border-bottom: 1px solid var(--border);
    flex-shrink: 0;
  }

  .panel-icon { font-size: 12px; color: var(--oberon); opacity: 0.7; }

  .panel-title {
    font-size: 12px;
    font-weight: 600;
    color: var(--text-muted);
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .panel-add-btn {
    width: 22px;
    height: 22px;
    border-radius: 4px;
    border: 1px solid var(--border);
    background: transparent;
    color: var(--text-muted);
    font-size: 14px;
    line-height: 1;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: color 0.15s, border-color 0.15s;
  }

  .panel-add-btn:hover { color: var(--accent); border-color: var(--accent); }
  .panel-add-btn:disabled { opacity: 0.3; cursor: not-allowed; }

  .inscription-list {
    flex: 1;
    overflow-y: auto;
    list-style: none;
    padding: 6px;
    margin: 0;
  }

  .list-empty { padding: 12px 8px; font-size: 12px; color: var(--text-dim); text-align: center; }

  .inscription-item {
    display: flex;
    align-items: center;
    border-radius: 5px;
    overflow: hidden;
    transition: background 0.1s;
  }

  .inscription-item:hover { background: var(--surface-hover); }
  .inscription-item.active { background: var(--surface-hover); }

  .inscription-select {
    flex: 1;
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 5px 8px;
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
  .inscription-item.active .inscription-select { color: var(--accent); }

  .item-icon { font-size: 10px; color: var(--text-dim); flex-shrink: 0; }
  .inscription-item.active .item-icon { color: var(--accent); }

  .item-title { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

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

  .no-content-icon { font-size: 36px; color: var(--text-dim); opacity: 0.4; }

  .no-content p { margin: 0; font-size: 13px; color: var(--text-muted); max-width: 220px; line-height: 1.6; }

  /* ── Chronicles ── */
  .entry-heading {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 12px 24px 0;
    flex-shrink: 0;
  }

  .entry-date { font-size: 18px; font-weight: 700; color: var(--text); }

  .today-badge {
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--accent);
    background: color-mix(in srgb, var(--accent) 12%, transparent);
    padding: 2px 8px;
    border-radius: 10px;
  }

  .loading { padding: 20px 24px; font-size: 13px; color: var(--text-dim); }

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

  .artifacts-label {
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
</style>
