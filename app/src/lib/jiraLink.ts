function buildPattern(projects: string[]): RegExp {
  if (projects.length > 0) {
    const keys = projects.map((p) => p.trim().toUpperCase()).filter(Boolean).join("|");
    return new RegExp(`(?<!\\[)\\b((?:${keys})-\\d+)\\b(?![^[]*\\])`, "g");
  }
  return /(?<!\[)\b([A-Z][A-Z0-9]*-\d+)\b(?![^\[]*\])/g;
}

// Pre-processes markdown: replaces bare Jira IDs with [JEDI-774](url).
// Skips content inside fenced code blocks, inline code spans, and already-linked IDs.
export function linkifyMarkdown(md: string, baseUrl: string, projects: string[]): string {
  if (!baseUrl) return md;
  const base = baseUrl.endsWith("/") ? baseUrl : baseUrl + "/";
  const pattern = buildPattern(projects);

  // Split on code fences and inline code — don't touch those segments
  const parts = md.split(/(```[\s\S]*?```|`[^`]*`)/g);
  return parts
    .map((part, i) => {
      // Odd-indexed parts are the code matches (the captured groups)
      if (i % 2 === 1) return part;
      pattern.lastIndex = 0;
      return part.replace(pattern, (_full, id: string) => `[${id}](${base}${id})`);
    })
    .join("");
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Returns safe HTML with Jira IDs wrapped in <a> tags for plain-text display contexts.
export function linkifyHtml(text: string, baseUrl: string, projects: string[]): string {
  if (!baseUrl) return escapeHtml(text);
  const base = baseUrl.endsWith("/") ? baseUrl : baseUrl + "/";
  const pattern = buildPattern(projects);
  const escaped = escapeHtml(text);
  pattern.lastIndex = 0;
  return escaped.replace(
    pattern,
    (_full, id: string) =>
      `<a href="${base}${id}" class="jira-link">${id}</a>`,
  );
}
