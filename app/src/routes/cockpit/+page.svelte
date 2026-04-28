<script lang="ts">
  import { onMount } from "svelte";
  import CockpitWidgets from "$lib/components/cockpit/CockpitWidgets.svelte";
  import CockpitOberon from "$lib/components/cockpit/CockpitOberon.svelte";
  import ResizeHandle from "$lib/components/ResizeHandle.svelte";
  import { conversation } from "$lib/stores/conversation.svelte";
  import { settings } from "$lib/stores/settings.svelte";
  import { vault } from "$lib/stores/vault.svelte";
  import { logrusStore } from "$lib/stores/logrus.svelte";
  import { findOpenLoops } from "$lib/openLoops";

  const WIDGETS_WIDTH_KEY = "cockpit_widgets_width";
  const DEFAULT_WIDTH = 320;
  const MIN_WIDTH = 240;
  const MAX_WIDTH = 520;

  let widgetsWidth = $state(
    parseInt(localStorage.getItem(WIDGETS_WIDTH_KEY) ?? String(DEFAULT_WIDTH))
  );

  function handleResize(delta: number) {
    widgetsWidth = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, widgetsWidth + delta));
    localStorage.setItem(WIDGETS_WIDTH_KEY, String(widgetsWidth));
  }

  const loopsCount = $derived(findOpenLoops(vault.searchIndex).length);

  onMount(async () => {
    // Scan logrus on load so status chips are accurate
    if (settings.vaultPath) {
      logrusStore.scan().catch(() => {});
    }

    // Auto-trigger cockpit briefing if session is empty and API key is present
    if (settings.hasApiKey && conversation.isEmpty) {
      await conversation.startCockpitBriefing();
    }
  });
</script>

<div class="cockpit">
  <div class="widgets-col" style="width: {widgetsWidth}px">
    <CockpitWidgets {loopsCount} />
  </div>

  <ResizeHandle onDelta={handleResize} />

  <CockpitOberon />
</div>

<style>
  .cockpit {
    display: flex;
    height: 100%;
    min-height: 0;
    overflow: hidden;
    background: var(--bg);
  }

  .widgets-col {
    flex-shrink: 0;
    min-height: 0;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }
</style>
