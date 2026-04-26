export type IndexedNote = {
  path: string;
  title: string;
  content: string;
};

export type SearchResult = {
  path: string;
  title: string;
  excerpt: string;
  score: number;
};

const STOP_WORDS = new Set([
  "the","a","an","and","or","but","in","on","at","to","for","of","with",
  "by","from","is","it","its","was","are","were","be","been","being",
  "have","has","had","do","does","did","will","would","could","should",
  "may","might","can","this","that","these","those","i","you","he","she",
  "we","they","my","your","his","her","our","their","what","which","who",
  "how","when","where","why","all","any","some","no","not","so","if","as",
  "up","out","about","into","than","then","just","also","more","very",
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 2 && !STOP_WORDS.has(t));
}

function scoreNote(queryTerms: string[], content: string, title: string): number {
  const contentTokens = tokenize(content);
  const titleTokens = tokenize(title);
  let score = 0;

  for (const term of queryTerms) {
    const contentHits = contentTokens.filter(
      (t) => t === term || t.startsWith(term)
    ).length;
    if (contentHits > 0) score += Math.log(1 + contentHits);

    const titleHits = titleTokens.filter(
      (t) => t === term || t.startsWith(term)
    ).length;
    if (titleHits > 0) score += titleHits * 3; // title matches worth more
  }

  return score;
}

function bestExcerpt(content: string, queryTerms: string[], maxLen = 500): string {
  const paragraphs = content
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter((p) => p.length > 20);

  if (paragraphs.length === 0) return content.slice(0, maxLen);

  let bestPara = paragraphs[0];
  let bestScore = 0;

  for (const para of paragraphs) {
    const tokens = tokenize(para);
    const score = queryTerms.reduce(
      (s, t) => s + tokens.filter((pt) => pt === t || pt.startsWith(t)).length,
      0
    );
    if (score > bestScore) {
      bestScore = score;
      bestPara = para;
    }
  }

  // Strip markdown for cleaner reading
  const clean = bestPara
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/`(.+?)`/g, "$1")
    .replace(/\[(.+?)\]\(.+?\)/g, "$1")
    .trim();

  return clean.length > maxLen ? clean.slice(0, maxLen) + "…" : clean;
}

export function searchNotes(
  query: string,
  index: IndexedNote[],
  topK = 4,
  minScore = 0.5
): SearchResult[] {
  if (!query.trim() || index.length === 0) return [];

  const queryTerms = tokenize(query);
  if (queryTerms.length === 0) return [];

  const results: SearchResult[] = [];

  for (const note of index) {
    const score = scoreNote(queryTerms, note.content, note.title);
    if (score >= minScore) {
      results.push({
        path: note.path,
        title: note.title,
        excerpt: bestExcerpt(note.content, queryTerms),
        score,
      });
    }
  }

  return results.sort((a, b) => b.score - a.score).slice(0, topK);
}

export function buildVaultContext(results: SearchResult[]): string {
  if (results.length === 0) return "";

  const blocks = results
    .map((r) => `**${r.title}**\n${r.excerpt}`)
    .join("\n\n---\n\n");

  return `Relevant notes from the vault (use if helpful, cite by note title):\n\n${blocks}`;
}
