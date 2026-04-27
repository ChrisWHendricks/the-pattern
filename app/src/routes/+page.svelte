<script lang="ts">
  import { onMount } from "svelte";
  import { vault } from "$lib/stores/vault.svelte";
  import { settings } from "$lib/stores/settings.svelte";
  import { shadowsStore } from "$lib/stores/shadows.svelte";

  onMount(() => {
    if (settings.vaultPath) {
      if (vault.indexSize === 0) vault.loadInscriptions();
      shadowsStore.load();
    }
  });
</script>

<div class="dashboard">
  <div class="dashboard-inner">
    <div class="mark">⬡</div>
    <h1 class="title">The Pattern</h1>
    <p class="sub">Your AI second brain. Open Oberon from the sidebar to begin.</p>
  </div>
</div>

<style>
  .dashboard {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--bg);
  }

  .dashboard-inner {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
    text-align: center;
    opacity: 0.35;
    user-select: none;
  }

  .mark {
    font-size: 52px;
    color: var(--accent);
    line-height: 1;
  }

  .title {
    font-size: 18px;
    font-weight: 700;
    color: var(--text);
    margin: 0;
  }

  .sub {
    font-size: 12px;
    color: var(--text-muted);
    margin: 0;
    max-width: 240px;
    line-height: 1.5;
  }
</style>
