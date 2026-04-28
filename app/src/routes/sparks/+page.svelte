<script lang="ts">
  import { page } from "$app/stores";
  import { goto } from "$app/navigation";
  import { sparks } from "$lib/stores/sparks.svelte";
  import { commitments } from "$lib/stores/commitments.svelte";
  import type { Commitment } from "$lib/stores/commitments.svelte";
  import JiraText from "$lib/components/JiraText.svelte";

  type Tab = "commitments" | "sparks";

  const tab = $derived<Tab>(
    $page.url.searchParams.get("tab") === "sparks" ? "sparks" : "commitments"
  );

  function setTab(t: Tab) {
    goto(`/sparks?tab=${t}`, { replaceState: true });
    expandedId = null;
    addingNew = false;
  }

  function promote(id: string, text: string) {
    sparks.markPromoted(id);
    commitments.add({ text });
  }

  // ── Expanded row state (shared for both add-new and edit) ──
  // null  = nothing expanded
  // "new" = the new-item row is open
  // <id>  = that commitment row is expanded for editing
  let expandedId = $state<string | null>(null);
  let addingNew = $state(false);

  // Fields for new commitment
  let newText = $state("");
  let newPerson = $state("");
  let newDue = $state("");

  // Fields for editing existing commitment
  let editText = $state("");
  let editPerson = $state("");
  let editDue = $state("");

  function openNew() {
    addingNew = true;
    expandedId = "new";
    newText = "";
    newPerson = "";
    newDue = "";
  }

  function cancelNew() {
    addingNew = false;
    expandedId = null;
    newText = "";
    newPerson = "";
    newDue = "";
  }

  function submitNew() {
    const text = newText.trim();
    if (!text) return;
    commitments.add({ text, person: newPerson.trim() || undefined, due: newDue || null });
    cancelNew();
  }

  function openEdit(c: Commitment) {
    addingNew = false;
    expandedId = c.id;
    editText = c.text;
    editPerson = c.person ?? "";
    editDue = c.due ?? "";
  }

  function cancelEdit() {
    expandedId = null;
  }

  function submitEdit() {
    if (!expandedId || expandedId === "new" || !editText.trim()) return;
    commitments.update(expandedId, {
      text: editText.trim(),
      person: editPerson.trim() || undefined,
      due: editDue || null,
    });
    expandedId = null;
  }

  // Click-away to collapse
  function handlePageClick() {
    if (expandedId === "new") {
      cancelNew();
    } else if (expandedId) {
      submitEdit();
    }
  }

  // ── Completed section toggle ──
  let showCompleted = $state(false);

  // ── Sparks inline add ──
  let addingSpark = $state(false);
  let newSparkText = $state("");

  function openSparkAdd() {
    addingSpark = true;
    newSparkText = "";
  }

  function cancelSparkAdd() {
    addingSpark = false;
    newSparkText = "";
  }

  function submitSpark() {
    const text = newSparkText.trim();
    if (!text) return;
    sparks.add(text);
    cancelSparkAdd();
  }

  // ── Keyboard shortcuts ──
  function handleKeydown(e: KeyboardEvent) {
    const target = e.target as HTMLElement;
    const isInputFocused =
      target.tagName === "INPUT" ||
      target.tagName === "TEXTAREA" ||
      target.isContentEditable;

    if (e.key === "Escape") {
      if (expandedId === "new") cancelNew();
      else if (expandedId) cancelEdit();
      else if (addingSpark) cancelSparkAdd();
      return;
    }

    if (!isInputFocused && e.key === "n" && tab === "commitments") {
      e.preventDefault();
      openNew();
    }
  }

  // ── Due date chip helpers ──
  function dueDateStatus(due: string | null | undefined): "overdue" | "today" | "future" | null {
    if (!due) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const d = new Date(due + "T00:00:00");
    if (d < today) return "overdue";
    if (d.getTime() === today.getTime()) return "today";
    return "future";
  }

  function formatDue(due: string): string {
    const d = new Date(due + "T00:00:00");
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diff = Math.round((d.getTime() - today.getTime()) / 86400000);
    if (diff === 0) return "Today";
    if (diff === 1) return "Tomorrow";
    if (diff === -1) return "Yesterday";
    if (diff < 0) return `${Math.abs(diff)}d ago`;
    if (diff < 7) return d.toLocaleDateString("en-US", { weekday: "short" });
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }

  // ── Group open commitments by due date ──
  type Group = { label: string; items: Commitment[] };

  const groupedOpen = $derived.by<Group[]>(() => {
    const open = commitments.open;
    const hasDates = open.some((c) => c.due);
    if (!hasDates) return [{ label: "", items: open }];

    const overdue: Commitment[] = [];
    const today: Commitment[] = [];
    const upcoming: Commitment[] = [];
    const someday: Commitment[] = [];

    for (const c of open) {
      const status = dueDateStatus(c.due);
      if (status === "overdue") overdue.push(c);
      else if (status === "today") today.push(c);
      else if (status === "future") upcoming.push(c);
      else someday.push(c);
    }

    const groups: Group[] = [];
    if (overdue.length) groups.push({ label: "Overdue", items: overdue });
    if (today.length) groups.push({ label: "Today", items: today });
    if (upcoming.length) groups.push({ label: "Upcoming", items: upcoming });
    if (someday.length) groups.push({ label: "Someday", items: someday });
    return groups;
  });
