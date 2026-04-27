<script lang="ts">
  import { issuesStore, type AppIssue } from "$lib/stores/issues.svelte";

  type Filter = "all" | "defect" | "feature";
  type StatusFilter = "open" | "in-progress" | "done" | "all";

  let typeFilter = $state<Filter>("all");
  let statusFilter = $state<StatusFilter>("open");
  let creatingType = $state<"defect" | "feature" | null>(null);
  let newTitle = $state("");
  let newDesc = $state("");

  const filtered = $derived(
    issuesStore.issues.filter((i) => {
      if (typeFilter !== "all" && i.type !== typeFilter) return false;
      if (statusFilter !== "all" && i.status !== statusFilter) return false;
      return true;
    })
  );

  const counts = $derived({
    defects: issuesStore.issues.filter((i) => i.type === "defect" && i.status !== "done").length,
    features: issuesStore.issues.filter((i) => i.type === "feature" && i.status !== "done").length,
  });

  function submitNew() {
    if (!creatingType || !newTitle.trim()) return;
    issuesStore.create(creatingType, newTitle.trim(), newDesc.trim());
    newTitle = "";
    newDesc = "";
    creatingType = null;
  }

  function statusLabel(status: AppIssue["status"]): string {
    return status === "in-progress" ? "In Progress" : status.charAt(0).toUpperCase() + status.slice(1);
  }

  function nextStatus(status: AppIssue["status"]): AppIssue["status"] {
    if (status === "open") return "in-progress";
    if (status === "in-progress") return "done";
    return "open";
  }

  function formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }
</script>

