<script lang="ts">
  import { page } from "$app/stores";
  import { goto } from "$app/navigation";
  import { settings } from "$lib/stores/settings.svelte";
  import { conversation } from "$lib/stores/conversation.svelte";
  import { commitments } from "$lib/stores/commitments.svelte";
  import CommitmentList from "./CommitmentList.svelte";

  const navItems = [
    { label: "Oberon", icon: "◈", href: "/", available: true },
    { label: "Notes", icon: "◻", href: "/notes", available: true },
    { label: "Journal", icon: "◫", href: "/journal", available: false },
    { label: "Shadows", icon: "◑", href: "/shadows", available: false },
    { label: "Focus", icon: "◎", href: "/focus", available: false },
  ];

  function isActive(href: string) {
    if (href === "/") return $page.url.pathname === "/";
    return $page.url.pathname.startsWith(href);
  }
</script>

<aside class="sidebar">
  <div class="sidebar-header">
    <div class="app-mark">⬡</div>
    <div class="app-title">
      <span class="app-name">The Pattern</span>
      <span class="app-sub">Personal AI</span>
    </div>
  </div>

  <nav class="nav">
    {#each navItems as item}
      <button
        class="nav-item"
        class:active={isActive(item.href)}
        class:disabled={!item.available}
        disabled={!item.available}
        onclick={() => item.available && goto(item.href)}
        title={item.available ? item.label : `${item.label} — coming soon`}
      >
        <span class="nav-icon">{item.icon}</span>
        <span class="nav-label">{item.label}</span>
        {#if !item.available}
          <span class="nav-badge">soon</span>
        {/if}
      </button>
    {/each}
  </nav>

  <div class="sidebar-section">
    <div class="section-header">
      <div class="section-label">Open commitments</div>
      {#if commitments.open.length > 0}
        <span class="count-badge">{commitments.open.length}</span>
      {/if}
      {#if conversation.extracting}
        <span class="extracting-dot" title="Scanning for commitments…"></span>
      {/if}
    </div>
    <CommitmentList />
  </div>

  <div class="sidebar-footer">
    <button class="footer-btn" onclick={() => settings.openSettings()}>
      <span class="footer-icon">⚙</span>
      Settings
    </button>
    {#if conversation.messages.length > 1}
      <button
        class="footer-btn"
        disabled={conversation.isSummarizing}
        onclick={() => conversation.startNewSession()}
      >
        <span class="footer-icon">{conversation.isSummarizing ? "…" : "↺"}</span>
        {conversation.isSummarizing ? "Saving memory…" : "New session"}
      </button>
    {/if}
  </div>
</aside>

<style>
  .sidebar {
    width: 220px;
    min-width: 220px;
    height: 100vh;
    background: var(--sidebar-bg);
    border-right: 1px solid var(--border);
    display: flex;
    flex-direction: column;
    user-select: none;
  }

  .sidebar-header {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 20px 16px 16px;
    border-bottom: 1px solid var(--border);
  }

  .app-mark {
    font-size: 22px;
    color: var(--accent);
    line-height: 1;
  }

  .app-title {
    display: flex;
    flex-direction: column;
    gap: 1px;
  }

  .app-name {
    font-size: 13px;
    font-weight: 600;
    color: var(--text);
    letter-spacing: 0.02em;
  }

  .app-sub {
    font-size: 10px;
    color: var(--text-muted);
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }

  .nav {
    padding: 8px 8px 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
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

  .nav-item:not(.disabled):hover {
    background: var(--surface-hover);
    color: var(--text);
  }

  .nav-item.active {
    background: var(--surface-hover);
    color: var(--accent);
  }

  .nav-item.disabled {
    cursor: default;
    opacity: 0.4;
  }

  .nav-icon {
    font-size: 14px;
    width: 18px;
    text-align: center;
  }

  .nav-label { flex: 1; }

  .nav-badge {
    font-size: 9px;
    padding: 1px 5px;
    border-radius: 4px;
    background: var(--surface-hover);
    color: var(--text-dim);
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }

  .sidebar-section {
    flex: 1;
    padding: 14px 12px;
    overflow-y: auto;
    border-top: 1px solid var(--border);
    margin-top: 8px;
  }

  .section-header {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 10px;
  }

  .section-label {
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--text-dim);
    flex: 1;
  }

  .count-badge {
    font-size: 10px;
    font-weight: 700;
    color: var(--accent);
    background: color-mix(in srgb, var(--accent) 15%, transparent);
    padding: 1px 6px;
    border-radius: 10px;
  }

  .extracting-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--oberon);
    animation: pulse 1s ease-in-out infinite;
  }

  @keyframes pulse {
    0%, 100% { opacity: 0.3; }
    50% { opacity: 1; }
  }

  .sidebar-footer {
    padding: 8px;
    border-top: 1px solid var(--border);
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .footer-btn {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    padding: 7px 10px;
    border: none;
    border-radius: 6px;
    background: transparent;
    color: var(--text-muted);
    font-size: 12px;
    cursor: pointer;
    text-align: left;
    transition: background 0.15s, color 0.15s;
  }

  .footer-btn:hover {
    background: var(--surface-hover);
    color: var(--text);
  }

  .footer-icon {
    width: 18px;
    text-align: center;
  }
</style>
