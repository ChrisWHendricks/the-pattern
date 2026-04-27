<script lang="ts">
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";
  import { shadowsStore } from "$lib/stores/shadows.svelte";
  import { vault } from "$lib/stores/vault.svelte";
  import { settings } from "$lib/stores/settings.svelte";
  import { resolveCoverStyle } from "$lib/shadows";
  import type { Shadow } from "$lib/shadows";

  let creatingNew = $state(false);
  let newShadowName = $state("");
  let nameInputEl = $state<HTMLInputElement | null>(null);

  onMount(async () => {
    shadowsStore.load();
    if (settings.vaultPath) {
      await vault.loadInscriptions();
    }
  });

  function submitNewShadow() {
    const name = newShadowName.trim();
    if (!name) return;
    const shadow = shadowsStore.createShadow(name);
    newShadowName = "";
    creatingNew = false;
    goto(`/shadows/${shadow.id}`);
  }

  function coverStyle(shadow: Shadow): string {
    return resolveCoverStyle(shadow, settings.vaultPath ?? "");
  }
</script>

<div class="dashboard">
  <div class="dashboard-header">
    <div class="header-text">
      <h1 class="title">The Shadows</h1>
      <p class="subtitle">
        {shadowsStore.shadows.length} shadow{shadowsStore.shadows.length !== 1 ? "s" : ""} charted
      </p>
    </div>
    <button class="new-shadow-btn" onclick={() => { creatingNew = true; }}>
      + New Shadow
    </button>
  </div>

  {#if creatingNew}
    <div class="new-shadow-bar">
      <form
        class="new-shadow-form"
        onsubmit={(e) => { e.preventDefault(); submitNewShadow(); }}
      >
        <input
          class="new-shadow-input"
          bind:value={newShadowName}
          bind:this={nameInputEl}
          placeholder="Name this shadow…"
          autofocus
          onkeydown={(e) => {
            if (e.key === "Escape") { creatingNew = false; newShadowName = ""; }
          }}
        />
        <button type="submit" class="btn-create" disabled={!newShadowName.trim()}>
          Create
        </button>
        <button
          type="button"
          class="btn-cancel"
          onclick={() => { creatingNew = false; newShadowName = ""; }}
        >
          Cancel
        </button>
      </form>
    </div>
  {/if}

  {#if shadowsStore.shadows.length === 0 && !creatingNew}
    <div class="empty-state">
      <div class="empty-icon">◑</div>
      <p>No shadows charted yet.</p>
      <button class="cta-btn" onclick={() => (creatingNew = true)}>
        Chart your first shadow →
      </button>
    </div>
  {:else}
    <div class="card-grid">
      {#each shadowsStore.shadows as shadow (shadow.id)}
        {@const count = shadowsStore.getInscriptionPaths(shadow.id).length}
        <article
          class="shadow-card"
          style="background: {coverStyle(shadow)};"
        >
          <div class="card-overlay">
            <div class="card-body">
              <h2 class="card-name">{shadow.name}</h2>
              <p class="card-desc" class:empty={!shadow.description}>
                {shadow.description || "No description"}
              </p>
            </div>
            <div class="card-footer">
              <span class="card-count">
                {count} inscription{count !== 1 ? "s" : ""}
              </span>
              <button
                class="enter-btn"
                onclick={() => goto(`/shadows/${shadow.id}`)}
              >
                Enter →
              </button>
            </div>
          </div>
        </article>
      {/each}
    </div>
  {/if}
</div>

<style>
  .dashboard {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow-y: auto;
    padding: 32px 36px;
    gap: 28px;
    min-height: 0;
  }

  /* ── Header ── */
  .dashboard-header {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 16px;
    flex-shrink: 0;
  }

  .header-text {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .title {
    margin: 0;
    font-size: 28px;
    font-weight: 700;
    color: var(--text);
    letter-spacing: -0.02em;
  }

  .subtitle {
    margin: 0;
    font-size: 12px;
    color: var(--text-dim);
  }

  .new-shadow-btn {
    padding: 7px 16px;
    background: transparent;
    border: 1px solid var(--border);
    border-radius: 7px;
    color: var(--text-muted);
    font-size: 12px;
    cursor: pointer;
    transition: color 0.15s, border-color 0.15s;
    white-space: nowrap;
  }

  .new-shadow-btn:hover {
    color: var(--accent);
    border-color: var(--accent);
  }

  /* ── New shadow bar ── */
  .new-shadow-bar {
    flex-shrink: 0;
  }

  .new-shadow-form {
    display: flex;
    gap: 8px;
    align-items: center;
    max-width: 480px;
  }

  .new-shadow-input {
    flex: 1;
    background: var(--surface);
    border: 1px solid var(--accent);
    border-radius: 7px;
    color: var(--text);
    font-size: 13px;
    padding: 8px 12px;
    outline: none;
  }

  .btn-create {
    padding: 7px 16px;
    background: var(--accent);
    border: none;
    border-radius: 7px;
    color: #000;
    font-size: 12px;
    font-weight: 700;
    cursor: pointer;
    transition: opacity 0.15s;
  }

  .btn-create:disabled { opacity: 0.35; cursor: not-allowed; }
  .btn-create:not(:disabled):hover { opacity: 0.85; }

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

  /* ── Empty state ── */
  .empty-state {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 12px;
    text-align: center;
    padding: 60px 40px;
  }

  .empty-icon {
    font-size: 52px;
    color: var(--oberon);
    opacity: 0.25;
  }

  .empty-state p {
    margin: 0;
    font-size: 13px;
    color: var(--text-dim);
  }

  .cta-btn {
    margin-top: 4px;
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

  .cta-btn:hover { opacity: 0.9; }

  /* ── Card grid ── */
  .card-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
    gap: 16px;
  }

  .shadow-card {
    position: relative;
    border-radius: 12px;
    overflow: hidden;
    height: 200px;
    background-size: cover;
    background-position: center;
    cursor: default;
    transition: transform 0.15s, box-shadow 0.15s;
    border: 1px solid rgba(255, 255, 255, 0.06);
  }

  .shadow-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.45);
  }

  .card-overlay {
    position: absolute;
    inset: 0;
    background: linear-gradient(
      to bottom,
      rgba(0, 0, 0, 0.15) 0%,
      rgba(0, 0, 0, 0.55) 60%,
      rgba(0, 0, 0, 0.75) 100%
    );
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
    padding: 16px;
    gap: 10px;
  }

  .card-body {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .card-name {
    margin: 0;
    font-size: 18px;
    font-weight: 700;
    color: #fff;
    line-height: 1.2;
  }

  .card-desc {
    margin: 0;
    font-size: 12px;
    color: rgba(255, 255, 255, 0.65);
    line-height: 1.4;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .card-desc.empty {
    font-style: italic;
    color: rgba(255, 255, 255, 0.35);
  }

  .card-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .card-count {
    font-size: 11px;
    color: rgba(255, 255, 255, 0.5);
  }

  .enter-btn {
    padding: 5px 14px;
    background: rgba(255, 255, 255, 0.12);
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 20px;
    color: rgba(255, 255, 255, 0.85);
    font-size: 12px;
    cursor: pointer;
    transition: background 0.15s, border-color 0.15s, color 0.15s;
  }

  .enter-btn:hover {
    background: rgba(255, 255, 255, 0.22);
    border-color: rgba(255, 255, 255, 0.4);
    color: #fff;
  }
</style>