</script>

<svelte:window onkeydown={handleKeydown} />

<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
<div class="page" onclick={handlePageClick}>

  <!-- Tab strip -->
  <div class="tab-strip">
    <button
      class="tab-btn"
      class:active={tab === "commitments"}
      onclick={(e) => { e.stopPropagation(); setTab("commitments"); }}
    >
      Commitments
      {#if commitments.open.length > 0}
        <span class="tab-badge oberon">{commitments.open.length}</span>
      {/if}
    </button>
    <button
      class="tab-btn"
      class:active={tab === "sparks"}
      onclick={(e) => { e.stopPropagation(); setTab("sparks"); }}
    >
      Sparks
      {#if sparks.open.length > 0}
        <span class="tab-badge accent">{sparks.open.length}</span>
      {/if}
    </button>
  </div>

  <!-- ════════════════════════════════════════
       COMMITMENTS TAB
       ════════════════════════════════════════ -->
  {#if tab === "commitments"}
    <div class="tab-body">

      <!-- Toolbar -->
      <div class="toolbar" onclick={(e) => e.stopPropagation()}>
        <button class="new-btn" onclick={openNew} title="New commitment (N)">
          <span class="new-icon">+</span> New
        </button>
      </div>

      <!-- New commitment row (inline expand at top) -->
      {#if addingNew}
        <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
        <div
          class="row-wrap expanded"
          onclick={(e) => e.stopPropagation()}
        >
          <div class="row-main">
            <span class="circle-check adding"></span>
            <input
              class="row-title-input"
              bind:value={newText}
              placeholder="What did you commit to?"
              autofocus
              onkeydown={(e) => {
                if (e.key === "Escape") cancelNew();
                if (e.key === "Enter") { e.preventDefault(); submitNew(); }
              }}
            />
          </div>
          <div class="row-expand">
            <div class="expand-fields">
              <input
                class="field-input"
                bind:value={newPerson}
                placeholder="Person (optional)"
                onkeydown={(e) => { if (e.key === "Escape") cancelNew(); if (e.key === "Enter") { e.preventDefault(); submitNew(); }}}
              />
              <input
                class="field-input field-date"
                type="date"
                bind:value={newDue}
                onkeydown={(e) => { if (e.key === "Escape") cancelNew(); if (e.key === "Enter") { e.preventDefault(); submitNew(); }}}
              />
            </div>
            <div class="expand-actions">
              <button class="save-btn" onclick={submitNew} disabled={!newText.trim()}>Add</button>
              <button class="cancel-btn" onclick={cancelNew}>Cancel</button>
            </div>
          </div>
        </div>
      {/if}

      <!-- Open commitments, grouped -->
      {#if commitments.open.length === 0 && !addingNew}
        <div class="empty-state">
          <div class="empty-glyph">◈</div>
          <p class="empty-msg">No open commitments</p>
          <button class="empty-cta" onclick={openNew}>Add one →</button>
        </div>
      {:else}
        {#each groupedOpen as group (group.label)}
          {#if group.label}
            <div class="group-heading" class:danger={group.label === "Overdue"}>{group.label}</div>
          {/if}
          <ul class="item-list" onclick={(e) => e.stopPropagation()}>
            {#each group.items as c (c.id)}
              <li
                class="commit-row"
                class:is-expanded={expandedId === c.id}
              >
                <!-- Main row line -->
                <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
                <div class="row-main" onclick={() => {
                  if (expandedId === c.id) submitEdit();
                  else openEdit(c);
                }}>
                  <!-- CSS circle checkbox -->
                  <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
                  <span
                    class="circle-check"
                    title="Mark complete"
                    onclick={(e) => { e.stopPropagation(); commitments.complete(c.id); }}
                  ></span>

                  <JiraText text={c.text} class="row-text" />

                  <!-- Chips (hidden when expanded) -->
                  {#if expandedId !== c.id}
                    <span class="chips">
                      {#if c.person}
                        <span class="chip person-chip">{c.person}</span>
                      {/if}
                      {#if c.due}
                        <span class="chip due-chip" class:due-urgent={dueDateStatus(c.due) !== "future"}>
                          {formatDue(c.due)}
                        </span>
                      {/if}
                    </span>
                  {/if}

                  <!-- Hover delete button (shown on row hover) -->
                  <button
                    class="delete-btn"
                    title="Delete"
                    onclick={(e) => { e.stopPropagation(); commitments.remove(c.id); }}
                  >×</button>
                </div>

                <!-- Expanded editing area -->
                {#if expandedId === c.id}
                  <div class="row-expand" onclick={(e) => e.stopPropagation()}>
                    <div class="expand-fields">
                      <input
                        class="field-input row-title-input"
                        bind:value={editText}
                        autofocus
                        onkeydown={(e) => {
                          if (e.key === "Escape") cancelEdit();
                          if (e.key === "Enter") { e.preventDefault(); submitEdit(); }
                        }}
                      />
                      <input
                        class="field-input"
                        bind:value={editPerson}
                        placeholder="Person (optional)"
                        onkeydown={(e) => { if (e.key === "Escape") cancelEdit(); if (e.key === "Enter") { e.preventDefault(); submitEdit(); }}}
                      />
                      <input
                        class="field-input field-date"
                        type="date"
                        bind:value={editDue}
                        onkeydown={(e) => { if (e.key === "Escape") cancelEdit(); if (e.key === "Enter") { e.preventDefault(); submitEdit(); }}}
                      />
                    </div>
                    <div class="expand-actions">
                      <button class="save-btn" onclick={submitEdit} disabled={!editText.trim()}>Save</button>
                      <button class="cancel-btn" onclick={cancelEdit}>Cancel</button>
                    </div>
                  </div>
                {/if}
              </li>
            {/each}
          </ul>
        {/each}
      {/if}

      <!-- Completed section -->
      {#if commitments.completed.length > 0}
        <button
          class="completed-toggle"
          onclick={(e) => { e.stopPropagation(); showCompleted = !showCompleted; }}
        >
          <span class="toggle-arrow">{showCompleted ? "▾" : "▸"}</span>
          Completed
          <span class="completed-count">{commitments.completed.length}</span>
        </button>

        {#if showCompleted}
          <ul class="item-list completed-list" onclick={(e) => e.stopPropagation()}>
            {#each commitments.completed as c (c.id)}
              <li class="commit-row done-row">
                <div class="row-main">
                  <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
                  <span
                    class="circle-check is-done"
                    title="Reopen"
                    onclick={(e) => { e.stopPropagation(); commitments.reopen(c.id); }}
                  ></span>
                  <JiraText text={c.text} class="row-text done-text" />
                  {#if c.person}
                    <span class="chips">
                      <span class="chip person-chip done-chip">{c.person}</span>
                    </span>
                  {/if}
                  <button
                    class="delete-btn"
                    title="Delete"
                    onclick={(e) => { e.stopPropagation(); commitments.remove(c.id); }}
                  >×</button>
                </div>
              </li>
            {/each}
          </ul>
        {/if}
      {/if}

    </div>

  <!-- ════════════════════════════════════════
       SPARKS TAB
       ════════════════════════════════════════ -->
  {:else}
    <div class="tab-body">

      <!-- Inline add spark row at top -->
      {#if addingSpark}
        <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
        <div class="spark-add-row" onclick={(e) => e.stopPropagation()}>
          <span class="spark-diamond adding">◇</span>
          <input
            class="spark-add-input"
            bind:value={newSparkText}
            placeholder="Something you want to do someday…"
            autofocus
            onkeydown={(e) => {
              if (e.key === "Escape") cancelSparkAdd();
              if (e.key === "Enter") { e.preventDefault(); submitSpark(); }
            }}
          />
          <button class="save-btn" onclick={submitSpark} disabled={!newSparkText.trim()}>Add</button>
          <button class="cancel-btn" onclick={cancelSparkAdd}>Cancel</button>
        </div>
      {:else}
        <div class="toolbar" onclick={(e) => e.stopPropagation()}>
          <button class="new-btn" onclick={openSparkAdd}>
            <span class="new-icon">+</span> New Spark
          </button>
        </div>
      {/if}

      {#if sparks.open.length === 0 && !addingSpark}
        <div class="empty-state">
          <div class="empty-glyph">◇</div>
          <p class="empty-msg">No sparks yet</p>
          <p class="empty-hint">Capture them during a Brain Dump or tell Oberon "add a spark: …"</p>
        </div>
      {:else}
        <ul class="item-list spark-list" onclick={(e) => e.stopPropagation()}>
          {#each sparks.open as spark (spark.id)}
            <li class="spark-row">
              <span class="spark-diamond">◇</span>
              <JiraText text={spark.text} class="row-text spark-text" />
              <span class="spark-hover-actions">
                <button
                  class="commit-action-btn"
                  onclick={() => promote(spark.id, spark.text)}
                  title="Promote to commitment"
                >Commit →</button>
                <button
                  class="delete-btn spark-delete"
                  onclick={() => sparks.remove(spark.id)}
                  title="Dismiss"
                >×</button>
              </span>
            </li>
          {/each}
        </ul>
      {/if}

    </div>
  {/if}

</div>

<style>
  /* ── Page shell ── */
  .page {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    min-height: 0;
  }

  /* ── Tab strip ── */
  .tab-strip {
    display: flex;
    align-items: center;
    gap: 0;
    padding: 0 28px;
    border-bottom: 1px solid var(--border);
    flex-shrink: 0;
    background: var(--sidebar-bg, var(--bg));
  }

  .tab-btn {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 11px 4px;
    margin-right: 24px;
    border: none;
    border-bottom: 2px solid transparent;
    margin-bottom: -1px;
    background: transparent;
    color: var(--text-muted);
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    transition: color 0.15s, border-color 0.15s;
  }

  .tab-btn:hover { color: var(--text); }
  .tab-btn.active { color: var(--text); border-bottom-color: var(--accent); }

  .tab-badge {
    font-size: 10px;
    font-weight: 700;
    padding: 1px 6px;
    border-radius: 9px;
    line-height: 1.5;
  }

  .tab-badge.oberon {
    background: color-mix(in srgb, var(--oberon) 18%, transparent);
    color: var(--oberon);
  }

  .tab-badge.accent {
    background: color-mix(in srgb, var(--accent) 15%, transparent);
    color: var(--accent);
  }

  /* ── Tab body ── */
  .tab-body {
    flex: 1;
    overflow-y: auto;
    padding: 20px 32px 40px;
    display: flex;
    flex-direction: column;
    gap: 2px;
    max-width: 680px;
    width: 100%;
    margin: 0 auto;
    box-sizing: border-box;
  }

  /* ── Toolbar ── */
  .toolbar {
    display: flex;
    align-items: center;
    padding: 4px 0 12px;
    flex-shrink: 0;
  }

  .new-btn {
    display: flex;
    align-items: center;
    gap: 5px;
    padding: 5px 12px 5px 8px;
    border: 1px solid var(--border);
    border-radius: 7px;
    background: transparent;
    color: var(--text-muted);
    font-size: 12px;
    font-weight: 500;
    cursor: pointer;
    transition: color 0.12s, border-color 0.12s, background 0.12s;
  }

  .new-btn:hover {
    color: var(--accent);
    border-color: var(--accent);
    background: color-mix(in srgb, var(--accent) 6%, transparent);
  }

  .new-icon {
    font-size: 15px;
    line-height: 1;
    color: var(--accent);
    font-weight: 300;
  }

  /* ── Group heading ── */
  .group-heading {
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--text-dim);
    padding: 14px 4px 6px;
    flex-shrink: 0;
  }

  .group-heading.danger {
    color: #e06c75;
    opacity: 0.9;
  }

  /* ── Item list (flat, no card borders) ── */
  .item-list {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
  }

  /* ── Commitment row ── */
  .commit-row {
    display: flex;
    flex-direction: column;
    border-radius: 8px;
    transition: background 0.1s;
    position: relative;
  }

  .commit-row:hover {
    background: var(--surface-hover, color-mix(in srgb, var(--surface) 60%, transparent));
  }

  .commit-row.is-expanded {
    background: var(--surface);
    border: 1px solid var(--border-hover, var(--border));
    margin: 3px 0;
  }

  /* ── Row main line ── */
  .row-main {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 10px;
    cursor: pointer;
    min-width: 0;
  }

  .is-expanded .row-main {
    cursor: default;
    padding-bottom: 6px;
  }

  /* ── CSS circle checkbox ── */
  .circle-check {
    flex-shrink: 0;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    border: 1.5px solid var(--border-hover, color-mix(in srgb, var(--text-dim) 60%, transparent));
    cursor: pointer;
    position: relative;
    transition: border-color 0.15s, background 0.15s;
    display: block;
  }

  .circle-check:hover {
    border-color: var(--accent);
  }

  .circle-check:hover::before {
    content: "";
    position: absolute;
    inset: 2px;
    border-radius: 50%;
    background: color-mix(in srgb, var(--accent) 35%, transparent);
  }

  .circle-check.adding {
    border-style: dashed;
    border-color: var(--text-dim);
    cursor: default;
  }

  .circle-check.adding:hover {
    border-color: var(--text-dim);
  }

  .circle-check.adding::before {
    display: none;
  }

  .circle-check.is-done {
    border-color: var(--accent);
    background: color-mix(in srgb, var(--accent) 20%, transparent);
    cursor: pointer;
  }

  .circle-check.is-done::after {
    content: "";
    position: absolute;
    left: 3px;
    top: 1.5px;
    width: 5px;
    height: 8px;
    border: 1.5px solid var(--accent);
    border-top: none;
    border-left: none;
    transform: rotate(45deg);
  }

  /* ── Row text ── */
  .row-text {
    flex: 1;
    font-size: 14px;
    color: var(--text);
    line-height: 1.4;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  /* ── Chips ── */
  .chips {
    display: flex;
    gap: 5px;
    align-items: center;
    flex-shrink: 0;
  }

  .chip {
    font-size: 10px;
    font-weight: 500;
    padding: 2px 7px;
    border-radius: 10px;
    white-space: nowrap;
    line-height: 1.5;
  }

  .person-chip {
    background: color-mix(in srgb, var(--oberon) 15%, transparent);
    color: var(--oberon);
  }

  .due-chip {
    background: color-mix(in srgb, var(--text-dim) 15%, transparent);
    color: var(--text-dim);
  }

  .due-chip.due-urgent {
    background: color-mix(in srgb, #e06c75 15%, transparent);
    color: #e06c75;
  }

  .done-chip {
    opacity: 0.5;
  }

  /* ── Delete button (hover reveal) ── */
  .delete-btn {
    flex-shrink: 0;
    background: none;
    border: none;
    font-size: 14px;
    color: var(--text-dim);
    cursor: pointer;
    padding: 2px 5px;
    border-radius: 4px;
    line-height: 1;
    opacity: 0;
    transition: opacity 0.1s, color 0.1s, background 0.1s;
  }

  .commit-row:hover .delete-btn,
  .spark-row:hover .spark-delete {
    opacity: 1;
  }

  .delete-btn:hover {
    color: #e06c75;
    background: color-mix(in srgb, #e06c75 10%, transparent);
  }

  /* ── Inline expand area ── */
  .row-wrap {
    display: flex;
    flex-direction: column;
    border-radius: 8px;
    margin-bottom: 6px;
  }

  .row-wrap.expanded {
    background: var(--surface);
    border: 1px solid var(--accent);
  }

  .row-wrap .row-main {
    padding: 10px 12px 6px;
    cursor: default;
  }

  .row-expand {
    padding: 4px 12px 12px 38px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    animation: expand-in 0.15s ease;
  }

  @keyframes expand-in {
    from { opacity: 0; transform: translateY(-4px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  .expand-fields {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }

  .expand-actions {
    display: flex;
    gap: 6px;
    align-items: center;
  }

  /* ── Form inputs ── */
  .row-title-input {
    flex: 1;
    background: transparent;
    border: none;
    border-bottom: 1px solid var(--border);
    color: var(--text);
    font-size: 14px;
    padding: 2px 0;
    outline: none;
    min-width: 0;
    transition: border-color 0.15s;
  }

  .row-title-input:focus {
    border-bottom-color: var(--accent);
  }

  .field-input {
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: 6px;
    color: var(--text);
    font-size: 12px;
    padding: 5px 10px;
    outline: none;
    min-width: 120px;
    transition: border-color 0.15s;
  }

  .field-input:focus {
    border-color: var(--accent);
  }

  .field-date {
    min-width: 130px;
    color-scheme: dark;
  }

  .save-btn {
    padding: 5px 14px;
    background: var(--accent);
    border: none;
    border-radius: 6px;
    color: #000;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    transition: opacity 0.15s;
  }

  .save-btn:disabled { opacity: 0.3; cursor: not-allowed; }
  .save-btn:not(:disabled):hover { opacity: 0.82; }

  .cancel-btn {
    padding: 5px 12px;
    background: transparent;
    border: 1px solid var(--border);
    border-radius: 6px;
    color: var(--text-muted);
    font-size: 12px;
    cursor: pointer;
    transition: border-color 0.15s, color 0.15s;
  }

  .cancel-btn:hover { border-color: var(--border-hover); color: var(--text); }

  /* ── Completed section ── */
  .completed-toggle {
    display: flex;
    align-items: center;
    gap: 7px;
    background: none;
    border: none;
    color: var(--text-dim);
    font-size: 12px;
    cursor: pointer;
    padding: 12px 4px 6px;
    text-align: left;
    transition: color 0.15s;
    flex-shrink: 0;
  }

  .completed-toggle:hover { color: var(--text-muted); }

  .toggle-arrow { font-size: 10px; }

  .completed-count {
    font-size: 10px;
    font-weight: 700;
    padding: 1px 6px;
    border-radius: 8px;
    background: color-mix(in srgb, var(--text-dim) 15%, transparent);
    color: var(--text-dim);
  }

  .completed-list .commit-row { opacity: 0.55; }
  .completed-list .commit-row:hover { opacity: 0.75; }

  .done-row .row-main { cursor: default; }

  .done-text {
    text-decoration: line-through;
    color: var(--text-muted);
  }

  /* ── Sparks ── */
  .spark-list {
    margin-top: 4px;
  }

  .spark-row {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 10px;
    border-radius: 8px;
    transition: background 0.1s;
    position: relative;
  }

  .spark-row:hover {
    background: var(--surface-hover, color-mix(in srgb, var(--surface) 60%, transparent));
  }

  .spark-diamond {
    font-size: 12px;
    color: var(--accent);
    opacity: 0.55;
    flex-shrink: 0;
    line-height: 1;
  }

  .spark-diamond.adding {
    opacity: 0.35;
  }

  .spark-text {
    flex: 1;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .spark-hover-actions {
    display: flex;
    align-items: center;
    gap: 4px;
    opacity: 0;
    transition: opacity 0.12s;
    flex-shrink: 0;
  }

  .spark-row:hover .spark-hover-actions {
    opacity: 1;
  }

  .commit-action-btn {
    font-size: 11px;
    font-weight: 600;
    padding: 3px 9px;
    border: none;
    border-radius: 5px;
    background: color-mix(in srgb, var(--accent) 12%, transparent);
    color: var(--accent);
    cursor: pointer;
    white-space: nowrap;
    transition: background 0.12s;
  }

  .commit-action-btn:hover {
    background: color-mix(in srgb, var(--accent) 22%, transparent);
  }

  .spark-delete {
    opacity: 0;
  }

  /* ── Spark add row ── */
  .spark-add-row {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 12px;
    border-radius: 8px;
    background: var(--surface);
    border: 1px solid var(--accent);
    margin-bottom: 8px;
  }

  .spark-add-input {
    flex: 1;
    background: transparent;
    border: none;
    border-bottom: 1px solid var(--border);
    color: var(--text);
    font-size: 14px;
    padding: 2px 0;
    outline: none;
    transition: border-color 0.15s;
  }

  .spark-add-input:focus {
    border-bottom-color: var(--accent);
  }

  /* ── Empty state ── */
  .empty-state {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 10px;
    text-align: center;
    padding: 60px 0;
  }

  .empty-glyph {
    font-size: 36px;
    color: var(--text-dim);
    opacity: 0.25;
    line-height: 1;
  }

  .empty-msg {
    margin: 0;
    font-size: 14px;
    color: var(--text-muted);
  }

  .empty-hint {
    margin: 0;
    font-size: 11px;
    color: var(--text-dim);
    font-family: var(--font-mono);
    max-width: 300px;
  }

  .empty-cta {
    background: none;
    border: none;
    color: var(--accent);
    font-size: 13px;
    cursor: pointer;
    padding: 0;
    transition: opacity 0.15s;
  }

  .empty-cta:hover { opacity: 0.75; }
</style>
