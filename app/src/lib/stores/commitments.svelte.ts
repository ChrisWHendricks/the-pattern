export type Commitment = {
  id: string;
  text: string;
  person?: string;
  due?: string | null;
  createdAt: string;
  completedAt?: string;
};

const STORAGE_KEY = "the_pattern_commitments";

function load(): Commitment[] {
  if (typeof localStorage === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function createCommitmentsStore() {
  let items = $state<Commitment[]>(load());

  function persist() {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    }
  }

  return {
    get items() { return items; },
    get open() { return items.filter((c) => !c.completedAt); },
    get completed() { return items.filter((c) => !!c.completedAt); },

    add(commitment: Omit<Commitment, "id" | "createdAt">) {
      const existing = items.find(
        (c) => !c.completedAt && c.text.toLowerCase() === commitment.text.toLowerCase()
      );
      if (existing) return;

      items.push({
        ...commitment,
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
      });
      persist();
    },

    addMany(commitments: Omit<Commitment, "id" | "createdAt">[]) {
      for (const c of commitments) this.add(c);
    },

    complete(id: string) {
      const item = items.find((c) => c.id === id);
      if (item) {
        item.completedAt = new Date().toISOString();
        persist();
      }
    },

    reopen(id: string) {
      const item = items.find((c) => c.id === id);
      if (item) {
        delete item.completedAt;
        persist();
      }
    },

    remove(id: string) {
      items = items.filter((c) => c.id !== id);
      persist();
    },

    openSummary(): string {
      const open = this.open;
      if (open.length === 0) return "No open commitments.";
      const list = open
        .slice(0, 8)
        .map((c) => {
          let line = `- ${c.text}`;
          if (c.person) line += ` (for ${c.person})`;
          if (c.due) line += ` — due ${c.due}`;
          return line;
        })
        .join("\n");
      return `${open.length} open commitment${open.length !== 1 ? "s" : ""}:\n${list}`;
    },
  };
}

export const commitments = createCommitmentsStore();
