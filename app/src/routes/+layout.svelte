<script lang="ts">
  import { onMount } from "svelte";
  import Sidebar from "$lib/components/Sidebar.svelte";
  import SettingsDialog from "$lib/components/SettingsDialog.svelte";
  import { settings } from "$lib/stores/settings.svelte";
  import { commitments } from "$lib/stores/commitments.svelte";
  import { vault } from "$lib/stores/vault.svelte";
  import { listen } from "@tauri-apps/api/event";
  import { page } from "$app/stores";

  let { children } = $props();

  let isCapture = $derived($page.url.pathname === "/capture");

  let captureToast = $state<string | null>(null);
  let toastTimer: ReturnType<typeof setTimeout> | null = null;

  function showToast(msg: string) {
    captureToast = msg;
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { captureToast = null; }, 3000);
  }

  onMount(() => {
    const unlisten = listen<{ text: string; mode: string }>("quick-capture", async (event) => {
      const { text, mode } = event.payload;
      if (mode === "note") {
        if (settings.vaultPath) {
          try {
            await vault.newNote();
            // Overwrite the blank note with the captured text
            if (vault.currentNote) {
              await vault.saveCurrentNote(`# ${text.split("\n")[0]}\n\n${text}`);
            }
            showToast(`Note created: "${text.slice(0, 40)}"`);
          } catch {
            showToast("Failed to create note");
          }
        } else {
          showToast("Set a vault path in Settings to create notes");
        }
      } else {
        commitments.add({ text });
        showToast(`Commitment captured: "${text.slice(0, 40)}"`);
      }
    });
    return () => unlisten.then((fn) => fn());
  });
</script>

{#if isCapture}
  {@render children()}
{:else}
  <div class="app-shell">
    <Sidebar />
    <div class="main">
      {@render children()}
    </div>
    {#if settings.showSettingsDialog || !settings.hasApiKey}
      <SettingsDialog />
    {/if}
  </div>

  {#if captureToast}
    <div class="capture-toast">{captureToast}</div>
  {/if}
{/if}

<style>
  :global(*) {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  :global(:root) {
    --bg: #0e0c1a;
    --sidebar-bg: #0b0918;
    --surface: #181428;
    --surface-hover: #231e38;
    --border: #2e2850;
    --border-hover: #433c6a;

    --accent: #e8a020;
    --accent-dim: color-mix(in srgb, #e8a020 20%, transparent);

    --oberon: #a78bfa;
    --oberon-dim: color-mix(in srgb, #a78bfa 15%, #181428);

    --user-bubble: #1e1835;
    --user-bubble-border: #2e2850;

    --text: #e4e0ff;
    --text-muted: #7a72a8;
    --text-dim: #4a4572;

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

  .capture-toast {
    position: fixed;
    bottom: 24px;
    left: 50%;
    transform: translateX(-50%);
    background: var(--surface);
    border: 1px solid var(--border);
    color: var(--text-muted);
    padding: 8px 16px;
    border-radius: 8px;
    font-size: 12px;
    z-index: 300;
    pointer-events: none;
    white-space: nowrap;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
  }
</style>
