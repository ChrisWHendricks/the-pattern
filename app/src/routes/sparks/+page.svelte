<script lang="ts">
  import { page } from "$app/stores";
  import { goto } from "$app/navigation";
  import { sparks } from "$lib/stores/sparks.svelte";
  import { commitments } from "$lib/stores/commitments.svelte";
  import type { Commitment } from "$lib/stores/commitments.svelte";

  type Tab = "commitments" | "sparks";

  const tab = $derived<Tab>(
    ($page.url.searchParams.get("tab") === "sparks" ? "sparks" : "commitments")
  );

  function setTab(t: Tab) {
    goto(`/sparks?tab=${t}`, { replaceState: true });
  }

  function promote(id: string, text: string) {
    sparks.markPromoted(id);
    commitments.add({ text });
  }

  // ── Add commitment form ──
  let addingCommitment = $state(false);
  let newText = $state("");
  let newPerson = $state("");
  let newDue = $state("");

  function submitAdd() {
    const text = newText.trim();
    if (!text) return;
    commitments.add({ text, person: newPerson.trim() || undefined, due: newDue || null });
    newText = "";
    newPerson = "";
    newDue = "";
    addingCommitment = false;
  }

  function cancelAdd() {
    newText = "";
    newPerson = "";
    newDue = "";
    addingCommitment = false;
  }

  // ── Inline edit ──
  let editingId = $state<string | null>(null);
  let editText = $state("");
  let editPerson = $state("");
  let editDue = $state("");

  function startEdit(c: Commitment) {
    editingId = c.id;
    editText = c.text;
    editPerson = c.person ?? "";
    editDue = c.due ?? "";
  }

  function submitEdit() {
    if (!editingId || !editText.trim()) return;
    commitments.update(editingId, {
      text: editText.trim(),
      person: editPerson.trim() || undefined,
      due: editDue || null,
    });
    editingId = null;
  }

  function cancelEdit() {
    editingId = null;
  }

  // ── Completed toggle ──
  let showCompleted = $state(false);

  // ── Add spark ──
  let addingSpark = $state(false);
  let newSparkText = $state("");

  function submitSpark() {
    const text = newSparkText.trim();
    if (!text) return;
    sparks.add(text);
    newSparkText = "";
    addingSpark = false;
  }
</script>

