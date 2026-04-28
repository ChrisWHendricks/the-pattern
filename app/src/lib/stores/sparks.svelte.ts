export type Spark = {
  id: string;
  text: string;
  createdAt: string;
  promotedAt?: string;
};

const STORAGE_KEY = "the_pattern_sparks";

function load(): Spark[] {
  if (typeof localStorage === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function createSparksStore() {
  let items = $state<Spark[]>(load());

  function persist() {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    }
  }

  return {
    get items() { return items; },
    get open() { return items.filter((s) => !s.promotedAt); },

    add(text: string) {
      const existing = items.find(
        (s) => !s.promotedAt && s.text.toLowerCase() === text.toLowerCase()
      );
      if (existing) return;

      items.push({
        id: crypto.randomUUID(),
        text,
        createdAt: new Date().toISOString(),
      });
      persist();
    },

    markPromoted(id: string) {
      const item = items.find((s) => s.id === id);
      if (item) {
        item.promotedAt = new Date().toISOString();
        persist();
      }
    },

    remove(id: string) {
      items = items.filter((s) => s.id !== id);
      persist();
    },

    openSummary(): string {
      const open = this.open;
      if (open.length === 0) return "No open sparks.";
      const list = open
        .slice(0, 10)
        .map((s) => `- ${s.text}`)
        .join("\n");
      return `${open.length} spark${open.length !== 1 ? "s" : ""}:\n${list}`;
    },
  };
}

export const sparks = createSparksStore();
