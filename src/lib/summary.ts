// buildSummaryItems - pure aggregator. Takes everything the panel knows about the article
// and produces a flat, severity-sorted SummaryItem[] for the Summary tab.
// No fetches happen here - this only runs against state already in memory.

import type {
  SEOAnalysis,
  DeepAnalysis,
  DocumentFields,
  LinkingSuggestion,
  LinkCheckResult,
  SummaryItem,
} from "./types";

interface BuildSummaryInput {
  analysis: SEOAnalysis | null;
  deepAnalysis: DeepAnalysis | null;
  documentFields?: DocumentFields;
  contentScore: number | null;
  linkingSuggestions: LinkingSuggestion[];
  // Set after the editor has run the broken-link checker on the Other Recs tab.
  linkCheckResults?: LinkCheckResult[];
  text: string;
  // Editor's selected keywords - override analysis defaults when set.
  primaryKeyword?: string;
  secondaryKeyword?: string;
}

import { containsKeywordTokens, keywordLeadsSlug } from "./utils";

// Conference previews, news briefs, recaps, and listicles are legitimately short.
// Detect them so we don't nag "push past 1,500 words" on content that should be
// short. Uses the contentCategory field when present, else title-pattern signals.
export function isShortFormContent(documentFields?: DocumentFields, title?: string): boolean {
  const cat = (documentFields?.contentCategory || "").toLowerCase().trim();
  // Media formats (video / podcast / episode / webinar): the body text is a summary
  // of the media, not the article. Match the category AS A WHOLE so a written piece
  // in a compound category like "clinical video interviews" is NOT exempted.
  if (/^(videos?|podcasts?|episodes?|webinars?|video series|peer exchange)$/.test(cat)) return true;
  // Written short formats - token match (not substring) so "newsletter" doesn't match
  // "news" and "updated-guidelines" doesn't match "update".
  const shortFormCats = new Set(["news", "brief", "preview", "recap", "update", "announcement", "roundup", "digest", "interview"]);
  const catTokens = cat.split(/[^a-z]+/).filter(Boolean);
  if (catTokens.some((tok) => shortFormCats.has(tok))) return true;
  const t = (title || "").toLowerCase();
  if (/\b(preview|recap|roundup|digest)\b/.test(t)) return true;
  if (/:\s*\d+\s+(trials|things|takeaways|highlights|tips|questions|charts)/.test(t)) return true;
  return false;
}

