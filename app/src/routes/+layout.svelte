<script lang="ts">
  import Sidebar from "$lib/components/Sidebar.svelte";
  import SettingsDialog from "$lib/components/SettingsDialog.svelte";
  import { settings } from "$lib/stores/settings.svelte";

  let { children } = $props();
</script>

<div class="app-shell">
  <Sidebar />
  <div class="main">
    {@render children()}
  </div>
  {#if settings.showSettingsDialog || !settings.hasApiKey}
    <SettingsDialog />
  {/if}
</div>

<style>
  :global(*) {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  :global(:root) {
    --bg: #0c0f18;
    --sidebar-bg: #0a0d14;
    --surface: #131720;
    --surface-hover: #1c2232;
    --border: #1e2535;
    --border-hover: #2e3d55;

    --accent: #e8a020;
    --accent-dim: color-mix(in srgb, #e8a020 20%, transparent);

    --oberon: #9b8fd4;
    --oberon-dim: color-mix(in srgb, #9b8fd4 15%, #131720);

    --user-bubble: #1a2540;
    --user-bubble-border: #243354;

    --text: #dde4f0;
    --text-muted: #5e718a;
    --text-dim: #32415a;

    --font-sans: -apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", sans-serif;
    --font-mono: "SF Mono", "JetBrains Mono", "Fira Code", monospace;
  }

  :global(html, body) {
    height: 100%;
    background: var(--bg);
    color: var(--text);
    font-family: var(--font-sans);
    -webkit-font-smoothing: antialiased;
    overflow: hidden;
  }

  :global(body) {
    user-select: none;
  }

  :global(p, span, input, textarea, button) {
    user-select: text;
  }

  :global(::-webkit-scrollbar) {
    width: 6px;
  }

  :global(::-webkit-scrollbar-track) {
    background: transparent;
  }

  :global(::-webkit-scrollbar-thumb) {
    background: var(--border-hover);
    border-radius: 3px;
  }

  .app-shell {
    display: flex;
    height: 100vh;
    width: 100vw;
    overflow: hidden;
  }

  .main {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }
</style>
