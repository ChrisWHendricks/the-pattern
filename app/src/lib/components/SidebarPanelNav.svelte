<script lang="ts">
  import { page } from "$app/stores";
  import { goto } from "$app/navigation";
  import { sparks } from "$lib/stores/sparks.svelte";
  import { commitments } from "$lib/stores/commitments.svelte";

  const dailyItems = [
    { label: "Home",        icon: "☀", href: "/home" },
    { label: "Focus",       icon: "◎", href: "/focus" },
    { label: "Brain Dump",  icon: "⟁", href: "/brain-dump" },
    { label: "Commitments", icon: "◈", href: "/sparks?tab=commitments" },
    { label: "Sparks",      icon: "◇", href: "/sparks?tab=sparks" },
  ];

  const KNOWLEDGE_PREFIXES = [
    "/knowledge", "/shadows", "/inscriptions", "/chronicles", "/artifacts", "/logrus",
  ];

  function isActive(href: string) {
    if (href === "/") return $page.url.pathname === "/";
    const [path, qs] = href.split("?");
    if (!$page.url.pathname.startsWith(path)) return false;
    if (!qs) return true;
    const params = new URLSearchParams(qs);
    for (const [k, v] of params) {
      if ($page.url.searchParams.get(k) !== v) return false;
    }
    return true;
  }

  const isKnowledgeActive = $derived(
    KNOWLEDGE_PREFIXES.some((p) => $page.url.pathname.startsWith(p))
  );
</script>

<div class="panel-nav">
  {#each dailyItems as item}
    <button
      class="nav-item"
      class:active={isActive(item.href)}
      onclick={() => goto(item.href)}
      title={item.label}
    >
      <span class="nav-icon">{item.icon}</span>
      <span class="nav-label">{item.label}</span>
      {#if item.href === "/sparks?tab=commitments" && commitments.open.length > 0}
        <span class="nav-count commit-count">{commitments.open.length}</span>
      {/if}
      {#if item.href === "/sparks?tab=sparks" && sparks.open.length > 0}
        <span class="nav-count spark-count">{sparks.open.length}</span>
      {/if}
    </button>
  {/each}

  <div class="nav-divider"></div>

  <button
    class="nav-item"
    class:active={isKnowledgeActive}
    onclick={() => goto("/knowledge")}
    title="Knowledge"
  >
    <span class="nav-icon">◑</span>
    <span class="nav-label">Knowledge</span>
  </button>
</div>

<style>
  .panel-nav {
    flex: 1;
    padding: 8px;
    display: flex;
    flex-direction: column;
    gap: 2px;
    overflow-y: auto;
    min-height: 0;
  }

  .nav-divider {
    height: 1px;
    background: var(--border);
    margin: 4px 0 2px;
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

  .nav-count {
    font-size: 10px;
    font-weight: 700;
    padding: 1px 6px;
    border-radius: 10px;
    background: color-mix(in srgb, var(--oberon) 20%, transparent);
    color: var(--oberon);
  }

  .spark-count {
    background: color-mix(in srgb, var(--accent) 15%, transparent);
    color: var(--accent);
  }

  .commit-count {
    background: color-mix(in srgb, var(--oberon) 20%, transparent);
    color: var(--oberon);
  }
</style>
