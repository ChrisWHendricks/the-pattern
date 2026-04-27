import type { AppIssue } from "$lib/issues";

export type { AppIssue };

const STORAGE_KEY = "the_pattern_issues";

function createIssuesStore() {
  function fromStorage(): AppIssue[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  let issues = $state<AppIssue[]>(fromStorage());

  function persist() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(issues));
  }

  function create(type: AppIssue["type"], title: string, description = ""): AppIssue {
    const issue: AppIssue = {
      id: crypto.randomUUID(),
      type,
      title: title.trim(),
      description,
      status: "open",
      createdAt: new Date().toISOString(),
    };
    issues = [...issues, issue];
    persist();
    return issue;
  }

  function updateStatus(id: string, status: AppIssue["status"]) {
    const idx = issues.findIndex((i) => i.id === id);
    if (idx === -1) return;
    issues[idx] = { ...issues[idx], status, updatedAt: new Date().toISOString() };
    issues = [...issues];
    persist();
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
    create,
    updateStatus,
    list,
  };
}

export const issuesStore = createIssuesStore();
