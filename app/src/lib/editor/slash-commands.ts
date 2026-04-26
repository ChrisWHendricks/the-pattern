import { Extension } from "@tiptap/core";
import Suggestion from "@tiptap/suggestion";
import type { Editor as TiptapEditor, Range } from "@tiptap/core";

export type SlashCommandItem = {
  id: string;
  label: string;
  description: string;
  icon: string;
  keywords: string[];
  execute: (editor: TiptapEditor, range: Range) => void;
};

export const ALL_COMMANDS: SlashCommandItem[] = [
  {
    id: "h1",
    label: "Heading 1",
    description: "Large section title",
    icon: "H1",
    keywords: ["h1", "heading", "title", "large"],
    execute: (e, r) => e.chain().focus().deleteRange(r).setHeading({ level: 1 }).run(),
  },
  {
    id: "h2",
    label: "Heading 2",
    description: "Section header",
    icon: "H2",
    keywords: ["h2", "heading", "section"],
    execute: (e, r) => e.chain().focus().deleteRange(r).setHeading({ level: 2 }).run(),
  },
  {
    id: "h3",
    label: "Heading 3",
    description: "Subsection header",
    icon: "H3",
    keywords: ["h3", "heading", "sub"],
    execute: (e, r) => e.chain().focus().deleteRange(r).setHeading({ level: 3 }).run(),
  },
  {
    id: "text",
    label: "Text",
    description: "Normal paragraph",
    icon: "¶",
    keywords: ["p", "text", "paragraph", "normal"],
    execute: (e, r) => e.chain().focus().deleteRange(r).setParagraph().run(),
  },
  {
    id: "bullet",
    label: "Bullet List",
    description: "Unordered list",
    icon: "•",
    keywords: ["ul", "bullet", "list", "unordered", "-"],
    execute: (e, r) => e.chain().focus().deleteRange(r).toggleBulletList().run(),
  },
  {
    id: "numbered",
    label: "Numbered List",
    description: "Ordered list",
    icon: "1.",
    keywords: ["ol", "number", "ordered", "list"],
    execute: (e, r) => e.chain().focus().deleteRange(r).toggleOrderedList().run(),
  },
  {
    id: "quote",
    label: "Blockquote",
    description: "Indented quote block",
    icon: "❝",
    keywords: ["quote", "blockquote", "callout", ">"],
    execute: (e, r) => e.chain().focus().deleteRange(r).toggleBlockquote().run(),
  },
  {
    id: "code",
    label: "Code Block",
    description: "Monospaced code",
    icon: "</>",
    keywords: ["code", "pre", "codeblock", "```"],
    execute: (e, r) => e.chain().focus().deleteRange(r).toggleCodeBlock().run(),
  },
  {
    id: "divider",
    label: "Divider",
    description: "Horizontal rule",
    icon: "—",
    keywords: ["hr", "divider", "rule", "---", "line"],
    execute: (e, r) => e.chain().focus().deleteRange(r).setHorizontalRule().run(),
  },
];

function filterCommands(query: string): SlashCommandItem[] {
  if (!query) return ALL_COMMANDS;
  const q = query.toLowerCase();
  return ALL_COMMANDS.filter(
    (cmd) =>
      cmd.label.toLowerCase().includes(q) ||
      cmd.id.includes(q) ||
      cmd.keywords.some((k) => k.includes(q))
  );
}

