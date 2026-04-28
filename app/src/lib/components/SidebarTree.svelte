<script lang="ts">
  import { onMount } from "svelte";
  import { page } from "$app/stores";
  import { goto } from "$app/navigation";
  import { settings } from "$lib/stores/settings.svelte";
  import { sparks } from "$lib/stores/sparks.svelte";
  import { logrusStore } from "$lib/stores/logrus.svelte";
  import { shadowsStore } from "$lib/stores/shadows.svelte";
  import { vault } from "$lib/stores/vault.svelte";

  const dailyItems = [
    { label: "Morning",    icon: "☀", href: "/morning" },
    { label: "Cockpit",    icon: "⬟", href: "/cockpit" },
    { label: "Mission",    icon: "⬡", href: "/mission" },
    { label: "Top 3",      icon: "≡", href: "/top3" },
    { label: "Focus",      icon: "◎", href: "/focus" },
    { label: "Brain Dump", icon: "⟁", href: "/brain-dump" },
    { label: "Sparks",     icon: "◇", href: "/sparks" },
  ];

  const flatKnowledgeItems = [
    { label: "Chronicles", icon: "◫", href: "/chronicles" },
    { label: "Artifacts",  icon: "◧", href: "/artifacts" },
    { label: "The Logrus", icon: "⊗", href: "/logrus" },
    { label: "Inscriptions", icon: "◻", href: "/inscriptions" },
  ];

  let expanded = $state<Set<string>>(new Set());

  onMount(async () => {
    shadowsStore.load();
    if (settings.vaultPath) {
      await vault.loadInscriptions();
    }
  });

  function isActive(href: string) {
    if (href === "/") return $page.url.pathname === "/";
    return $page.url.pathname.startsWith(href);
  }

  function toggleExpand(id: string) {
    const next = new Set(expanded);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    expanded = next;
  }

  function getShadowInscriptions(shadowId: string) {
    const paths = shadowsStore.getInscriptionPaths(shadowId);
    return vault.inscriptions.filter((i) => paths.includes(i.path));
  }
</script>

<div class="tree-nav">
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

    {#if shadowsStore.shadows.length === 0}
      <button
        class="nav-item"
        class:active={isActive("/shadows")}
        onclick={() => goto("/shadows")}
        title="Shadows"
      >
        <span class="nav-icon">◑</span>
        <span class="nav-label">Shadows</span>
      </button>
    {:else}
      {#each shadowsStore.shadows as shadow (shadow.id)}
        {@const inscriptions = getShadowInscriptions(shadow.id)}
        {@const isExpanded = expanded.has(shadow.id)}
        {@const shadowActive = $page.url.pathname.startsWith(`/shadows/${shadow.id}`)}

        <div class="shadow-row" class:active={shadowActive}>
          <button
            class="expand-btn"
            onclick={() => toggleExpand(shadow.id)}
            title={isExpanded ? "Collapse" : "Expand"}
          >{isExpanded ? "▾" : "▸"}</button>
          <button
            class="shadow-name-btn"
            class:active={shadowActive}
            onclick={() => { toggleExpand(shadow.id); goto(`/shadows/${shadow.id}`); }}
          >
            <span class="nav-icon">◑</span>
            <span class="nav-label">{shadow.name}</span>
            {#if inscriptions.length > 0}
              <span class="shadow-count">{inscriptions.length}</span>
            {/if}
          </button>
        </div>

        {#if isExpanded}
          <div class="inscription-sub">
            {#if inscriptions.length === 0}
              <span class="sub-empty">No inscriptions</span>
            {:else}
              {#each inscriptions as inscription (inscription.path)}
                <button
                  class="inscription-item"
                  class:active={vault.currentInscription?.path === inscription.path}
                  onclick={() => {
                    vault.openInscription(inscription);
                    goto(`/shadows/${shadow.id}`);
                  }}
                  title={inscription.title}
                >
                  <span class="sub-icon">◻</span>
                  <span class="sub-title">{inscription.title}</span>
                </button>
              {/each}
            {/if}
          </div>
        {/if}
      {/each}
    {/if}

    {#each flatKnowledgeItems as item}
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
  .tree-nav {
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

  /* Shadow tree rows */
  .shadow-row {
    display: flex;
    align-items: center;
    border-radius: 6px;
    transition: background 0.15s;
  }

  .shadow-row:hover { background: var(--surface-hover); }
  .shadow-row.active { background: var(--surface-hover); }

  .expand-btn {
    width: 24px;
    height: 28px;
    border: none;
    background: transparent;
    color: var(--text-dim);
    font-size: 10px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    padding: 0;
    border-radius: 4px;
    transition: color 0.1s;
  }

  .expand-btn:hover { color: var(--text-muted); }

  .shadow-name-btn {
    flex: 1;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 7px 10px 7px 2px;
    border: none;
    background: transparent;
    color: var(--text-muted);
    font-size: 13px;
    cursor: pointer;
    text-align: left;
    min-width: 0;
    transition: color 0.15s;
  }

  .shadow-name-btn:hover { color: var(--text); }
  .shadow-name-btn.active { color: var(--accent); }

  .shadow-count {
    font-size: 10px;
    font-weight: 700;
    padding: 1px 6px;
    border-radius: 10px;
    background: color-mix(in srgb, var(--oberon) 20%, transparent);
    color: var(--oberon);
    flex-shrink: 0;
  }

  /* Inscription sub-items */
  .inscription-sub {
    padding-left: 24px;
    display: flex;
    flex-direction: column;
    gap: 1px;
    margin-bottom: 2px;
  }

  .inscription-item {
    display: flex;
    align-items: center;
    gap: 6px;
    width: 100%;
    padding: 5px 10px 5px 4px;
    border: none;
    border-radius: 5px;
    background: transparent;
    color: var(--text-muted);
    font-size: 11px;
    cursor: pointer;
    text-align: left;
    transition: background 0.1s, color 0.1s;
    min-width: 0;
  }

  .inscription-item:hover {
    background: var(--surface-hover);
    color: var(--text);
  }

  .inscription-item.active {
    background: var(--surface-hover);
    color: var(--accent);
  }

  .sub-icon {
    font-size: 10px;
    color: var(--text-dim);
    flex-shrink: 0;
  }

  .inscription-item.active .sub-icon { color: var(--accent); }

  .sub-title {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .sub-empty {
    padding: 4px 8px;
    font-size: 11px;
    color: var(--text-dim);
    font-style: italic;
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
