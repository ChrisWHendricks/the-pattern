import { type Shadow, type ShadowAssignments } from "$lib/shadows";

const SHADOWS_KEY = "the_pattern_shadows";
const ASSIGNMENTS_KEY = "the_pattern_assignments";

function readShadows(): Shadow[] {
  try {
    const raw = localStorage.getItem(SHADOWS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function readAssignments(): ShadowAssignments {
  try {
    const raw = localStorage.getItem(ASSIGNMENTS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function createShadowsStore() {
  let shadows = $state<Shadow[]>(readShadows());
  let assignments = $state<ShadowAssignments>(readAssignments());
  let selectedId = $state<string | null>(null);

  const selected = $derived(shadows.find((s) => s.id === selectedId) ?? null);

  function persistShadows() {
    localStorage.setItem(SHADOWS_KEY, JSON.stringify(shadows));
  }

  function persistAssignments() {
    localStorage.setItem(ASSIGNMENTS_KEY, JSON.stringify(assignments));
  }

  function load() {
    shadows = readShadows();
    assignments = readAssignments();
    if (!selectedId && shadows.length > 0) selectedId = shadows[0].id;
  }

  function createShadow(name: string, description = ""): Shadow {
    const shadow: Shadow = {
      id: crypto.randomUUID(),
      name: name.trim() || "Untitled Shadow",
      description,
      coverImage: null,
      createdAt: new Date().toISOString(),
    };
    shadows = [...shadows, shadow];
    selectedId = shadow.id;
    persistShadows();
    return shadow;
  }

  function updateShadow(id: string, patch: Partial<Omit<Shadow, "id" | "createdAt">>) {
    const idx = shadows.findIndex((s) => s.id === id);
    if (idx === -1) return;
    shadows[idx] = { ...shadows[idx], ...patch };
    shadows = [...shadows];
    persistShadows();
  }

  function deleteShadow(id: string) {
    shadows = shadows.filter((s) => s.id !== id);
    const newAssignments = { ...assignments };
    delete newAssignments[id];
    assignments = newAssignments;
    if (selectedId === id) selectedId = shadows[0]?.id ?? null;
    persistShadows();
    persistAssignments();
  }

  function assign(shadowId: string, inscriptionPath: string) {
    const current = assignments[shadowId] ?? [];
    if (current.includes(inscriptionPath)) return;
    assignments = { ...assignments, [shadowId]: [...current, inscriptionPath] };
    persistAssignments();
  }

  function unassign(shadowId: string, inscriptionPath: string) {
    const current = assignments[shadowId] ?? [];
    assignments = { ...assignments, [shadowId]: current.filter((p) => p !== inscriptionPath) };
    persistAssignments();
  }

  function isAssigned(shadowId: string, inscriptionPath: string): boolean {
    return assignments[shadowId]?.includes(inscriptionPath) ?? false;
  }

  function getInscriptionPaths(shadowId: string): string[] {
    return assignments[shadowId] ?? [];
  }

  function getShadowsForInscription(inscriptionPath: string): string[] {
    return Object.entries(assignments)
      .filter(([, paths]) => paths.includes(inscriptionPath))
      .map(([id]) => id);
  }

  function updatePath(oldPath: string, newPath: string) {
    let changed = false;
    const updated = { ...assignments };
    for (const shadowId in updated) {
      const idx = updated[shadowId].indexOf(oldPath);
      if (idx !== -1) {
        updated[shadowId] = [...updated[shadowId]];
        updated[shadowId][idx] = newPath;
        changed = true;
      }
    }
    if (changed) {
      assignments = updated;
      persistAssignments();
    }
  }

  return {
    get shadows() { return shadows; },
    get selected() { return selected; },
    get selectedId() { return selectedId; },
    get assignments() { return assignments; },
    select(id: string | null) { selectedId = id; },
    load,
    createShadow,
    updateShadow,
    deleteShadow,
    assign,
    unassign,
    isAssigned,
    getInscriptionPaths,
    getShadowsForInscription,
    updatePath,
  };
}

export const shadowsStore = createShadowsStore();
