const STORAGE_KEY = "the_pattern_top3";

export type Top3Item = { text: string; done: boolean };

function todayKey(): string {
  return new Date().toISOString().split("T")[0];
}

function emptyItems(): Top3Item[] {
  return [
    { text: "", done: false },
    { text: "", done: false },
    { text: "", done: false },
  ];
}

function load(): { date: string; items: Top3Item[] } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { date: todayKey(), items: emptyItems() };
    const parsed = JSON.parse(raw);
    if (parsed.date !== todayKey()) return { date: todayKey(), items: emptyItems() };
    return parsed;
  } catch {
    return { date: todayKey(), items: emptyItems() };
  }
}

function createTop3Store() {
  const initial = load();
  let date = $state(initial.date);
  let items = $state<Top3Item[]>(initial.items);

  function persist() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ date, items }));
  }

  function checkDay() {
    const today = todayKey();
    if (date !== today) {
      date = today;
      items = emptyItems();
      persist();
    }
  }

  return {
    get items() {
      checkDay();
      return items;
    },
    get doneCount() {
      return items.filter((i) => i.done).length;
    },
    get filledCount() {
      return items.filter((i) => i.text.trim()).length;
    },

    setText(index: number, text: string) {
      items[index] = { ...items[index], text };
      persist();
    },

    toggle(index: number) {
      if (!items[index].text.trim()) return;
      items[index] = { ...items[index], done: !items[index].done };
      persist();
    },
  };
}

export const top3Store = createTop3Store();
