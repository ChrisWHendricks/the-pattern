import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import type { EditorView } from "@tiptap/pm/view";

const key = new PluginKey("blockActions");

// Find the top-level block element under a client Y coordinate
function blockAtY(editorView: EditorView, clientY: number): Element | null {
  for (const child of editorView.dom.children) {
    const r = child.getBoundingClientRect();
    if (clientY >= r.top - 2 && clientY <= r.bottom + 2) return child;
  }
  return null;
}

// Get the ProseMirror "before" position of a top-level block DOM element
function posOfBlock(editorView: EditorView, blockEl: Element): number | null {
  try {
    const inner = blockEl.firstChild ?? blockEl;
    const pos = editorView.posAtDOM(inner as Node, 0);
    const $pos = editorView.state.doc.resolve(pos);
    // Walk up to depth 1 (direct child of doc)
    if ($pos.depth === 0) return 0;
    return $pos.before(1);
  } catch {
    return null;
  }
}

// Move a top-level block from srcPos to just before/after the block at tgtPos
function moveBlock(
  editorView: EditorView,
  srcPos: number,
  tgtPos: number,
  insertBefore: boolean
) {
  const { state } = editorView;
  const { doc, tr } = state;

  const srcNode = doc.nodeAt(srcPos);
  if (!srcNode) return;
  const srcEnd = srcPos + srcNode.nodeSize;

  const tgtNode = doc.nodeAt(tgtPos);
  if (!tgtNode) return;

  if (srcPos === tgtPos) return;

  const insertAt = insertBefore ? tgtPos : tgtPos + tgtNode.nodeSize;
  let newTr = tr;

  // Always delete first, then map the insert position
  newTr = newTr.delete(srcPos, srcEnd);
  const mappedInsert = newTr.mapping.map(insertAt);
  newTr = newTr.insert(mappedInsert, srcNode);

  editorView.dispatch(newTr.scrollIntoView());
}

function createPlugin(onAddBlock: (pos: number) => void) {
  return new Plugin({
    key,
    view(editorView) {
      // Handle widget — fixed position, appended to body
      const handle = document.createElement("div");
      handle.className = "block-handle";

      const addBtn = document.createElement("button");
      addBtn.className = "block-add";
      addBtn.title = "Add block";
      addBtn.textContent = "+";

      const dragBtn = document.createElement("div");
      dragBtn.className = "block-drag";
      dragBtn.title = "Drag to reorder";
      dragBtn.setAttribute("draggable", "true");
      dragBtn.textContent = "⠿";

      handle.appendChild(addBtn);
      handle.appendChild(dragBtn);
      document.body.appendChild(handle);

      // Drop indicator
      const dropLine = document.createElement("div");
      dropLine.className = "block-drop-line";
      document.body.appendChild(dropLine);

      let currentBlockEl: Element | null = null;
      let hideTimer: ReturnType<typeof setTimeout> | null = null;
      let dragSrcPos: number | null = null;

      function showAt(blockEl: Element) {
        if (hideTimer) { clearTimeout(hideTimer); hideTimer = null; }
        currentBlockEl = blockEl;
        const r = blockEl.getBoundingClientRect();
        handle.style.top = `${r.top + window.scrollY}px`;
        handle.style.left = `${r.left - 52}px`;
        handle.style.height = `${r.height}px`;
        handle.style.display = "flex";
      }

      function scheduleHide() {
        hideTimer = setTimeout(() => {
          if (!handle.matches(":hover")) {
            handle.style.display = "none";
            currentBlockEl = null;
          }
        }, 250);
      }

      editorView.dom.addEventListener("mousemove", (e: MouseEvent) => {
        const blockEl = blockAtY(editorView, e.clientY);
        if (blockEl) showAt(blockEl);
      });
      editorView.dom.addEventListener("mouseleave", scheduleHide);
      handle.addEventListener("mouseenter", () => {
        if (hideTimer) { clearTimeout(hideTimer); hideTimer = null; }
      });
      handle.addEventListener("mouseleave", scheduleHide);

      // + button: insert empty paragraph below and trigger slash menu
      addBtn.addEventListener("click", () => {
        if (!currentBlockEl) return;
        const pos = posOfBlock(editorView, currentBlockEl);
        if (pos === null) return;
        handle.style.display = "none";
        onAddBlock(pos);
      });

      // Drag start
      dragBtn.addEventListener("dragstart", (e: DragEvent) => {
        if (!currentBlockEl) return;
        const pos = posOfBlock(editorView, currentBlockEl);
        if (pos === null) return;
        dragSrcPos = pos;
        e.dataTransfer!.effectAllowed = "move";
        e.dataTransfer!.setData("text/plain", "");

        // Create a clean drag ghost
        const ghost = document.createElement("div");
        ghost.className = "block-drag-ghost";
        ghost.textContent = currentBlockEl.textContent?.slice(0, 60) ?? "Block";
        document.body.appendChild(ghost);
        e.dataTransfer!.setDragImage(ghost, 0, 16);
        setTimeout(() => ghost.remove(), 0);
      });

      dragBtn.addEventListener("dragend", () => {
        dragSrcPos = null;
        dropLine.style.display = "none";
      });

      // Drag over editor — show the drop line
      editorView.dom.addEventListener("dragover", (e: DragEvent) => {
        if (dragSrcPos === null) return;
        e.preventDefault();
        e.dataTransfer!.dropEffect = "move";
        const blockEl = blockAtY(editorView, e.clientY);
        if (!blockEl) { dropLine.style.display = "none"; return; }
        const r = blockEl.getBoundingClientRect();
        const above = e.clientY < r.top + r.height / 2;
        const lineY = above ? r.top - 1 : r.bottom + 1;
        dropLine.style.display = "block";
        dropLine.style.top = `${lineY + window.scrollY}px`;
        dropLine.style.left = `${r.left}px`;
        dropLine.style.width = `${r.width}px`;
      });

      editorView.dom.addEventListener("dragleave", () => {
        dropLine.style.display = "none";
      });

      editorView.dom.addEventListener("drop", (e: DragEvent) => {
        e.preventDefault();
        dropLine.style.display = "none";
        if (dragSrcPos === null) return;

        const tgtBlockEl = blockAtY(editorView, e.clientY);
        if (!tgtBlockEl) { dragSrcPos = null; return; }

        const tgtPos = posOfBlock(editorView, tgtBlockEl);
        if (tgtPos === null) { dragSrcPos = null; return; }

        const r = tgtBlockEl.getBoundingClientRect();
        const insertBefore = e.clientY < r.top + r.height / 2;
        moveBlock(editorView, dragSrcPos, tgtPos, insertBefore);
        dragSrcPos = null;
      });

      return {
        destroy() {
          handle.remove();
          dropLine.remove();
        },
      };
    },
  });
}

export const BlockActions = Extension.create({
  name: "blockActions",

  addOptions() {
    return {
      onAddBlock: (_pos: number) => {},
    };
  },

  addProseMirrorPlugins() {
    return [createPlugin(this.options.onAddBlock)];
  },
});
