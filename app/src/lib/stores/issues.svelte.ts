import { loadIssues, saveIssues, type AppIssue } from "$lib/issues";
import { settings } from "$lib/stores/settings.svelte";

export type { AppIssue };

function createIssuesStore() {
  let issues = $state<AppIssue[]>([]);
  let isLoading = $state(false);

  async function load() {
    if (!settings.vaultPath) return;
    isLoading = true;
    try {
      issues = await loadIssues(settings.vaultPath);
    } catch {
      // Non-critical
    } finally {
      isLoading = false;
    }
  }

  async function persist() {
    if (!settings.vaultPath) return;
    await saveIssues(settings.vaultPath, issues);
  }

  async function create(type: AppIssue["type"], title: string, description = ""): Promise<AppIssue> {
    const issue: AppIssue = {
      id: crypto.randomUUID(),
      type,
      title: title.trim(),
      description,
      status: "open",
      createdAt: new Date().toISOString(),
    };
    issues = [...issues, issue];
    await persist();
    return issue;
  }

  async function updateStatus(id: string, status: AppIssue["status"]) {
    const idx = issues.findIndex((i) => i.id === id);
    if (idx === -1) return;
    issues[idx] = { ...issues[idx], status, updatedAt: new Date().toISOString() };
    issues = [...issues];
    await persist();
  }

  function list(filter?: { type?: AppIssue["type"]; status?: AppIssue["status"] }): AppIssue[] {
    return issues.filter((i) => {
      if (filter?.type && i.type !== filter.type) return false;
      if (filter?.status && i.status !== filter.status) return false;
      return true;
    });
  }

  return {
    get issues() { return issues; },
    get isLoading() { return isLoading; },
    load,
    create,
    updateStatus,
    list,
  };
}

export const issuesStore = createIssuesStore();
