// Token-based keyword match: "selinexor in myelofibrosis" still counts as containing
// "selinexor myelofibrosis" because word order and connecting words don't matter.
export function containsKeywordTokens(haystack: string, needle?: string): boolean {
  if (!needle) return true;
  const tokens = needle.toLowerCase().split(/\s+/).filter((t) => t.length > 1);
  if (tokens.length === 0) return true;
  const lower = haystack.toLowerCase();
  return tokens.every((t) => lower.includes(t));
}

// True when the primary keyword sits near the start of the slug (within the first
// three slug words). Editors get the most SEO/CTR value when the keyword leads.
export function keywordLeadsSlug(slug: string, primaryKeyword?: string): boolean {
  if (!primaryKeyword) return true;
  const slugWords = slug.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().split(/\s+/).filter(Boolean);
  const tokens = primaryKeyword.toLowerCase().split(/\s+/).filter((t) => t.length > 1);
  if (tokens.length === 0 || slugWords.length === 0) return true;
  let earliest = Infinity;
  for (const t of tokens) {
    const idx = slugWords.findIndex((w) => w.includes(t));
    if (idx >= 0) earliest = Math.min(earliest, idx);
  }
  return earliest <= 2;
}

// MJH publications that use the /view/{slug} article route (verified via CDN probe).
// We only construct live URLs for known publications to avoid linking to 404s on
// brands that use a different route pattern.
export const KNOWN_MJH_PUBLICATIONS = new Set([
  "onclive",
  "hcplive",
  "ajmc",
  "pharmacytimes",
  "cancernetwork",
]);
