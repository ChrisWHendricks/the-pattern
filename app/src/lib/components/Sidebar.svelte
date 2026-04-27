<script lang="ts">
  import { settings } from "$lib/stores/settings.svelte";
  import { conversation } from "$lib/stores/conversation.svelte";
  import { layoutStore } from "$lib/stores/layout.svelte";
  import SidebarSections from "$lib/components/SidebarSections.svelte";
  import SidebarTree from "$lib/components/SidebarTree.svelte";
  import SidebarPanelNav from "$lib/components/SidebarPanelNav.svelte";
</script>

<aside class="sidebar">
  <div class="sidebar-header">
    <div class="app-mark">⬡</div>
    <div class="app-title">
      <span class="app-name">The Pattern</span>
      <span class="app-sub">Personal AI</span>
    </div>
  </div>

  <div class="nav-shell">
    {#if settings.sidebarLayout === "tree"}
      <SidebarTree />
    {:else if settings.sidebarLayout === "panels"}
      <SidebarPanelNav />
    {:else}
      <SidebarSections />
    {/if}

    <div class="nav-pinned">
      <button
        class="nav-item"
        class:active={layoutStore.oberonOpen}
        onclick={() => layoutStore.toggleOberon()}
        title="Toggle Oberon"
      >
        <span class="nav-icon">◈</span>
        <span class="nav-label">Oberon</span>
      </button>

      <button
        class="nav-item settings-item"
        onclick={() => settings.openSettings()}
        title="Settings"
      >
        <span class="nav-icon">⚙</span>
        <span class="nav-label">Settings</span>
      </button>
    </div>
  </div>
</aside>

<style>
  .sidebar {
    width: 100%;
    height: 100%;
    background: var(--sidebar-bg);
    border-right: 1px solid var(--border);
    display: flex;
    flex-direction: column;
    user-select: none;
  }

  .sidebar-header {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 20px 16px 16px;
    border-bottom: 1px solid var(--border);
  }

  .app-mark {
    font-size: 22px;
    color: var(--accent);
    line-height: 1;
  }

  .app-title {
    display: flex;
    flex-direction: column;
    gap: 1px;
  }

  .app-name {
    font-size: 13px;
    font-weight: 600;
    color: var(--text);
    letter-spacing: 0.02em;
  }

  .app-sub {
    font-size: 10px;
    color: var(--text-muted);
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }

  .nav-shell {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-height: 0;
    overflow: hidden;
  }

  .nav-pinned {
    padding: 4px 8px 8px;
    display: flex;
    flex-direction: column;
    gap: 2px;
    flex-shrink: 0;
    border-top: 1px solid var(--border);
  }

  .nav-item {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    padding: 7px 10px;
    border: none;
    border-radius: 6px;
    background: transparent;
    color: var(--text-muted);
    font-size: 13px;
    cursor: pointer;
    text-align: left;
    transition: background 0.15s, color 0.15s;
  }

  .nav-item:hover {
    background: var(--surface-hover);
    color: var(--text);
  }

  .nav-item.active {
    background: var(--surface-hover);
    color: var(--accent);
  }

  .nav-icon {
    font-size: 14px;
    width: 18px;
    text-align: center;
  }

  .nav-label { flex: 1; }
</style>
