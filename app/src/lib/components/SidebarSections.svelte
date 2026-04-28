<script lang="ts">
  import { page } from "$app/stores";
  import { goto } from "$app/navigation";
  import { settings } from "$lib/stores/settings.svelte";
  import { sparks } from "$lib/stores/sparks.svelte";
  import { logrusStore } from "$lib/stores/logrus.svelte";

  const dailyItems = [
    { label: "Home",       icon: "☀", href: "/home" },
    { label: "Top 3",      icon: "≡", href: "/top3" },
    { label: "Focus",      icon: "◎", href: "/focus" },
    { label: "Brain Dump", icon: "⟁", href: "/brain-dump" },
    { label: "Sparks",     icon: "◇", href: "/sparks" },
  ];

  const knowledgeItems = [
    { label: "Shadows",    icon: "◑", href: "/shadows" },
    { label: "Chronicles", icon: "◫", href: "/chronicles" },
    { label: "Artifacts",  icon: "◧", href: "/artifacts" },
    { label: "The Logrus", icon: "⊗", href: "/logrus" },
    { label: "Inscriptions", icon: "◻", href: "/inscriptions" },
  ];

  function isActive(href: string) {
    if (href === "/") return $page.url.pathname === "/";
    return $page.url.pathname.startsWith(href);
  }
</script>

<div class="sections-nav">
  <div class="section-group">
    <span class="section-label">Daily</span>
    {#each dailyItems as item}
      <button
        class="nav-item"
        class:active={isActive(item.href)}
        onclick={() => goto(item.href)}
        title={item.label}
      >
        <span class="nav-icon">{item.icon}</span>
        <span class="nav-label">{item.label}</span>
        {#if item.href === "/sparks" && sparks.open.length > 0}
          <span class="nav-count spark-count">{sparks.open.length}</span>
        {/if}
      </button>
    {/each}
  </div>

  <div class="section-divider"></div>

  <div class="section-group">
    <span class="section-label">Knowledge</span>
    {#each knowledgeItems as item}
      <button
        class="nav-item"
        class:active={isActive(item.href)}
        onclick={() => goto(item.href)}
        title={item.label}
      >
        <span class="nav-icon">{item.icon}</span>
        <span class="nav-label">{item.label}</span>
        {#if item.href === "/logrus" && logrusStore.items.length > 0}
          <span class="nav-count">{logrusStore.items.length}</span>
        {/if}
      </button>
    {/each}

    {#if settings.devMode}
      <button
        class="nav-item dev-item"
        class:active={isActive("/developer")}
        onclick={() => goto("/developer")}
        title="Developer"
      >
        <span class="nav-icon">⬡</span>
        <span class="nav-label">Developer</span>
        <span class="dev-badge">dev</span>
      </button>
    {/if}
  </div>
</div>

<style>
  .sections-nav {
    flex: 1;
    padding: 8px;
    display: flex;
    flex-direction: column;
    overflow-y: auto;
    min-height: 0;
  }

  .section-group {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .section-label {
    display: block;
    font-size: 9px;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--text-dim);
    padding: 6px 10px 4px;
  }

  .section-divider {
    height: 1px;
    background: var(--border);
    margin: 8px 0;
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

  .dev-item { opacity: 0.75; }
  .dev-item:hover, .dev-item.active { opacity: 1; }

  .dev-badge {
    font-size: 9px;
    padding: 1px 5px;
    border-radius: 4px;
    background: color-mix(in srgb, #f59e0b 15%, transparent);
    color: #f59e0b;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }
</style>
