// buildSummaryItems - pure aggregator. Takes everything the panel knows about the article
// and produces a flat, severity-sorted SummaryItem[] for the Summary tab.
// No fetches happen here - this only runs against state already in memory.

import type {
  SEOAnalysis,
  DeepAnalysis,
  DocumentFields,
  LinkingSuggestion,
  SummaryItem,
} from "./types";

interface BuildSummaryInput {
  analysis: SEOAnalysis | null;
  deepAnalysis: DeepAnalysis | null;
  documentFields?: DocumentFields;
  contentScore: number | null;
  linkingSuggestions: LinkingSuggestion[];
  text: string;
}

function tokensContain(haystack: string, needle?: string): boolean {
  if (!needle) return true;
  const tokens = needle.toLowerCase().split(/\s+/).filter((t) => t.length > 1);
  if (tokens.length === 0) return true;
  const lower = haystack.toLowerCase();
  return tokens.every((t) => lower.includes(t));
}

export function buildSummaryItems(input: BuildSummaryInput): SummaryItem[] {
  const items: SummaryItem[] = [];
  const { analysis, deepAnalysis, documentFields, contentScore, linkingSuggestions, text } = input;
  const primaryKeyword = analysis?.primaryKeyword?.term;

  // ---------- META: title ----------
  const title = documentFields?.title;
  if (!title) {
    items.push({
      id: "meta-title-missing",
      category: "meta",
      severity: "error",
      label: "Title tag missing",
      description: "No title set on this document.",
      howToFix: "Add a 50-60 character title that includes your primary keyword. The title is what Google shows in search results.",
      jumpTo: { tab: "meta", anchorId: "anchor-meta-title" },
    });
  } else {
    const len = title.length;
    if (len < 50) {
      items.push({
        id: "meta-title-short",
        category: "meta",
        severity: "warning",
        label: "Title is short",
        description: `Title is ${len} characters - below the 50-60 character sweet spot.`,
        howToFix: "Expand the title to fill 50-60 characters so you use the full SERP real estate without truncation.",
        jumpTo: { tab: "meta", anchorId: "anchor-meta-title" },
      });
    } else if (len > 60) {
      items.push({
        id: "meta-title-long",
        category: "meta",
        severity: "warning",
        label: "Title is long",
        description: `Title is ${len} characters - Google may truncate beyond ~60.`,
        howToFix: "Trim the title to under 60 characters so it doesn't get cut off in search results.",
        jumpTo: { tab: "meta", anchorId: "anchor-meta-title" },
      });
    }
    if (primaryKeyword && !tokensContain(title, primaryKeyword)) {
      items.push({
        id: "meta-title-no-keyword",
        category: "meta",
        severity: "warning",
        label: "Primary keyword not in title",
        description: `Title doesn't contain your primary keyword "${primaryKeyword}".`,
        howToFix: "Rewrite the title to lead with or include the primary keyword. Google weights early-position keywords heavily.",
        jumpTo: { tab: "meta", anchorId: "anchor-meta-title" },
      });
    }
  }

  // ---------- META: description ----------
  const meta = documentFields?.metaDescription;
  if (!meta) {
    items.push({
      id: "meta-desc-missing",
      category: "meta",
      severity: "error",
      label: "Meta description missing",
      description: "No meta description set.",
      howToFix: "Write a 120-160 character description that summarizes the article and includes your primary keyword.",
      jumpTo: { tab: "meta", anchorId: "anchor-meta-description" },
    });
  } else {
    const len = meta.length;
    if (len < 120) {
      items.push({
        id: "meta-desc-short",
        category: "meta",
        severity: "warning",
        label: "Meta description is short",
        description: `Meta description is ${len} characters - below the 120-160 ideal.`,
        howToFix: "Expand the description to 120-160 characters so you don't leave SERP space empty.",
        jumpTo: { tab: "meta", anchorId: "anchor-meta-description" },
      });
    } else if (len > 160) {
      items.push({
        id: "meta-desc-long",
        category: "meta",
        severity: "warning",
        label: "Meta description is long",
        description: `Meta description is ${len} characters - Google may truncate beyond 160.`,
        howToFix: "Trim the description to under 160 characters so the full text shows in search.",
        jumpTo: { tab: "meta", anchorId: "anchor-meta-description" },
      });
    }
    if (primaryKeyword && !tokensContain(meta, primaryKeyword)) {
      items.push({
        id: "meta-desc-no-keyword",
        category: "meta",
        severity: "opportunity",
        label: "Primary keyword not in meta description",
        description: `Meta description doesn't include "${primaryKeyword}".`,
        howToFix: "Naturally include the primary keyword in the description - it influences click-through rate even when not a direct ranking factor.",
        jumpTo: { tab: "meta", anchorId: "anchor-meta-description" },
      });
    }
  }

  // ---------- META: slug ----------
  const slug = documentFields?.slug;
  if (!slug) {
    items.push({
      id: "meta-slug-missing",
      category: "meta",
      severity: "error",
      label: "URL slug missing",
      description: "No URL slug set.",
      howToFix: "Add a clean, hyphenated slug 3-5 words long that contains the primary keyword.",
      jumpTo: { tab: "meta", anchorId: "anchor-url-slug" },
    });
  } else {
    if (slug.length > 60) {
      items.push({
        id: "meta-slug-long",
        category: "meta",
        severity: "warning",
        label: "URL slug is long",
        description: `Slug is ${slug.length} characters. 3-5 words is the 2026 sweet spot.`,
        howToFix: "Shorten the slug to keep the URL clean and scannable.",
        jumpTo: { tab: "meta", anchorId: "anchor-url-slug" },
      });
    }
    if (primaryKeyword && !tokensContain(slug.replace(/-/g, " "), primaryKeyword)) {
      items.push({
        id: "meta-slug-no-keyword",
        category: "meta",
        severity: "opportunity",
        label: "Primary keyword not in URL",
        description: `Slug doesn't contain "${primaryKeyword}".`,
        howToFix: "Rework the slug to include the primary keyword (hyphenated). URLs with keywords still get a modest ranking lift.",
        jumpTo: { tab: "meta", anchorId: "anchor-url-slug" },
      });
    }
  }

  // ---------- CONTENT: word count ----------
  const wordCount = text ? text.trim().split(/\s+/).filter(Boolean).length : 0;
  if (wordCount === 0) {
    // No item - empty doc state is handled by the empty-state UI elsewhere
  } else if (wordCount < 800) {
    items.push({
      id: "content-thin",
      category: "content",
      severity: "error",
      label: "Article is thin",
      description: `Only ${wordCount} words. Below 800 is too thin for competitive HCP content.`,
      howToFix: "Aim for 1,500+ words for clinical articles; 2,000+ for pillar pages. Add clinical context, citations, and detail.",
      jumpTo: { tab: "meta", anchorId: "anchor-word-count" },
    });
  } else if (wordCount < 1500) {
    items.push({
      id: "content-getting-there",
      category: "content",
      severity: "warning",
      label: "Article could be longer",
      description: `${wordCount} words is OK; 1,500+ is the 2026 standard for HCP clinical content.`,
      howToFix: "Expand sections with citations, comparative data, or guideline references to push past 1,500 words.",
      jumpTo: { tab: "meta", anchorId: "anchor-word-count" },
    });
  }

  // ---------- HEADINGS ----------
  const headings = documentFields?.headings || [];
  if (headings.length === 0 && wordCount > 200) {
    items.push({
      id: "headings-missing",
      category: "headings",
      severity: "warning",
      label: "No H2/H3 headings detected",
      description: "Article has no subheadings to break up content.",
      howToFix: "Add H2 headings every 200-300 words so Google can pull them into featured snippets and readers can scan.",
      jumpTo: { tab: "meta", anchorId: "anchor-headings-outline" },
    });
  }

  // ---------- IMAGES ----------
  const images = documentFields?.imageNames || [];
  if (images.length === 0 && wordCount > 300) {
    items.push({
      id: "images-none",
      category: "images",
      severity: "opportunity",
      label: "No images detected",
      description: "Article has no images.",
      howToFix: "Add at least one hero image with descriptive alt text. Articles with images perform better on engagement and AI citation.",
      jumpTo: { tab: "meta", anchorId: "anchor-images" },
    });
  }

  // ---------- KEYWORDS: primary candidate confidence ----------
  if (!primaryKeyword) {
    // Keywords haven't loaded - skip
  } else {
    // If primary is missing from body, flag it
    if (text && !tokensContain(text, primaryKeyword)) {
      items.push({
        id: "keywords-primary-not-in-body",
        category: "keywords",
        severity: "warning",
        label: "Primary keyword not in body",
        description: `"${primaryKeyword}" doesn't appear in the article body.`,
        howToFix: "Use the primary keyword naturally in the introduction and at least one body paragraph.",
        jumpTo: { tab: "keywords" },
      });
    }
  }

  // ---------- CONTENT SCORE ----------
  if (contentScore != null) {
    if (contentScore < 40) {
      items.push({
        id: "score-needs-work",
        category: "keywords",
        severity: "error",
        label: "Content score: needs work",
        description: `Score is ${contentScore}/100. Several keyword + structure signals are missing.`,
        howToFix: "Open the Keywords tab and address the missing keywords + placement gaps to lift the score.",
        jumpTo: { tab: "keywords" },
      });
    } else if (contentScore < 70) {
      items.push({
        id: "score-decent",
        category: "keywords",
        severity: "opportunity",
        label: "Content score has room to grow",
        description: `Score is ${contentScore}/100. Decent baseline; close out the remaining gaps.`,
        howToFix: "Hit 70+ by adding missing keywords and improving placement in title, meta, and headings.",
        jumpTo: { tab: "keywords" },
      });
    }
  }

  // ---------- AEO: question headings ----------
  const questionHeadings = deepAnalysis?.aeo?.questionHeadings || [];
  if (deepAnalysis && questionHeadings.length === 0 && wordCount > 300) {
    items.push({
      id: "aeo-no-question-headings",
      category: "aeo",
      severity: "opportunity",
      label: "No question-style headings",
      description: "No H2/H3 headings phrased as questions.",
      howToFix: "Rewrite a heading or two as a question (\"What is...?\", \"How does...?\"). Google pulls question headings into featured snippets.",
      jumpTo: { tab: "aeo" },
    });
  }

  // ---------- LINKING: low coverage ----------
  if (linkingSuggestions.length === 0 && analysis && wordCount > 500) {
    items.push({
      id: "linking-none",
      category: "internal-linking",
      severity: "opportunity",
      label: "No internal linking suggestions yet",
      description: "Internal linking suggestions haven't been generated for this article.",
      howToFix: "Open the Linking tab to fetch related articles. Sites with strong topic-cluster linking earn ~3x more AI citations.",
      jumpTo: { tab: "linking", anchorId: "anchor-linking-suggestions" },
    });
  } else if (linkingSuggestions.length > 0) {
    const strong = linkingSuggestions.filter((s) => s.compositeScore >= 60).length;
    if (strong === 0) {
      items.push({
        id: "linking-weak",
        category: "internal-linking",
        severity: "opportunity",
        label: "Linking matches are weak",
        description: "None of the suggested internal links score above 60. Topic alignment is loose.",
        howToFix: "Refine your primary keyword in the Keywords tab to get tighter matches, or skip linking for this article.",
        jumpTo: { tab: "linking", anchorId: "anchor-linking-suggestions" },
      });
    }
  }

  // ---------- DEEP ANALYSIS: readability / gaps / structure ----------
  if (deepAnalysis) {
    const readability = deepAnalysis.readabilityNotes || [];
    const gaps = deepAnalysis.competitiveGaps || [];
    const structure = deepAnalysis.structureRecommendations || [];
    readability.slice(0, 2).forEach((note, i) => {
      items.push({
        id: `deep-readability-${i}`,
        category: "content",
        severity: "opportunity",
        label: "Readability note",
        description: note,
        howToFix: "Simplify the flagged passages - shorter sentences, fewer clauses, plainer phrasing where the clinical meaning allows.",
        jumpTo: { tab: "summary" },
      });
    });
    gaps.slice(0, 2).forEach((note, i) => {
      items.push({
        id: `deep-gap-${i}`,
        category: "content",
        severity: "opportunity",
        label: "Competitive gap",
        description: note,
        howToFix: "Add a section covering this topic so the article matches what competing pages offer.",
        jumpTo: { tab: "summary" },
      });
    });
    structure.slice(0, 2).forEach((note, i) => {
      items.push({
        id: `deep-structure-${i}`,
        category: "headings",
        severity: "opportunity",
        label: "Structure recommendation",
        description: note,
        howToFix: "Update the heading or section structure per the recommendation.",
        jumpTo: { tab: "meta", anchorId: "anchor-headings-outline" },
      });
    });
  }

  // Sort: severity (error > warning > opportunity), then category alphabetical
  const severityRank: Record<string, number> = { error: 0, warning: 1, opportunity: 2 };
  items.sort((a, b) => {
    const s = severityRank[a.severity] - severityRank[b.severity];
    if (s !== 0) return s;
    return a.category.localeCompare(b.category);
  });

  return items;
}
