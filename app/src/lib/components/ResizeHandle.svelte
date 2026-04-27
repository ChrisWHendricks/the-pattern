<script lang="ts">
  let { onDelta }: { onDelta: (delta: number) => void } = $props();

  let dragging = $state(false);

  function handleMouseDown(e: MouseEvent) {
    e.preventDefault();
    dragging = true;
    let last = e.clientX;

    const move = (ev: MouseEvent) => {
      onDelta(ev.clientX - last);
      last = ev.clientX;
    };

    const up = () => {
      dragging = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    };

    document.body.style.cursor = "ew-resize";
    document.body.style.userSelect = "none";
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
  }
</script>

<div
  class="resize-handle"
  class:dragging
  onmousedown={handleMouseDown}
  role="separator"
  aria-orientation="vertical"
  tabindex="0"
></div>

<style>
  .resize-handle {
    width: 5px;
    flex-shrink: 0;
    cursor: ew-resize;
    background: transparent;
    position: relative;
    z-index: 10;
    transition: background 0.15s;
  }

  .resize-handle::after {
    content: "";
    position: absolute;
    top: 0;
    bottom: 0;
    left: 2px;
    width: 1px;
    background: var(--border);
    transition: background 0.15s;
  }

  .resize-handle:hover::after,
  .resize-handle.dragging::after {
    background: var(--border-hover);
  }
</style>