<div class="page">

  <!-- Tab strip -->
  <div class="tab-strip">
    <button
      class="tab-btn"
      class:active={tab === "commitments"}
      onclick={() => setTab("commitments")}
    >
      <span class="tab-icon">◈</span>
      Commitments
      {#if commitments.open.length > 0}
        <span class="tab-count">{commitments.open.length}</span>
      {/if}
    </button>
    <button
      class="tab-btn"
      class:active={tab === "sparks"}
      onclick={() => setTab("sparks")}
    >
      <span class="tab-icon">◇</span>
      Sparks
      {#if sparks.open.length > 0}
        <span class="tab-count spark-count">{sparks.open.length}</span>
      {/if}
    </button>
  </div>

  <!-- ── Commitments tab ── -->
  {#if tab === "commitments"}
    <div class="tab-body">
      <div class="section-header">
        <span class="section-title">Open</span>
        <button class="add-btn" onclick={() => { addingCommitment = true; }}>+ Add</button>
      </div>

      {#if addingCommitment}
        <form class="add-form" onsubmit={(e) => { e.preventDefault(); submitAdd(); }}>
          <input
            class="form-input"
            bind:value={newText}
            placeholder="What did you commit to?"
            autofocus
            onkeydown={(e) => { if (e.key === "Escape") cancelAdd(); }}
          />
          <div class="form-row">
            <input
              class="form-input form-input-sm"
              bind:value={newPerson}
              placeholder="Person (optional)"
            />
            <input
              class="form-input form-input-sm"
              type="date"
              bind:value={newDue}
              title="Due date (optional)"
            />
          </div>
          <div class="form-actions">
            <button type="submit" class="btn-primary" disabled={!newText.trim()}>Add</button>
            <button type="button" class="btn-ghost" onclick={cancelAdd}>Cancel</button>
          </div>
        </form>
      {/if}

      {#if commitments.open.length === 0 && !addingCommitment}
        <div class="empty">
          <div class="empty-icon">◈</div>
          <p>No open commitments.</p>
          <button class="cta-link" onclick={() => (addingCommitment = true)}>Add one →</button>
        </div>
      {:else}
        <ul class="item-list">
          {#each commitments.open as c (c.id)}
            <li class="item-row">
              {#if editingId === c.id}
                <form class="edit-form" onsubmit={(e) => { e.preventDefault(); submitEdit(); }}>
                  <input
                    class="form-input"
                    bind:value={editText}
                    autofocus
                    onkeydown={(e) => { if (e.key === "Escape") cancelEdit(); }}
                  />
                  <div class="form-row">
                    <input
                      class="form-input form-input-sm"
                      bind:value={editPerson}
                      placeholder="Person"
                    />
                    <input
                      class="form-input form-input-sm"
                      type="date"
                      bind:value={editDue}
                    />
                  </div>
                  <div class="form-actions">
                    <button type="submit" class="btn-primary" disabled={!editText.trim()}>Save</button>
                    <button type="button" class="btn-ghost" onclick={cancelEdit}>Cancel</button>
                  </div>
                </form>
              {:else}
                <button
                  class="check-btn"
                  title="Mark complete"
                  onclick={() => commitments.complete(c.id)}
                >◻</button>
                <div class="item-body" role="button" tabindex="0"
                  onclick={() => startEdit(c)}
                  onkeydown={(e) => e.key === "Enter" && startEdit(c)}
                >
                  <span class="item-text">{c.text}</span>
                  {#if c.person || c.due}
                    <span class="item-meta">
                      {#if c.person}<span class="meta-person">→ {c.person}</span>{/if}
                      {#if c.due}<span class="meta-due">{c.due}</span>{/if}
                    </span>
                  {/if}
                </div>
                <div class="item-actions">
                  <button class="icon-btn" title="Edit" onclick={() => startEdit(c)}>✎</button>
                  <button
                    class="icon-btn danger"
                    title="Delete"
                    onclick={() => {
                      if (confirm(`Delete "${c.text}"?`)) commitments.remove(c.id);
                    }}
                  >✕</button>
                </div>
              {/if}
            </li>
          {/each}
        </ul>
      {/if}

      <!-- Completed section -->
      {#if commitments.completed.length > 0}
        <button
          class="completed-toggle"
          onclick={() => (showCompleted = !showCompleted)}
        >
          {showCompleted ? "▾" : "▸"} Completed ({commitments.completed.length})
        </button>

        {#if showCompleted}
          <ul class="item-list completed-list">
            {#each commitments.completed as c (c.id)}
              <li class="item-row item-done">
                <button
                  class="check-btn done"
                  title="Reopen"
                  onclick={() => commitments.reopen(c.id)}
                >◼</button>
                <div class="item-body">
                  <span class="item-text">{c.text}</span>
                  {#if c.person}<span class="meta-person">→ {c.person}</span>{/if}
                </div>
                <div class="item-actions">
                  <button
                    class="icon-btn danger"
                    title="Delete"
                    onclick={() => commitments.remove(c.id)}
                  >✕</button>
                </div>
              </li>
            {/each}
          </ul>
        {/if}
      {/if}
    </div>

  <!-- ── Sparks tab ── -->
  {:else}
    <div class="tab-body">
      <div class="section-header">
        <span class="section-title">Intentions without deadlines</span>
        <button class="add-btn" onclick={() => { addingSpark = true; }}>+ Add</button>
      </div>

      {#if addingSpark}
        <form class="add-form" onsubmit={(e) => { e.preventDefault(); submitSpark(); }}>
          <input
            class="form-input"
            bind:value={newSparkText}
            placeholder="Something you want to do someday…"
            autofocus
            onkeydown={(e) => { if (e.key === "Escape") { addingSpark = false; newSparkText = ""; } }}
          />
          <div class="form-actions">
            <button type="submit" class="btn-primary" disabled={!newSparkText.trim()}>Add Spark</button>
            <button type="button" class="btn-ghost" onclick={() => { addingSpark = false; newSparkText = ""; }}>Cancel</button>
          </div>
        </form>
      {/if}

      {#if sparks.open.length === 0 && !addingSpark}
        <div class="empty">
          <div class="empty-icon">◇</div>
          <p>No sparks yet.</p>
          <p class="empty-hint">Capture them during a Brain Dump or tell Oberon "add a spark: …"</p>
        </div>
      {:else}
        <ul class="item-list">
          {#each sparks.open as spark (spark.id)}
            <li class="spark-row">
              <span class="spark-icon">◇</span>
              <span class="item-text">{spark.text}</span>
              <div class="item-actions">
                <button
                  class="promote-btn"
                  onclick={() => promote(spark.id, spark.text)}
                  title="Commit to this"
                >Commit</button>
                <button
                  class="icon-btn danger"
                  onclick={() => sparks.remove(spark.id)}
                  title="Dismiss"
                >✕</button>
              </div>
            </li>
          {/each}
        </ul>
      {/if}
    </div>
  {/if}

</div>

<style>
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
    gap: 2px;
    padding: 10px 28px 0;
    border-bottom: 1px solid var(--border);
    flex-shrink: 0;
    background: var(--sidebar-bg);
  }

  .tab-btn {
    display: flex;
    align-items: center;
    gap: 7px;
    padding: 8px 16px;
    border: none;
    border-bottom: 2px solid transparent;
    margin-bottom: -1px;
    background: transparent;
    color: var(--text-muted);
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    border-radius: 6px 6px 0 0;
    transition: color 0.15s, border-color 0.15s;
  }

  .tab-btn:hover { color: var(--text); }
  .tab-btn.active { color: var(--accent); border-bottom-color: var(--accent); }

  .tab-icon { font-size: 13px; }

  .tab-count {
    font-size: 11px;
    font-weight: 700;
    padding: 1px 7px;
    border-radius: 10px;
    background: color-mix(in srgb, var(--oberon) 20%, transparent);
    color: var(--oberon);
  }

  .spark-count {
    background: color-mix(in srgb, var(--accent) 15%, transparent);
    color: var(--accent);
  }

  /* ── Tab body ── */
  .tab-body {
    flex: 1;
    overflow-y: auto;
    padding: 28px 32px;
    display: flex;
    flex-direction: column;
    gap: 12px;
    max-width: 720px;
    width: 100%;
    margin: 0 auto;
    box-sizing: border-box;
  }

  /* ── Section header ── */
  .section-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-shrink: 0;
  }

  .section-title {
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--text-dim);
  }

  .add-btn {
    font-size: 12px;
    padding: 5px 12px;
    border: 1px solid var(--border);
    border-radius: 6px;
    background: transparent;
    color: var(--text-muted);
    cursor: pointer;
    transition: color 0.15s, border-color 0.15s;
  }

  .add-btn:hover { color: var(--accent); border-color: var(--accent); }

  /* ── Forms ── */
  .add-form,
  .edit-form {
    display: flex;
    flex-direction: column;
    gap: 8px;
    background: var(--surface);
    border: 1px solid var(--accent);
    border-radius: 10px;
    padding: 14px 16px;
    flex-shrink: 0;
  }

  .form-input {
    width: 100%;
    box-sizing: border-box;
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: 7px;
    color: var(--text);
    font-size: 13px;
    padding: 8px 12px;
    outline: none;
    transition: border-color 0.15s;
  }

  .form-input:focus { border-color: var(--accent); }

  .form-input-sm { flex: 1; }

  .form-row {
    display: flex;
    gap: 8px;
  }

  .form-actions {
    display: flex;
    gap: 8px;
  }

  .btn-primary {
    padding: 6px 16px;
    background: var(--accent);
    border: none;
    border-radius: 7px;
    color: #000;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    transition: opacity 0.15s;
  }

  .btn-primary:disabled { opacity: 0.35; cursor: not-allowed; }
  .btn-primary:not(:disabled):hover { opacity: 0.85; }

  .btn-ghost {
    padding: 6px 14px;
    background: transparent;
    border: 1px solid var(--border);
    border-radius: 7px;
    color: var(--text-muted);
    font-size: 12px;
    cursor: pointer;
    transition: border-color 0.15s;
  }

  .btn-ghost:hover { border-color: var(--border-hover); }

  /* ── Item list ── */
  .item-list {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .item-row {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 12px 14px;
    transition: border-color 0.15s;
  }

  .item-row:hover { border-color: var(--border-hover); }

  .item-row.item-done {
    opacity: 0.5;
  }

  .check-btn {
    background: none;
    border: none;
    font-size: 16px;
    color: var(--text-dim);
    cursor: pointer;
    padding: 0;
    flex-shrink: 0;
    margin-top: 1px;
    line-height: 1;
    transition: color 0.15s;
  }

  .check-btn:hover { color: var(--accent); }
  .check-btn.done { color: var(--accent); }

  .item-body {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 4px;
    cursor: pointer;
    min-width: 0;
  }

  .item-text {
    font-size: 14px;
    color: var(--text);
    line-height: 1.4;
  }

  .item-done .item-text {
    text-decoration: line-through;
    color: var(--text-muted);
  }

  .item-meta {
    display: flex;
    gap: 10px;
    align-items: center;
  }

  .meta-person {
    font-size: 11px;
    color: var(--oberon);
    opacity: 0.8;
  }

  .meta-due {
    font-size: 11px;
    color: var(--text-dim);
    font-family: var(--font-mono);
  }

  .item-actions {
    display: flex;
    align-items: center;
    gap: 4px;
    flex-shrink: 0;
    opacity: 0;
    transition: opacity 0.15s;
  }

  .item-row:hover .item-actions { opacity: 1; }

  .icon-btn {
    background: none;
    border: none;
    font-size: 13px;
    color: var(--text-dim);
    cursor: pointer;
    padding: 4px 6px;
    border-radius: 5px;
    transition: background 0.1s, color 0.1s;
  }

  .icon-btn:hover { background: var(--surface-hover); color: var(--text-muted); }
  .icon-btn.danger:hover { color: #e06c75; }

  /* ── Completed toggle ── */
  .completed-toggle {
    background: none;
    border: none;
    color: var(--text-dim);
    font-size: 12px;
    cursor: pointer;
    padding: 4px 0;
    text-align: left;
    transition: color 0.15s;
    flex-shrink: 0;
  }

  .completed-toggle:hover { color: var(--text-muted); }

  .completed-list .item-row { opacity: 0.55; }

  /* ── Sparks ── */
  .spark-row {
    display: flex;
    align-items: center;
    gap: 12px;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 13px 16px;
    transition: border-color 0.15s;
  }

  .spark-row:hover { border-color: var(--border-hover); }

  .spark-icon {
    font-size: 14px;
    color: var(--accent);
    opacity: 0.6;
    flex-shrink: 0;
  }

  .promote-btn {
    font-size: 12px;
    font-weight: 600;
    padding: 4px 10px;
    border: none;
    border-radius: 6px;
    background: color-mix(in srgb, var(--accent) 12%, transparent);
    color: var(--accent);
    cursor: pointer;
    white-space: nowrap;
    transition: background 0.12s;
  }

  .promote-btn:hover { background: color-mix(in srgb, var(--accent) 22%, transparent); }

  /* ── Empty ── */
  .empty {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 10px;
    text-align: center;
    padding: 60px 0;
  }

  .empty-icon { font-size: 38px; color: var(--text-dim); opacity: 0.3; line-height: 1; }
  .empty p { margin: 0; font-size: 14px; color: var(--text-muted); }
  .empty-hint { font-size: 12px !important; color: var(--text-dim) !important; font-family: var(--font-mono); }

  .cta-link {
    background: none;
    border: none;
    color: var(--accent);
    font-size: 13px;
    cursor: pointer;
    padding: 0;
    transition: opacity 0.15s;
  }

  .cta-link:hover { opacity: 0.8; }
</style>
