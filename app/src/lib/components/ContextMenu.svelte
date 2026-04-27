<script lang="ts">
  import { onMount } from "svelte";

  export type MenuSeparator = { separator: true };
  export type MenuItem = {
    separator?: false;
    label: string;
    checked?: boolean;
    disabled?: boolean;
    danger?: boolean;
    action: () => void;
  };
  export type MenuEntry = MenuItem | MenuSeparator;

  let { x, y, items, onClose }: {
    x: number;
    y: number;
    items: MenuEntry[];
    onClose: () => void;
  } = $props();

  let menuEl = $state<HTMLDivElement | null>(null);
  let adjustedX = $state(x);
  let adjustedY = $state(y);

  onMount(() => {
    if (menuEl) {
      const rect = menuEl.getBoundingClientRect();
      adjustedX = Math.min(x, window.innerWidth - rect.width - 8);
      adjustedY = Math.min(y, window.innerHeight - rect.height - 8);
    }

    function onMousedown(e: MouseEvent) {
      if (menuEl && !menuEl.contains(e.target as Node)) onClose();
    }
    function onKeydown(e: KeyboardEvent) {
      if (e.key === "Escape") { e.stopPropagation(); onClose(); }
    }
    document.addEventListener("mousedown", onMousedown, true);
    document.addEventListener("keydown", onKeydown, true);
    return () => {
      document.removeEventListener("mousedown", onMousedown, true);
      document.removeEventListener("keydown", onKeydown, true);
    };
  });
</script>

<div
  class="context-menu"
  bind:this={menuEl}
  style="left: {adjustedX}px; top: {adjustedY}px;"
  role="menu"
>
  {#each items as item}
    {#if item.separator}
      <div class="separator" role="separator"></div>
    {:else}
      <button
        class="menu-item"
        class:checked={item.checked}
        class:danger={item.danger}
        disabled={item.disabled}
        role="menuitem"
        onclick={() => { item.action(); onClose(); }}
      >
        <span class="check-slot">{item.checked ? "✓" : ""}</span>
        {item.label}
      </button>
    {/if}
  {/each}
</div>

<style>
  .context-menu {
    position: fixed;
    z-index: 9999;
    background: #1c2232;
    border: 1px solid var(--border-hover);
    border-radius: 8px;
    padding: 4px;
    min-width: 190px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.55);
    animation: pop-in 0.08s ease;
  }

  @keyframes pop-in {
    from { opacity: 0; transform: scale(0.95); }
    to   { opacity: 1; transform: scale(1); }
  }

  .menu-item {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    padding: 6px 10px;
    border: none;
    border-radius: 5px;
    background: transparent;
    color: var(--text-muted);
    font-size: 12px;
    text-align: left;
    cursor: pointer;
    transition: background 0.1s, color 0.1s;
  }

  .menu-item:hover:not(:disabled) {
    background: var(--surface-hover);
    color: var(--text);
  }

  .menu-item:disabled { opacity: 0.35; cursor: default; }

  .menu-item.checked { color: var(--accent); }
  .menu-item.danger { color: #e06c75; }
  .menu-item.danger:hover:not(:disabled) { background: color-mix(in srgb, #e06c75 12%, transparent); color: #ff8b96; }

  .check-slot {
    width: 12px;
    font-size: 10px;
    color: var(--accent);
    flex-shrink: 0;
  }

  .separator {
    height: 1px;
    background: var(--border);
    margin: 4px 6px;
  }
</style>