<div class="dev-page">
  <div class="dev-header">
    <div class="header-left">
      <h1 class="title">Developer</h1>
      <p class="subtitle">Defects &amp; feature backlog</p>
    </div>
    <div class="header-stats">
      <span class="stat defect-stat">
        <span class="stat-dot defect-dot"></span>
        {counts.defects} open defect{counts.defects !== 1 ? "s" : ""}
      </span>
      <span class="stat feature-stat">
        <span class="stat-dot feature-dot"></span>
        {counts.features} open feature{counts.features !== 1 ? "s" : ""}
      </span>
    </div>
  </div>

  <!-- Toolbar -->
  <div class="toolbar">
    <div class="filter-group">
      {#each (["all", "defect", "feature"] as Filter[]) as f}
        <button
          class="filter-btn"
          class:active={typeFilter === f}
          onclick={() => (typeFilter = f)}
        >
          {f === "all" ? "All" : f === "defect" ? "Defects" : "Features"}
        </button>
      {/each}
    </div>

    <div class="filter-group">
      {#each (["open", "in-progress", "done", "all"] as StatusFilter[]) as s}
        <button
          class="filter-btn"
          class:active={statusFilter === s}
          onclick={() => (statusFilter = s)}
        >
          {s === "all" ? "All statuses" : statusLabel(s as AppIssue["status"])}
        </button>
      {/each}
    </div>

    <div class="add-btns">
      <button class="add-btn defect-add" onclick={() => { creatingType = "defect"; newTitle = ""; newDesc = ""; }}>
        + Defect
      </button>
      <button class="add-btn feature-add" onclick={() => { creatingType = "feature"; newTitle = ""; newDesc = ""; }}>
        + Feature
      </button>
    </div>
  </div>

  <!-- New item form -->
  {#if creatingType}
    <div class="new-item-form">
      <div class="new-item-header">
        <span class="type-badge" class:defect={creatingType === "defect"} class:feature={creatingType === "feature"}>
          {creatingType}
        </span>
        <span class="new-item-label">New {creatingType}</span>
      </div>
      <input
        class="new-title-input"
        bind:value={newTitle}
        placeholder="Title…"
        autofocus
        onkeydown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submitNew(); }
          if (e.key === "Escape") { creatingType = null; }
        }}
      />
      <textarea
        class="new-desc-input"
        bind:value={newDesc}
        placeholder="Description (optional)…"
        rows={2}
        onkeydown={(e) => { if (e.key === "Escape") creatingType = null; }}
      ></textarea>
      <div class="new-item-actions">
        <button class="btn-create" onclick={submitNew} disabled={!newTitle.trim()}>
          Create
        </button>
        <button class="btn-cancel" onclick={() => (creatingType = null)}>
          Cancel
        </button>
      </div>
    </div>
  {/if}

  <!-- Issue list -->
  {#if filtered.length === 0}
    <div class="empty-state">
      <p>No items match the current filter.</p>
    </div>
  {:else}
    <ul class="issue-list">
      {#each filtered as issue (issue.id)}
        <li class="issue-row" class:done={issue.status === "done"}>
          <div class="issue-main">
            <span class="type-badge" class:defect={issue.type === "defect"} class:feature={issue.type === "feature"}>
              {issue.type}
            </span>
            <div class="issue-body">
              <span class="issue-title">{issue.title}</span>
              {#if issue.description}
                <span class="issue-desc">{issue.description}</span>
              {/if}
            </div>
          </div>
          <div class="issue-meta">
            <span class="issue-date">{formatDate(issue.createdAt)}</span>
            <button
              class="status-btn"
              class:open={issue.status === "open"}
              class:in-progress={issue.status === "in-progress"}
              class:done={issue.status === "done"}
              onclick={() => issuesStore.updateStatus(issue.id, nextStatus(issue.status))}
              title="Click to advance status"
            >
              {statusLabel(issue.status)}
            </button>
          </div>
        </li>
      {/each}
    </ul>
  {/if}
</div>

<style>
  .dev-page {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow-y: auto;
    padding: 32px 36px;
    gap: 20px;
    min-height: 0;
  }

  /* ── Header ── */
  .dev-header {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 16px;
    flex-shrink: 0;
  }

  .header-left {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .title {
    margin: 0;
    font-size: 28px;
    font-weight: 700;
    color: var(--text);
    letter-spacing: -0.02em;
  }

  .subtitle {
    margin: 0;
    font-size: 12px;
    color: var(--text-dim);
  }

  .header-stats {
    display: flex;
    gap: 16px;
    align-items: center;
  }

  .stat {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    color: var(--text-muted);
  }

  .stat-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  .defect-dot { background: #e06c75; }
  .feature-dot { background: #61afef; }

  /* ── Toolbar ── */
  .toolbar {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
    flex-shrink: 0;
    border-bottom: 1px solid var(--border);
    padding-bottom: 16px;
  }

  .filter-group {
    display: flex;
    gap: 4px;
  }

  .filter-btn {
    padding: 4px 10px;
    border: 1px solid var(--border);
    border-radius: 20px;
    background: transparent;
    color: var(--text-muted);
    font-size: 11px;
    cursor: pointer;
    transition: all 0.1s;
  }

  .filter-btn:hover { border-color: var(--border-hover); color: var(--text); }
  .filter-btn.active {
    background: var(--surface-hover);
    color: var(--text);
    border-color: var(--border-hover);
  }

  .add-btns {
    display: flex;
    gap: 6px;
    margin-left: auto;
  }

  .add-btn {
    padding: 4px 12px;
    border-radius: 6px;
    border: 1px solid;
    font-size: 11px;
    cursor: pointer;
    transition: opacity 0.15s;
  }

  .defect-add {
    background: color-mix(in srgb, #e06c75 12%, transparent);
    border-color: color-mix(in srgb, #e06c75 35%, transparent);
    color: #e06c75;
  }

  .feature-add {
    background: color-mix(in srgb, #61afef 12%, transparent);
    border-color: color-mix(in srgb, #61afef 35%, transparent);
    color: #61afef;
  }

  .add-btn:hover { opacity: 0.75; }

  /* ── New item form ── */
  .new-item-form {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 10px;
    flex-shrink: 0;
  }

  .new-item-header {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .new-item-label {
    font-size: 12px;
    color: var(--text-muted);
  }

  .new-title-input {
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: 6px;
    color: var(--text);
    font-size: 13px;
    padding: 8px 12px;
    outline: none;
    width: 100%;
  }

  .new-title-input:focus { border-color: var(--accent); }

  .new-desc-input {
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: 6px;
    color: var(--text);
    font-size: 12px;
    padding: 8px 12px;
    outline: none;
    resize: none;
    width: 100%;
    font-family: var(--font-sans);
    line-height: 1.5;
  }

  .new-desc-input:focus { border-color: var(--accent); }

  .new-item-actions {
    display: flex;
    gap: 8px;
  }

  .btn-create {
    padding: 6px 16px;
    background: var(--accent);
    border: none;
    border-radius: 6px;
    color: #000;
    font-size: 12px;
    font-weight: 700;
    cursor: pointer;
    transition: opacity 0.15s;
  }

  .btn-create:disabled { opacity: 0.35; cursor: not-allowed; }
  .btn-create:not(:disabled):hover { opacity: 0.85; }

  .btn-cancel {
    padding: 6px 14px;
    background: transparent;
    border: 1px solid var(--border);
    border-radius: 6px;
    color: var(--text-muted);
    font-size: 12px;
    cursor: pointer;
    transition: border-color 0.15s;
  }

  .btn-cancel:hover { border-color: var(--border-hover); }

  /* ── Issue list ── */
  .issue-list {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .issue-row {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 14px;
    border-radius: 8px;
    border: 1px solid transparent;
    transition: border-color 0.1s, background 0.1s;
  }

  .issue-row:hover {
    background: var(--surface);
    border-color: var(--border);
  }

  .issue-row.done { opacity: 0.45; }

  .issue-main {
    flex: 1;
    display: flex;
    align-items: flex-start;
    gap: 10px;
    min-width: 0;
  }

  .issue-body {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }

  .issue-title {
    font-size: 13px;
    color: var(--text);
    font-weight: 500;
  }

  .issue-desc {
    font-size: 11px;
    color: var(--text-dim);
    line-height: 1.4;
  }

  .issue-meta {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-shrink: 0;
  }

  .issue-date {
    font-size: 10px;
    color: var(--text-dim);
  }

  /* ── Type badge ── */
  .type-badge {
    font-size: 9px;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    padding: 2px 7px;
    border-radius: 4px;
    flex-shrink: 0;
    margin-top: 1px;
  }

  .type-badge.defect {
    background: color-mix(in srgb, #e06c75 15%, transparent);
    color: #e06c75;
  }

  .type-badge.feature {
    background: color-mix(in srgb, #61afef 15%, transparent);
    color: #61afef;
  }

  /* ── Status button ── */
  .status-btn {
    font-size: 10px;
    padding: 3px 10px;
    border-radius: 20px;
    border: 1px solid;
    cursor: pointer;
    transition: opacity 0.15s;
    font-weight: 600;
    letter-spacing: 0.02em;
    text-transform: uppercase;
  }

  .status-btn:hover { opacity: 0.7; }

  .status-btn.open {
    background: color-mix(in srgb, #98c379 10%, transparent);
    border-color: color-mix(in srgb, #98c379 30%, transparent);
    color: #98c379;
  }

  .status-btn.in-progress {
    background: color-mix(in srgb, #e5c07b 10%, transparent);
    border-color: color-mix(in srgb, #e5c07b 30%, transparent);
    color: #e5c07b;
  }

  .status-btn.done {
    background: color-mix(in srgb, var(--text-dim) 10%, transparent);
    border-color: color-mix(in srgb, var(--text-dim) 20%, transparent);
    color: var(--text-dim);
  }

  /* ── Empty state ── */
  .empty-state {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 60px;
  }

  .empty-state p {
    font-size: 13px;
    color: var(--text-dim);
    margin: 0;
  }
</style>
