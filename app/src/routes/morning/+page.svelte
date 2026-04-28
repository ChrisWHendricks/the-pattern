<script lang="ts">
  import { onMount } from "svelte";
  import MorningGreeting from "$lib/components/morning/MorningGreeting.svelte";
  import TopThreeCard from "$lib/components/morning/TopThreeCard.svelte";
  import CommitmentsPulse from "$lib/components/morning/CommitmentsPulse.svelte";
  import LaunchPad from "$lib/components/morning/LaunchPad.svelte";
  import { settings } from "$lib/stores/settings.svelte";
  import { commitments } from "$lib/stores/commitments.svelte";
  import { top3Store } from "$lib/stores/top3.svelte";
  import { logrusStore } from "$lib/stores/logrus.svelte";
  import { generateDailyInsight } from "$lib/claude";

  const INSIGHT_KEY_PREFIX = "oberon-insight-";

  let insight = $state("");
  let insightLoading = $state(false);

  function todayKey(): string {
    return INSIGHT_KEY_PREFIX + new Date().toISOString().split("T")[0];
  }

  onMount(async () => {
    // Scan logrus for ambient badge counts
    if (settings.vaultPath) {
      logrusStore.scan().catch(() => {});
    }

    if (!settings.hasApiKey) return;

    // Check cache first
    const cached = localStorage.getItem(todayKey());
    if (cached) {
      insight = cached;
      return;
    }

    // Generate fresh insight
    insightLoading = true;
    try {
      const top3Summary = top3Store.items
        .filter((i) => i.text.trim())
        .map((i, idx) => `${idx + 1}. ${i.text}${i.done ? " ✓" : ""}`)
        .join(", ") || "not set";

      const result = await generateDailyInsight(
        settings.apiKey,
        commitments.openSummary(),
        top3Summary
      );
      if (result) {
        insight = result;
        localStorage.setItem(todayKey(), result);
      }
    } catch {
      // Non-critical — briefing works without the insight
    } finally {
      insightLoading = false;
    }
  });
</script>

<div class="morning-briefing">
  <div class="briefing-column">

    <section class="phase-section" style="--delay: 0ms">
      <MorningGreeting {insight} loading={insightLoading} />
    </section>

    <div class="phase-divider"></div>

    <section class="phase-section" style="--delay: 150ms">
      <TopThreeCard />
    </section>

    <div class="phase-divider"></div>

    <section class="phase-section" style="--delay: 300ms">
      <CommitmentsPulse />
    </section>

    <div class="phase-divider"></div>

    <section class="phase-section" style="--delay: 450ms">
      <LaunchPad />
    </section>

  </div>
</div>

<style>
  .morning-briefing {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 48px 24px 80px;
    min-height: 100%;
    overflow-y: auto;
    background: var(--bg);
  }

  .briefing-column {
    display: flex;
    flex-direction: column;
    gap: 40px;
    width: 100%;
    max-width: 680px;
  }

  .phase-divider {
    width: 100%;
    height: 1px;
    background: var(--border);
    opacity: 0.5;
    margin: 0;
  }

  .phase-section {
    opacity: 0;
    transform: translateY(8px);
    animation: phase-enter 400ms ease forwards;
    animation-delay: var(--delay, 0ms);
  }

  @keyframes phase-enter {
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
</style>
