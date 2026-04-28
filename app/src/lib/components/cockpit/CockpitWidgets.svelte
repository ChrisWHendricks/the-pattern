<script lang="ts">
  import StatusStrip from "./StatusStrip.svelte";
  import Top3Widget from "./Top3Widget.svelte";
  import CommitmentsWidget from "./CommitmentsWidget.svelte";
  import SparksTeaser from "./SparksTeaser.svelte";
  import QuickCapture from "./QuickCapture.svelte";

  let { loopsCount }: { loopsCount: number } = $props();
</script>

<div class="widgets-pane">
  <div class="cockpit-header">
    <div class="cockpit-date">
      {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
    </div>
    <div class="cockpit-title">Command Center</div>
  </div>

  <StatusStrip {loopsCount} />

  <div class="widgets-scroll">
    <Top3Widget />
    <div class="divider"></div>
    <CommitmentsWidget />
    <div class="divider"></div>
    <SparksTeaser />
  </div>

  <QuickCapture />
</div>

<style>
  .widgets-pane {
    display: flex;
    flex-direction: column;
    min-height: 0;
    overflow: hidden;
    border-right: 1px solid var(--border);
    background: var(--sidebar-bg);
  }

  .cockpit-header {
    padding: 14px 14px 10px;
    border-bottom: 1px solid var(--border);
    flex-shrink: 0;
  }

  .cockpit-date {
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--text-dim);
    margin-bottom: 3px;
  }

  .cockpit-title {
    font-size: 14px;
    font-weight: 700;
    color: var(--text);
  }

  .widgets-scroll {
    flex: 1;
    overflow-y: auto;
    overflow-x: hidden;
    padding-bottom: 8px;
    min-height: 0;
  }

  .divider {
    height: 1px;
    background: var(--border);
    margin: 12px 14px 0;
    opacity: 0.5;
  }
</style>
