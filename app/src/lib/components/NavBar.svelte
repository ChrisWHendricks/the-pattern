<script lang="ts">
  import { goto } from "$app/navigation";
  import { navHistory } from "$lib/stores/nav-history.svelte";

  function back() {
    const path = navHistory.back();
    if (path) goto(path);
  }

  function forward() {
    const path = navHistory.forward();
    if (path) goto(path);
  }
</script>

<div class="nav-bar">
  <button
    class="nav-btn"
    onclick={back}
    disabled={!navHistory.canGoBack}
    title="Go back"
    aria-label="Go back"
  >
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M9 2L4 7L9 12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
  </button>
  <button
    class="nav-btn"
    onclick={forward}
    disabled={!navHistory.canGoForward}
    title="Go forward"
    aria-label="Go forward"
  >
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M5 2L10 7L5 12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
  </button>
</div>

<style>
  .nav-bar {
    display: flex;
    align-items: center;
    gap: 2px;
    padding: 4px 8px;
    border-bottom: 1px solid var(--border);
    flex-shrink: 0;
    height: 28px;
  }

  .nav-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 22px;
    height: 22px;
    border: none;
    background: transparent;
    border-radius: 4px;
    cursor: pointer;
    color: var(--text-muted);
    transition: color 0.15s, background 0.15s;
    padding: 0;
  }

  .nav-btn:hover:not(:disabled) {
    color: var(--text);
    background: var(--surface-hover);
  }

  .nav-btn:disabled {
    color: var(--text-dim);
    cursor: default;
  }
</style>