export function buildSummaryItems(input: BuildSummaryInput): SummaryItem[] {
  const items: SummaryItem[] = [];
  // contentScore is in BuildSummaryInput for forward-compat but is now shown
  // directly on the Summary tab as a card with breakdown - no echo item needed here.
  const { analysis, deepAnalysis, documentFields, linkingSuggestions, linkCheckResults, text } = input;
  const primaryKeyword = input.primaryKeyword || analysis?.primaryKeyword?.term;
  const secondaryKeyword = input.secondaryKeyword || "";
  const bodyText = (() => {
    if (!documentFields?.title) return text;
    if (!text.startsWith(documentFields.title)) return text;
    const rest = text.slice(documentFields.title.length);
    if (rest === "" || /^\s/.test(rest)) return rest.trimStart();
    return text;
  })();

  // ---------- META: title ----------
  // Length warnings removed - the article title IS the page title and editors
  // can't easily shorten it without rewriting the article. The real lever they
  // have is keyword position: putting the primary keyword in the first 30 chars
  // (or first 5 words) so it survives Google's ~60-char SERP truncation.
  const title = documentFields?.title;
  if (!title) {
    items.push({
      id: "meta-title-missing",
      category: "meta",
      severity: "error",
      label: "Title tag missing",
      description: "No title set on this document.",
      howToFix: "Add a title that leads with the primary keyword. The title is what Google shows in search results.",
      jumpTo: { tab: "meta", anchorId: "anchor-meta-title" },
    });
  } else if (primaryKeyword) {
    if (!containsKeywordTokens(title, primaryKeyword)) {
      items.push({
        id: "meta-title-no-keyword",
        category: "meta",
        severity: "warning",
        label: "Primary keyword not in title",
        description: `Title doesn't contain "${primaryKeyword}".`,
        howToFix: "Rewrite the title to lead with the primary keyword. Google weights early-position keywords heavily.",
        jumpTo: { tab: "meta", anchorId: "anchor-meta-title" },
      });
    } else {
      const lowerTitle = title.toLowerCase();
      const tokens = primaryKeyword.toLowerCase().split(/\s+/).filter((t) => t.length > 1);
      let firstHit = -1;
      for (const t of tokens) {
        const i = lowerTitle.indexOf(t);
        if (i >= 0 && (firstHit === -1 || i < firstHit)) firstHit = i;
      }
      const wordsBefore = firstHit >= 0 ? title.slice(0, firstHit).trim().split(/\s+/).filter(Boolean).length : 0;
      if (firstHit > 30 && wordsBefore > 5) {
        items.push({
          id: "meta-title-keyword-late",
          category: "meta",
          severity: "warning",
          label: "Primary keyword late in title",
          description: `"${primaryKeyword}" starts at character ${firstHit + 1} of the title.`,
          howToFix: "Move the primary keyword toward the start of the title so it stays visible if Google truncates at ~60 characters.",
          jumpTo: { tab: "meta", anchorId: "anchor-meta-title" },
        });
      }
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
        howToFix: "Expand the description to 120-160 characters so the full description shows in search.",
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
    if (primaryKeyword && !containsKeywordTokens(meta, primaryKeyword)) {
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

  // ---------- META: slug (audit lives in Other Recs tab) ----------
  const slug = documentFields?.slug;
  if (!slug) {
    items.push({
      id: "meta-slug-missing",
      category: "meta",
      severity: "warning",
      label: "URL slug missing",
      description: "No URL slug set.",
      howToFix: "Add a short, descriptive slug that leads with your primary keyword.",
      jumpTo: { tab: "technical", anchorId: "anchor-url-slug" },
    });
  } else {
    if (primaryKeyword && !containsKeywordTokens(slug.replace(/-/g, " "), primaryKeyword)) {
      items.push({
        id: "meta-slug-no-keyword",
        category: "meta",
        severity: "opportunity",
        label: "Primary keyword not in URL",
        description: `Slug doesn't contain "${primaryKeyword}".`,
        howToFix: "Work your primary keyword into the URL, ideally at the start - if the address gets shortened, a leading keyword still shows.",
        jumpTo: { tab: "technical", anchorId: "anchor-url-slug" },
      });
    } else if (primaryKeyword && !keywordLeadsSlug(slug, primaryKeyword)) {
      items.push({
        id: "meta-slug-keyword-late",
        category: "meta",
        severity: "opportunity",
        label: "Primary keyword late in URL",
        description: `"${primaryKeyword}" is in the URL but not near the start.`,
        howToFix: "Lead the URL with the primary keyword so it stays visible if the address gets shortened.",
        jumpTo: { tab: "technical", anchorId: "anchor-url-slug" },
      });
    }
  }

  // ---------- CONTENT: word count ----------
  // 450 is the body-text floor (per editor guidance). 1,500+ is the
  // competitive target for HCP clinical articles.
  const wordCount = bodyText ? bodyText.trim().split(/\s+/).filter(Boolean).length : 0;
  // Videos, podcasts, news, briefs, etc. are legitimately short (the body is a
  // summary, not the deliverable), so they're exempt from the word-count floor.
  const isShortForm = isShortFormContent(documentFields, documentFields?.title);
  if (wordCount === 0) {
    // No item - empty doc state is handled by the empty-state UI elsewhere
  } else if (wordCount < 450 && !isShortForm) {
    items.push({
      id: "content-too-short",
      category: "content",
      severity: "error",
      label: "Content is too short",
      description: `${wordCount} words. Body copy should be at least 450 words.`,
      howToFix: "Add more body text. A link or image on its own doesn't count - the article needs real written substance.",
      jumpTo: { tab: "technical", anchorId: "anchor-word-count" },
    });
  } else if (wordCount < 1500 && !isShortForm) {
    items.push({
      id: "content-short-for-clinical",
      category: "content",
      severity: "opportunity",
      label: "Article could be longer",
      description: `${wordCount} words. For evergreen clinical topics 1,500+ tends to rank better - news, previews, and briefs are fine shorter.`,
      howToFix: "If this is an in-depth clinical piece, expand with citations, comparative data, or guideline references. For news or previews, this length is appropriate.",
      jumpTo: { tab: "technical", anchorId: "anchor-word-count" },
    });
  }

  // ---------- HEADINGS ----------
  const headings = documentFields?.headings || [];
  const headingsDetailed = documentFields?.headingsDetailed;
  // Count H2 AND H3 as section headings - an H3-only article is still sectioned.
  const h2Count = headingsDetailed
    ? headingsDetailed.filter((h) => h.level === 2 || h.level === 3).length
    : headings.length;
  if (h2Count === 0 && wordCount > 200 && wordCount < 1000) {
    items.push({
      id: "headings-missing",
      category: "headings",
      severity: "warning",
      label: "No H2/H3 headings detected",
      description: "Article has no subheadings to break up content.",
      howToFix: "Add H2 headings every 200-300 words so Google can pull them into featured snippets and readers can scan.",
      jumpTo: { tab: "technical", anchorId: "anchor-headings-structure" },
    });
  }
  if (wordCount >= 1000 && h2Count === 0) {
    items.push({
      id: "headings-density-zero",
      category: "headings",
      severity: "error",
      label: "Long article without section headings",
      description: `${wordCount} words and no H2 or H3 section headings.`,
      howToFix: "Add 2-3 H2 headings to break the article into scannable sections.",
      jumpTo: { tab: "technical", anchorId: "anchor-headings-structure" },
    });
  } else if (wordCount >= 2500 && h2Count < 5) {
    items.push({
      id: "headings-density-long",
      category: "headings",
      severity: "warning",
      label: "Long article could use more section headings",
      description: `${h2Count} section heading${h2Count === 1 ? "" : "s"} for ${wordCount} words.`,
      howToFix: "Long articles read best with 1 H2 per 300-400 words. Add more named section breaks.",
      jumpTo: { tab: "technical", anchorId: "anchor-headings-structure" },
    });
  } else if (wordCount >= 1500 && h2Count < 3) {
    items.push({
      id: "headings-density",
      category: "headings",
      severity: "warning",
      label: "Article could use more section headings",
      description: `${h2Count} section heading${h2Count === 1 ? "" : "s"} for ${wordCount} words.`,
      howToFix: "Articles above 1,500 words usually need at least 3 H2 sections. Break the content into more named blocks.",
      jumpTo: { tab: "technical", anchorId: "anchor-headings-structure" },
    });
  }
  if (headingsDetailed) {
    const bodyH1 = headingsDetailed.filter((h) => h.level === 1).length;
    if (bodyH1 > 0) {
      items.push({
        id: "headings-h1-in-body",
        category: "headings",
        severity: "warning",
        label: "H1 inside the body",
        description: `${bodyH1} H1 heading${bodyH1 === 1 ? "" : "s"} in the body of the article.`,
        howToFix: "The article title is your H1. Body headings should start at H2 so the outline isn't ambiguous.",
        jumpTo: { tab: "technical", anchorId: "anchor-headings-structure" },
      });
    }
    let prevLevel = 0;
    let skips = 0;
    for (const h of headingsDetailed) {
      if (prevLevel > 0 && h.level > prevLevel + 1) skips++;
      prevLevel = h.level;
    }
    if (skips > 0) {
      items.push({
        id: "headings-skipped-levels",
        category: "headings",
        severity: "warning",
        label: "Heading levels skip",
        description: `${skips} place${skips === 1 ? "" : "s"} where the heading level jumps (e.g. H2 to H4).`,
        howToFix: "Use sequential heading levels (H2 → H3 → H4) so screen readers and search engines parse the outline cleanly.",
        jumpTo: { tab: "technical", anchorId: "anchor-headings-structure" },
      });
    }
    const empties = headingsDetailed.filter((h) => !h.text.trim()).length;
    if (empties > 0) {
      items.push({
        id: "headings-empty",
        category: "headings",
        severity: "error",
        label: "Empty heading blocks",
        description: `${empties} heading${empties === 1 ? "" : "s"} with no text.`,
        howToFix: "Either remove the empty heading blocks or fill them with text.",
        jumpTo: { tab: "technical", anchorId: "anchor-headings-structure" },
      });
    }
  }

  // ---------- IMAGES ----------
  const images = documentFields?.imageNames || [];
  if (images.length === 0 && wordCount > 300) {
    items.push({
      id: "images-none",
      category: "images",
      severity: "opportunity",
      label: "No images",
      description: "Article doesn't have any images.",
      howToFix: "Add at least one hero image with descriptive alt text. Articles with images perform better on both reader engagement and search.",
      jumpTo: { tab: "technical", anchorId: "anchor-images" },
    });
  }
  const IMG_EXT_RE = /\.(jpe?g|png|gif|webp|svg|tiff?|bmp)$/i;
  const GENERIC_FN_RE = /^(IMG_|DSC|DCIM|screenshot|photo\d*|image\d*|untitled|file_?\d+|unsplash|stock)/i;
  const imageFilenames = images.filter((n) => IMG_EXT_RE.test(n));
  const imageAlts = images.filter((n) => !IMG_EXT_RE.test(n));
  const badFilenames = imageFilenames.filter((f) => {
    const base = f.replace(IMG_EXT_RE, "");
    if (GENERIC_FN_RE.test(base)) return true;
    if (/_/.test(base) || /\s/.test(base)) return true;
    const words = base.split("-").filter(Boolean);
    return words.length < 2 || words.length > 5;
  });
  if (badFilenames.length > 0) {
    items.push({
      id: "images-filenames-bad",
      category: "images",
      severity: "warning",
      label: `${badFilenames.length} image filename${badFilenames.length === 1 ? "" : "s"} needs work`,
      description: "Filenames should use 2-3 hyphenated descriptive words.",
      howToFix: "Rename images with 2-3 descriptive hyphenated words, ideally including the primary keyword. Avoid IMG_xxxx, screenshot, photo1.",
      jumpTo: { tab: "technical", anchorId: "anchor-image-filenames" },
    });
  }
  const badAlts = imageAlts.filter((alt) => {
    const trimmed = alt.trim();
    if (!trimmed) return false;
    const len = trimmed.length;
    const wc = trimmed.split(/\s+/).filter(Boolean).length;
    return len >= 125 || wc < 2;
  });
  if (badAlts.length > 0) {
    items.push({
      id: "images-alt-bad",
      category: "images",
      severity: "warning",
      label: `${badAlts.length} image alt text${badAlts.length === 1 ? "" : "s"} needs work`,
      description: "Alt text should be 2-5 descriptive keywords, under 125 chars.",
      howToFix: "Write alt text as 2-5 descriptive keywords that describe the image, ideally including the primary keyword. Keep it under 125 characters.",
      jumpTo: { tab: "technical", anchorId: "anchor-image-alt" },
    });
  }
  // Image titles (the hover tooltip) - the director treats this as an SEO signal.
  const imageTitleCount = (documentFields?.imageTitles || []).length;
  const totalImageCount = documentFields?.imageCount ?? 0;
  // Only flag missing titles when SOME image already has one (schema exposes a
  // title field). MJH combines alt + title into one field, so this is always 0
  // there - flagging "missing a title" was a false alarm. Mirrors TechnicalTab.
  const missingTitles = totalImageCount > 0 && imageTitleCount > 0 ? totalImageCount - imageTitleCount : 0;
  if (missingTitles > 0) {
    items.push({
      id: "images-titles-missing",
      category: "images",
      severity: "warning",
      label: `${missingTitles} image${missingTitles === 1 ? "" : "s"} missing a title`,
      description: "The title attribute shows on hover and sends an SEO signal.",
      howToFix: "Add a descriptive title attribute (2-5 keywords) to each image that's missing one.",
      jumpTo: { tab: "technical", anchorId: "anchor-image-titles" },
    });
  }

  // ---------- KEYWORDS: primary candidate confidence ----------
  if (!primaryKeyword) {
    // Keywords haven't loaded - skip
  } else {
    // If primary is missing from body, flag it
    if (bodyText && !containsKeywordTokens(bodyText, primaryKeyword)) {
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
    // Primary keyword with no measurable search volume. Only meaningful once deep
    // analysis has fetched real SEMrush volumes (realtime leaves volume null).
    const primaryVolume = analysis?.primaryKeyword?.volume;
    // Only an explicit measured zero means "nobody searches this". A null volume
    // means SEMrush had no data for the term (common for niche clinical phrases) -
    // warning on null produced false positives, so we don't.
    if (deepAnalysis && primaryVolume === 0) {
      items.push({
        id: "keywords-primary-zero-volume",
        category: "keywords",
        severity: "warning",
        label: "Primary keyword has no search volume",
        description: `"${primaryKeyword}" shows no measurable monthly searches, so even ranking #1 brings little traffic.`,
        howToFix: "Pick a primary people actually search for - check your supporting keywords for higher-volume options, or set a new primary on the Keywords tab.",
        jumpTo: { tab: "keywords" },
      });
    }
  }

  // ---------- KEYWORDS: secondary ----------
  if (secondaryKeyword) {
    if (bodyText && !containsKeywordTokens(bodyText, secondaryKeyword)) {
      items.push({
        id: "secondary-not-in-body",
        category: "keywords",
        severity: "opportunity",
        label: "Secondary keyword not in body",
        description: `Your secondary keyword "${secondaryKeyword}" doesn't appear in the article body.`,
        howToFix: "Work the secondary keyword into a body paragraph or two where it reads naturally.",
        jumpTo: { tab: "keywords" },
      });
    }
    const titleVal = documentFields?.title;
    if (titleVal && !containsKeywordTokens(titleVal, secondaryKeyword)) {
      items.push({
        id: "secondary-not-in-title",
        category: "meta",
        severity: "opportunity",
        label: "Secondary keyword not in title",
        description: `The title doesn't include your secondary keyword "${secondaryKeyword}".`,
        howToFix: "If it fits naturally, include the secondary keyword in the title too - but never at the cost of the primary leading.",
        jumpTo: { tab: "meta", anchorId: "anchor-meta-title" },
      });
    }
    const metaVal = documentFields?.metaDescription;
    if (metaVal && !containsKeywordTokens(metaVal, secondaryKeyword)) {
      items.push({
        id: "secondary-not-in-meta",
        category: "meta",
        severity: "opportunity",
        label: "Secondary keyword not in meta description",
        description: `The meta description doesn't include "${secondaryKeyword}".`,
        howToFix: "Add the secondary keyword to the meta description if it reads naturally.",
        jumpTo: { tab: "meta", anchorId: "anchor-meta-description" },
      });
    }
    const slugVal = documentFields?.slug;
    if (slugVal && !containsKeywordTokens(slugVal.replace(/-/g, " "), secondaryKeyword)) {
      items.push({
        id: "secondary-not-in-url",
        category: "meta",
        severity: "opportunity",
        label: "Secondary keyword not in URL",
        description: `The URL doesn't include "${secondaryKeyword}".`,
        howToFix: "Optionally include the secondary keyword in the URL after the primary - only if the slug stays short and clean.",
        jumpTo: { tab: "technical", anchorId: "anchor-url-slug" },
      });
    }
  }

  // ---------- CONTENT SCORE ----------
  // The score itself is shown as a card at the top of the Summary tab with a
  // visible per-component breakdown, so we DON'T echo it here as a separate
  // item - that would be redundant. The individual signals (missing keywords,
  // short title, etc.) already produce their own actionable items above.

  // ---------- AEO: question headings ----------
  // Count the question headings the editor has ACTUALLY written (ending in "?"),
  // matching the AEO score signal - NOT Claude's rewrite suggestions, which would
  // contradict the score (an article with a real "?" heading must not also be told
  // it has "no question-style headings"). Gate on deepAnalysis so it only surfaces
  // once that tab has run.
  const actualQuestionHeadings = (documentFields?.headings || []).filter((h) => h.trim().endsWith("?"));
  if (deepAnalysis && actualQuestionHeadings.length === 0 && wordCount > 300) {
    items.push({
      id: "aeo-no-question-headings",
      category: "aeo",
      severity: "opportunity",
      label: "No question-style headings",
      description: "None of your headings are phrased as questions.",
      howToFix: "Rewrite a heading or two as a question (\"What is...?\", \"How does...?\"). Google often pulls question headings into featured snippets.",
      jumpTo: { tab: "aeo" },
    });
  }

  // ---------- LINKING: low coverage ----------
  if (linkingSuggestions.length === 0 && analysis && wordCount > 500) {
    items.push({
      id: "linking-none",
      category: "internal-linking",
      severity: "opportunity",
      label: "No internal links suggested yet",
      description: "Linking suggestions haven't been generated for this article.",
      howToFix: "Open the Linking tab and refresh to fetch related articles to link to.",
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
        description: "None of the suggested articles reach 60% match for relevance.",
        howToFix: "Refine your primary keyword on the Keywords tab for tighter matches - or skip linking for this article.",
        jumpTo: { tab: "linking", anchorId: "anchor-linking-suggestions" },
      });
    }
  }

  // ---------- TECHNICAL: broken links (Other Recs tab) ----------
  // Truly broken (404/5xx/timeout) is an error. 401/403/429 are "unverified" -
  // usually anti-bot WAFs blocking server-side fetches; surfaced as a warning
  // so editors check manually instead of panicking.
  if (linkCheckResults && linkCheckResults.length > 0) {
    const broken = linkCheckResults.filter((r) => r.category === "broken" || r.category === "error");
    if (broken.length > 0) {
      items.push({
        id: "broken-links",
        category: "technical",
        severity: "error",
        label: `${broken.length} broken link${broken.length === 1 ? "" : "s"}`,
        description: `${broken.length} link${broken.length === 1 ? " was" : "s were"} unreachable or returned an error status.`,
        howToFix: "Open the Other Recs tab's Link Health card to see the failing URLs and fix or remove them.",
        jumpTo: { tab: "technical", anchorId: "anchor-link-check" },
      });
    }
    const unverified = linkCheckResults.filter((r) => r.category === "unverified");
    if (unverified.length > 0) {
      items.push({
        id: "unverified-links",
        category: "technical",
        severity: "warning",
        label: `${unverified.length} link${unverified.length === 1 ? "" : "s"} couldn't be auto-verified`,
        description: `${unverified.length} link${unverified.length === 1 ? " was" : "s were"} blocked by an anti-bot wall (401/403/429) - the URLs may work fine for readers, our server just couldn't confirm.`,
        howToFix: "Open each one manually in a new tab to confirm it loads, then ignore the warning if it does.",
        jumpTo: { tab: "technical", anchorId: "anchor-link-check" },
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
        jumpTo: { tab: "technical", anchorId: "anchor-headings-structure" },
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
