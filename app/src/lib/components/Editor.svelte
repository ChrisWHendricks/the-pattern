<script lang="ts">
  import { Editor } from "@tiptap/core";
  import StarterKit from "@tiptap/starter-kit";
  import Placeholder from "@tiptap/extension-placeholder";
  import { marked } from "marked";
  import TurndownService from "turndown";

  type Props = {
    content: string;
    onSave: (markdown: string) => void;
    onDirty?: () => void;
    saving?: boolean;
    chatOpen?: boolean;
    onToggleChat?: () => void;
  };

  let { content, onSave, onDirty, saving = false, chatOpen = false, onToggleChat }: Props = $props();

  let editorEl = $state<HTMLElement | null>(null);
  let rawMode = $state(false);
  // eslint-disable-next-line svelte/valid-prop-bindings
  let rawContent = $state(content);
  let editor: Editor | null = null;
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;

  const AUTOSAVE_DELAY = 1500;

  function scheduleAutosave() {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      debounceTimer = null;
      save();
    }, AUTOSAVE_DELAY);
  }

  const td = new TurndownService({
    headingStyle: "atx",
    bulletListMarker: "-",
    codeBlockStyle: "fenced",
  });

  function toHtml(md: string): string {
    try {
      return marked.parse(md, { async: false }) as string;
    } catch {
      return md;
    }
  }

  function toMarkdown(html: string): string {
    return td.turndown(html);
  }

  $effect(() => {
    const el = editorEl;
    if (!el) return;

    const e = new Editor({
      element: el,
      extensions: [
        StarterKit,
        Placeholder.configure({ placeholder: "Start writing…" }),
      ],
      content: toHtml(content),
      editorProps: {
        attributes: { class: "prose-editor" },
      },
      onUpdate: () => {
        onDirty?.();
        scheduleAutosave();
      },
    });

    editor = e;

    return () => {
      // Flush any pending autosave before the editor is destroyed
      if (debounceTimer) {
        clearTimeout(debounceTimer);
        debounceTimer = null;
        if (!e.isDestroyed) onSave(toMarkdown(e.getHTML()));
      }
      editor = null;
      e.destroy();
    };
  });

  function save() {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
      debounceTimer = null;
    }
    if (rawMode) {
      onSave(rawContent);
    } else if (editor) {
      onSave(toMarkdown(editor.getHTML()));
    }
  }

  function toggleRaw() {
    if (!rawMode && editor) {
      rawContent = toMarkdown(editor.getHTML());
    } else if (rawMode && editor) {
      editor.commands.setContent(toHtml(rawContent));
    }
    rawMode = !rawMode;
  }

  function handleKeydown(e: KeyboardEvent) {
    if ((e.metaKey || e.ctrlKey) && e.key === "s") {
      e.preventDefault();
      save();
    }
  }

  type ToolbarAction = {
    label: string;
    title: string;
    active?: () => boolean;
    action: () => void;
  };

  const toolbarGroups: ToolbarAction[][] = [
    [
      {
        label: "H1",
        title: "Heading 1",
        active: () => editor?.isActive("heading", { level: 1 }) ?? false,
        action: () => editor?.chain().focus().toggleHeading({ level: 1 }).run(),
      },
      {
        label: "H2",
        title: "Heading 2",
        active: () => editor?.isActive("heading", { level: 2 }) ?? false,
        action: () => editor?.chain().focus().toggleHeading({ level: 2 }).run(),
      },
      {
        label: "H3",
        title: "Heading 3",
        active: () => editor?.isActive("heading", { level: 3 }) ?? false,
        action: () => editor?.chain().focus().toggleHeading({ level: 3 }).run(),
      },
    ],
    [
      {
        label: "B",
        title: "Bold",
        active: () => editor?.isActive("bold") ?? false,
        action: () => editor?.chain().focus().toggleBold().run(),
      },
      {
        label: "I",
        title: "Italic",
        active: () => editor?.isActive("italic") ?? false,
        action: () => editor?.chain().focus().toggleItalic().run(),
      },
      {
        label: "⌥",
        title: "Code",
        active: () => editor?.isActive("code") ?? false,
        action: () => editor?.chain().focus().toggleCode().run(),
      },
    ],
    [
      {
        label: "•—",
        title: "Bullet list",
        active: () => editor?.isActive("bulletList") ?? false,
        action: () => editor?.chain().focus().toggleBulletList().run(),
      },
      {
        label: "1—",
        title: "Ordered list",
        active: () => editor?.isActive("orderedList") ?? false,
        action: () => editor?.chain().focus().toggleOrderedList().run(),
      },
      {
        label: "❝",
        title: "Blockquote",
        active: () => editor?.isActive("blockquote") ?? false,
        action: () => editor?.chain().focus().toggleBlockquote().run(),
      },
    ],
  ];
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="editor-wrap">
  <div class="toolbar">
    {#if !rawMode}
      {#each toolbarGroups as group, i}
        {#if i > 0}<div class="toolbar-sep"></div>{/if}
        {#each group as btn}
          <button
            class="toolbar-btn"
            class:active={btn.active?.()}
            onclick={btn.action}
            title={btn.title}
          >{btn.label}</button>
        {/each}
      {/each}
    {/if}

    <div class="toolbar-spacer"></div>

    {#if onToggleChat}
      <button
        class="toolbar-btn chat-btn"
        class:active={chatOpen}
        onclick={onToggleChat}
        title={chatOpen ? "Hide Oberon" : "Ask Oberon"}
      >◈</button>
    {/if}

    <button
      class="toolbar-btn raw-btn"
      class:active={rawMode}
      onclick={toggleRaw}
      title="Toggle raw markdown"
    >Raw</button>

    <span class="save-status" class:visible={saving}>Saving…</span>
  </div>

  {#if rawMode}
    <textarea
      class="raw-editor"
      bind:value={rawContent}
      oninput={() => { onDirty?.(); scheduleAutosave(); }}
      spellcheck={false}
    ></textarea>
  {:else}
    <div class="editor-content" bind:this={editorEl}></div>
  {/if}
</div>

<style>
  .editor-wrap {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-height: 0;
    background: var(--bg);
  }

  .toolbar {
    display: flex;
    align-items: center;
    gap: 2px;
    padding: 8px 16px;
    border-bottom: 1px solid var(--border);
    background: var(--sidebar-bg);
    flex-shrink: 0;
  }

  .toolbar-btn {
    padding: 4px 8px;
    border: none;
    border-radius: 5px;
    background: transparent;
    color: var(--text-muted);
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.1s, color 0.1s;
    min-width: 28px;
    text-align: center;
    font-family: var(--font-sans);
  }

  .toolbar-btn:hover {
    background: var(--surface-hover);
    color: var(--text);
  }

  .toolbar-btn.active {
    background: var(--surface-hover);
    color: var(--accent);
  }

  .toolbar-sep {
    width: 1px;
    height: 16px;
    background: var(--border);
    margin: 0 4px;
    flex-shrink: 0;
  }

  .toolbar-spacer {
    flex: 1;
  }

  .raw-btn.active {
    color: var(--oberon);
  }

  .chat-btn.active {
    color: var(--accent);
    background: color-mix(in srgb, var(--accent) 10%, transparent);
  }

  .save-status {
    font-size: 11px;
    color: var(--text-dim);
    padding: 0 4px;
    opacity: 0;
    transition: opacity 0.2s;
    pointer-events: none;
  }

  .save-status.visible {
    opacity: 1;
  }

  .editor-content {
    flex: 1;
    overflow-y: auto;
    padding: 32px 48px;
    min-height: 0;
  }

  .editor-content :global(.prose-editor) {
    outline: none;
    min-height: 100%;
    color: var(--text);
    font-size: 15px;
    line-height: 1.7;
    font-family: var(--font-sans);
  }

  .editor-content :global(h1) {
    font-size: 1.8em;
    font-weight: 700;
    color: var(--text);
    margin: 0 0 0.6em;
    line-height: 1.2;
  }

  .editor-content :global(h2) {
    font-size: 1.3em;
    font-weight: 600;
    color: var(--text);
    margin: 1.4em 0 0.4em;
  }

  .editor-content :global(h3) {
    font-size: 1.1em;
    font-weight: 600;
    color: var(--text-muted);
    margin: 1.2em 0 0.3em;
  }

  .editor-content :global(p) {
    margin: 0 0 0.8em;
  }

  .editor-content :global(p.is-editor-empty:first-child::before) {
    content: attr(data-placeholder);
    color: var(--text-dim);
    pointer-events: none;
    float: left;
    height: 0;
  }

  .editor-content :global(ul),
  .editor-content :global(ol) {
    padding-left: 1.4em;
    margin: 0 0 0.8em;
  }

  .editor-content :global(li) {
    margin-bottom: 0.2em;
  }

  .editor-content :global(strong) {
    font-weight: 600;
    color: var(--text);
  }

  .editor-content :global(em) {
    font-style: italic;
    color: var(--text-muted);
  }

  .editor-content :global(code) {
    background: var(--surface);
    padding: 1px 5px;
    border-radius: 4px;
    font-family: var(--font-mono);
    font-size: 0.88em;
    color: var(--oberon);
  }

  .editor-content :global(pre) {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 14px 18px;
    overflow-x: auto;
    margin: 0.8em 0;
  }

  .editor-content :global(pre code) {
    background: transparent;
    padding: 0;
    font-size: 0.88em;
    color: var(--text);
  }

  .editor-content :global(blockquote) {
    border-left: 3px solid var(--accent);
    margin: 0.8em 0;
    padding: 4px 16px;
    color: var(--text-muted);
  }

  .editor-content :global(hr) {
    border: none;
    border-top: 1px solid var(--border);
    margin: 1.6em 0;
  }

  .raw-editor {
    flex: 1;
    background: var(--bg);
    border: none;
    outline: none;
    padding: 32px 48px;
    color: var(--text);
    font-family: var(--font-mono);
    font-size: 13px;
    line-height: 1.7;
    resize: none;
    min-height: 0;
  }
</style>
