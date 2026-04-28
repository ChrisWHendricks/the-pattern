<script lang="ts">
  import { onMount } from "svelte";
  import { vault } from "$lib/stores/vault.svelte";
  import { settings } from "$lib/stores/settings.svelte";
  import { commitments } from "$lib/stores/commitments.svelte";
  import { sparks } from "$lib/stores/sparks.svelte";
  import { logrusStore } from "$lib/stores/logrus.svelte";
  import { top3Store } from "$lib/stores/top3.svelte";
  import { focusStore } from "$lib/stores/focus.svelte";
  import { findOpenLoops } from "$lib/openLoops";

  import MissionStatusBar from "$lib/components/mission/MissionStatusBar.svelte";
  import MissionTop3 from "$lib/components/mission/MissionTop3.svelte";
  import MissionCommitments from "$lib/components/mission/MissionCommitments.svelte";
  import MissionLoops from "$lib/components/mission/MissionLoops.svelte";
  import MissionSparks from "$lib/components/mission/MissionSparks.svelte";
  import MissionDumpBar from "$lib/components/mission/MissionDumpBar.svelte";

  const loopsCount = $derived(findOpenLoops(vault.searchIndex).length);

  onMount(async () => {
    if (settings.vaultPath) {
      await vault.loadInscriptions();
    }
  });
</script>

<div class="mission-layout">
  <MissionStatusBar loopsCount={loopsCount} />

  <div class="cockpit-grid">
    <MissionTop3 />
    <MissionCommitments />
    <MissionLoops />
    <MissionSparks />
  </div>

  <MissionDumpBar />
</div>

<style>
  .mission-layout {
    display: flex;
    flex-direction: column;
    height: 100%;
    overflow: hidden;
    background: var(--bg);
  }

  .cockpit-grid {
    flex: 1;
    display: grid;
    grid-template-columns: 38fr 34fr 28fr;
    grid-template-rows: 55fr 45fr;
    grid-template-areas:
      "top3  commitments  sparks"
      "top3  loops        sparks";
    background: var(--border);
    gap: 1px;
    overflow: hidden;
    min-height: 0;
  }
</style>