function makeMenuEl(
  items: SlashCommandItem[],
  selectedIndex: number,
  onSelect: (item: SlashCommandItem) => void
): HTMLElement {
  const el = document.createElement("div");
  el.className = "slash-menu";

  if (items.length === 0) {
    const empty = document.createElement("div");
    empty.className = "slash-empty";
    empty.textContent = "No commands match";
    el.appendChild(empty);
    return el;
  }

  items.forEach((item, i) => {
    const btn = document.createElement("button");
    btn.className = "slash-item" + (i === selectedIndex ? " selected" : "");
    btn.dataset.index = String(i);

    const iconSpan = document.createElement("span");
    iconSpan.className = "slash-icon";
    iconSpan.textContent = item.icon;

    const infoSpan = document.createElement("span");
    infoSpan.className = "slash-info";

    const labelSpan = document.createElement("span");
    labelSpan.className = "slash-label";
    labelSpan.textContent = item.label;

    const descSpan = document.createElement("span");
    descSpan.className = "slash-desc";
    descSpan.textContent = item.description;

    infoSpan.appendChild(labelSpan);
    infoSpan.appendChild(descSpan);
    btn.appendChild(iconSpan);
    btn.appendChild(infoSpan);

    btn.addEventListener("mousedown", (e) => {
      e.preventDefault();
      onSelect(item);
    });

    el.appendChild(btn);
  });

  return el;
}

function positionMenu(el: HTMLElement, rect: DOMRect) {
  const menuH = Math.min(ALL_COMMANDS.length * 52 + 12, 320);
  const spaceBelow = window.innerHeight - rect.bottom;
  el.style.position = "fixed";
  el.style.zIndex = "9999";
  el.style.left = `${rect.left}px`;
  el.style.top =
    spaceBelow >= menuH
      ? `${rect.bottom + 4}px`
      : `${rect.top - menuH - 4}px`;
}

export const SlashCommands = Extension.create({
  name: "slashCommands",

  addOptions() {
    return {
      suggestion: {
        char: "/",
        allowSpaces: false,
        startOfLine: false,
        command: ({
          editor,
          range,
          props,
        }: {
          editor: TiptapEditor;
          range: Range;
          props: SlashCommandItem;
        }) => {
          props.execute(editor, range);
        },
        items: ({ query }: { query: string }) => filterCommands(query),
        render: () => {
          let menuEl: HTMLElement | null = null;
          let items: SlashCommandItem[] = [];
          let selectedIndex = 0;
          let execCmd: ((item: SlashCommandItem) => void) | null = null;

          function refresh() {
            if (!menuEl) return;
            const saved = { pos: menuEl.style.cssText };
            const next = makeMenuEl(items, selectedIndex, (item) => execCmd?.(item));
            next.style.cssText = saved.pos;
            menuEl.replaceWith(next);
            menuEl = next;
          }

          return {
            onStart(props: {
              items: SlashCommandItem[];
              clientRect?: (() => DOMRect | null) | null;
              command: (item: SlashCommandItem) => void;
            }) {
              items = props.items;
              selectedIndex = 0;
              execCmd = props.command;
              menuEl = makeMenuEl(items, 0, (item) => props.command(item));
              document.body.appendChild(menuEl);
              const rect = props.clientRect?.();
              if (rect) positionMenu(menuEl, rect);
            },

            onUpdate(props: {
              items: SlashCommandItem[];
              clientRect?: (() => DOMRect | null) | null;
              command: (item: SlashCommandItem) => void;
            }) {
              items = props.items;
              selectedIndex = Math.min(selectedIndex, Math.max(0, items.length - 1));
              execCmd = props.command;
              refresh();
              const rect = props.clientRect?.();
              if (rect && menuEl) positionMenu(menuEl, rect);
            },

            onKeyDown({ event }: { event: KeyboardEvent }) {
              if (!items.length) return false;
              if (event.key === "ArrowDown") {
                selectedIndex = (selectedIndex + 1) % items.length;
                refresh();
                return true;
              }
              if (event.key === "ArrowUp") {
                selectedIndex = (selectedIndex - 1 + items.length) % items.length;
                refresh();
                return true;
              }
              if (event.key === "Enter" || event.key === "Tab") {
                if (items[selectedIndex]) execCmd?.(items[selectedIndex]);
                return true;
              }
              if (event.key === "Escape") {
                menuEl?.remove();
                menuEl = null;
                return true;
              }
              return false;
            },

            onExit() {
              menuEl?.remove();
              menuEl = null;
            },
          };
        },
      },
    };
  },

  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        ...this.options.suggestion,
      }),
    ];
  },
});
