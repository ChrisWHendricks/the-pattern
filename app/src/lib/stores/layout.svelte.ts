const ls = (k: string) =>
  typeof localStorage !== "undefined" ? localStorage.getItem(k) : null;

function createLayoutStore() {
  let sidebarWidth = $state(parseInt(ls("layout_sidebar_w") ?? "220"));
  let oberonWidth = $state(parseInt(ls("layout_oberon_w") ?? "360"));
  let oberonOpen = $state(ls("layout_oberon_open") !== "false");

  function clampSidebar(w: number) { return Math.max(160, Math.min(380, w)); }
  function clampOberon(w: number)  { return Math.max(280, Math.min(640, w)); }

  return {
    get sidebarWidth() { return sidebarWidth; },
    get oberonWidth()  { return oberonWidth; },
    get oberonOpen()   { return oberonOpen; },

    resizeSidebar(delta: number) {
      sidebarWidth = clampSidebar(sidebarWidth + delta);
      localStorage.setItem("layout_sidebar_w", String(sidebarWidth));
    },
    resizeOberon(delta: number) {
      oberonWidth = clampOberon(oberonWidth - delta);
      localStorage.setItem("layout_oberon_w", String(oberonWidth));
    },
    toggleOberon() {
      oberonOpen = !oberonOpen;
      localStorage.setItem("layout_oberon_open", String(oberonOpen));
    },
    openOberon() {
      if (!oberonOpen) {
        oberonOpen = true;
        localStorage.setItem("layout_oberon_open", "true");
      }
    },
  };
}

export const layoutStore = createLayoutStore();
