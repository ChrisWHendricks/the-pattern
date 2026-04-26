import {
  loadShadows, saveShadows,
  loadAssignments, saveAssignments,
  type Shadow, type ShadowAssignments,
} from "$lib/shadows";
import { settings } from "$lib/stores/settings.svelte";

function createShadowsStore() {
  let shadows = $state<Shadow[]>([]);
  let assignments = $state<ShadowAssignments>({});
  let selectedId = $state<string | null>(null);
  let isLoading = $state(false);
  let error = $state<string | null>(null);

  const selected = $derived(shadows.find((s) => s.id === selectedId) ?? null);

  async function load() {
    if (!settings.vaultPath) return;
    isLoading = true;
    try {
      const [s, a] = await Promise.all([
        loadShadows(settings.vaultPath),
        loadAssignments(settings.vaultPath),
      ]);
      shadows = s;
      assignments = a;
      if (!selectedId && shadows.length > 0) selectedId = shadows[0].id;
    } catch (e) {
      error = e instanceof Error ? e.message : "Failed to load shadows";
    } finally {
      isLoading = false;
    }
  }

  async function createShadow(name: string, description = ""): Promise<Shadow> {
    const shadow: Shadow = {
      id: crypto.randomUUID(),
      name: name.trim() || "Untitled Shadow",
      description,
      coverImage: null,
      createdAt: new Date().toISOString(),
    };
    shadows = [...shadows, shadow];
    selectedId = shadow.id;
    await saveShadows(settings.vaultPath, shadows);
    return shadow;
  }

  async function updateShadow(id: string, patch: Partial<Omit<Shadow, "id" | "createdAt">>) {
    const idx = shadows.findIndex((s) => s.id === id);
    if (idx === -1) return;
    shadows[idx] = { ...shadows[idx], ...patch };
    shadows = [...shadows];
    await saveShadows(settings.vaultPath, shadows);
  }

  async function deleteShadow(id: string) {
    shadows = shadows.filter((s) => s.id !== id);
    const newAssignments = { ...assignments };
    delete newAssignments[id];
    assignments = newAssignments;
    if (selectedId === id) selectedId = shadows[0]?.id ?? null;
    await Promise.all([
      saveShadows(settings.vaultPath, shadows),
      saveAssignments(settings.vaultPath, assignments),
    ]);
  }

  async function assign(shadowId: string, inscriptionPath: string) {
    const current = assignments[shadowId] ?? [];
    if (current.includes(inscriptionPath)) return;
    assignments = { ...assignments, [shadowId]: [...current, inscriptionPath] };
    await saveAssignments(settings.vaultPath, assignments);
  }

  async function unassign(shadowId: string, inscriptionPath: string) {
    const current = assignments[shadowId] ?? [];
    assignments = { ...assignments, [shadowId]: current.filter((p) => p !== inscriptionPath) };
    await saveAssignments(settings.vaultPath, assignments);
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

  async function updatePath(oldPath: string, newPath: string) {
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
      await saveAssignments(settings.vaultPath, assignments);
    }
  }

  return {
    get shadows() { return shadows; },
    get selected() { return selected; },
    get selectedId() { return selectedId; },
    get assignments() { return assignments; },
    get isLoading() { return isLoading; },
    get error() { return error; },
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
