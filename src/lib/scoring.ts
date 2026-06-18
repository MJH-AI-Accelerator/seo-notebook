import type { SEOAnalysis, DocumentFields } from "./types";

export interface ScoreComponent {
  label: string;
  points: number;
  max: number;
  detail: string;
}

export interface ContentScore {
  total: number;
  components: ScoreComponent[];
}

// Count whole-word / whole-phrase occurrences, anchored on word boundaries, so a
// short token like "as" or "cm" can't match inside "phase" or "cmv". Safari-safe:
// uses \b only (no lookbehind). The needle is regex-escaped.
function countWholeMatches(haystack: string, needle: string): number {
  if (!needle) return 0;
  const esc = needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const m = haystack.match(new RegExp(`\\b${esc}\\b`, "g"));
  return m ? m.length : 0;
}

/**
 * Client-side content score (0-100) with per-component breakdown.
 * Mirrors backend scoring.ts.
 */
export function calculateContentScoreDetailed(content: string, analysis: SEOAnalysis, documentFields?: DocumentFields): ContentScore {
  if (!content || !analysis) {
    return { total: 0, components: [] };
  }
  const lowerContent = content.toLowerCase();
  const words = content.split(/\s+/).filter(Boolean).length;
  const components: ScoreComponent[] = [];

  // 1. Primary keyword (up to 25)
  const primaryTerm = (analysis.primaryKeyword?.term || "").toLowerCase();
  if (primaryTerm) {
    // A multi-word primary like "acoramidis ATTR-CM" almost never appears as an
    // adjacent phrase, but if every token is in the body the keyword IS present.
    // Try the exact phrase first; otherwise fall back to token co-occurrence (all
    // tokens present) and use the rarest token as the concept's mention count.
    // (This mirrors tokensContain() used by the Meta + Summary audits.)
    const tokens = primaryTerm.split(/\s+/).filter((t) => t.length > 1);
    const phraseCount = countWholeMatches(lowerContent, primaryTerm);
    let occurrences = phraseCount;
    let viaTokens = false;
    if (phraseCount === 0 && tokens.length > 0) {
      const counts = tokens.map((t) => countWholeMatches(lowerContent, t));
      if (counts.every((c) => c > 0)) {
        occurrences = Math.min(...counts);
        viaTokens = true;
      }
    }
    const primaryWordCount = Math.max(1, primaryTerm.split(/\s+/).filter(Boolean).length);
    let pts = 0;
    let detail: string;
    if (occurrences === 0) {
      detail = `Primary keyword "${primaryTerm}" not found in content`;
    } else {
      pts += 12;
      // Exact phrase: an N-word phrase appearing M times occupies M*N keyword-words.
      // Token co-occurrence: tokens are spread through the body, so count each once.
      const density = words > 0
        ? ((viaTokens ? occurrences : occurrences * primaryWordCount) / words) * 100
        : 0;
      if (density >= 0.5 && density <= 2.5) {
        pts += 13;
        detail = `Primary keyword present, density ${density.toFixed(2)}% (ideal range)`;
      } else if (density < 0.5) {
        pts += 7;
        detail = `Primary keyword present but density only ${density.toFixed(2)}% - aim for 0.5-2.5%`;
      } else if (viaTokens && density <= 6) {
        // Tokens spread through the body is topical depth, not keyword stuffing.
        pts += 11;
        detail = `Primary keyword strongly represented (${density.toFixed(2)}%)`;
      } else {
        pts += 4;
        detail = `Primary keyword over-used at ${density.toFixed(2)}% density - reduce to 0.5-2.5%`;
      }
    }
    components.push({ label: "Primary keyword", points: pts, max: 25, detail });
  } else {
    components.push({ label: "Primary keyword", points: 0, max: 25, detail: "No primary keyword identified yet" });
  }

  // 2. Supporting keyword coverage (up to 25)
  const supportingKws = analysis.supportingKeywords || [];
  if (supportingKws.length > 0) {
    const inContentCount = supportingKws.filter((kw) => kw != null && typeof kw.term === "string" && lowerContent.includes(kw.term.toLowerCase())).length;
    const coverageRatio = inContentCount / supportingKws.length;
    const pts = Math.round(coverageRatio * 25);
    components.push({
      label: "Supporting keywords",
      points: pts,
      max: 25,
      detail: `${inContentCount} of ${supportingKws.length} supporting keywords present (${Math.round(coverageRatio * 100)}%)`,
    });
  } else {
    components.push({ label: "Supporting keywords", points: 0, max: 25, detail: "No supporting keywords yet" });
  }

  // 3. Word count (up to 15)
  // 450 is the body-text floor. 1,500+ is the competitive target for HCP clinical articles.
  let wcPts = 0;
  let wcDetail: string;
  if (words >= 1500) {
    wcPts = 15;
    wcDetail = `${words} words - strong length for clinical content`;
  } else if (words >= 450) {
    wcPts = 11;
    wcDetail = `${words} words - above the 450 floor; 1,500+ is the clinical target`;
  } else if (words >= 200) {
    wcPts = 5;
    wcDetail = `${words} words - below the 450-word floor`;
  } else {
    wcDetail = `${words} words - start writing`;
  }
  components.push({ label: "Word count", points: wcPts, max: 15, detail: wcDetail });

  // 4. Heading structure (up to 10)
  // Prefer the structured heading data extracted from the document. The plain
  // `content` string has no markup, so regexing it for #/<h3> misses real
  // headings - fall back to the regex only for plain-text callers.
  let hasH1orTitle: boolean;
  let hasSubheadings: boolean;
  if (documentFields) {
    hasH1orTitle = !!(documentFields.title && documentFields.title.trim());
    const det = documentFields.headingsDetailed;
    // Any H2+ heading counts as a subheading. Fall back to the flat heading list
    // when the detailed list is absent OR empty, so a real outline is never missed.
    const detHasSub = Array.isArray(det) && det.some((h) => h.level >= 2);
    hasSubheadings = detHasSub || (documentFields.headings?.length || 0) > 0;
  } else {
    hasH1orTitle = /^#\s|<h1/im.test(content);
    hasSubheadings = /^##\s|^###\s|<h2|<h3/im.test(content);
  }
  const structurePts = (hasH1orTitle ? 5 : 0) + (hasSubheadings ? 5 : 0);
  const structureDetail = !hasH1orTitle && !hasSubheadings
    ? "No title or subheadings detected"
    : !hasSubheadings
    ? "Has a title but no H2/H3 subheadings - add section headings"
    : !hasH1orTitle
    ? "Has subheadings but no title"
    : "Title and subheadings present";
  components.push({ label: "Heading structure", points: structurePts, max: 10, detail: structureDetail });

  // 5. Missing keyword coverage (up to 15)
  const missingCount = (analysis.missingKeywords || []).length;
  let mPts = 0;
  let mDetail: string;
  if (missingCount === 0) {
    mPts = 15;
    mDetail = "No missing keywords flagged";
  } else if (missingCount <= 2) {
    mPts = 10;
    mDetail = `${missingCount} suggested keywords missing - quick add`;
  } else if (missingCount <= 4) {
    mPts = 5;
    mDetail = `${missingCount} suggested keywords missing`;
  } else {
    mDetail = `${missingCount} suggested keywords missing - significant gaps`;
  }
  components.push({ label: "Missing keyword gap", points: mPts, max: 15, detail: mDetail });

  // 6. AEO signals (up to 10) - question-format headings that Google answer
  // features and AI engines surface directly. (FAQ scoring removed May 2026 after
  // Google sunset FAQ rich results - question headings are the modern equivalent.)
  // Detect from the structured heading list (plain `content` has no heading
  // markup to regex). Single clean tier: 0 / 4 / 7 / 10 for 0 / 1 / 2 / 3+.
  let qCount: number;
  if (documentFields) {
    qCount = (documentFields.headings || []).filter((h) => h.trim().endsWith("?")).length;
  } else {
    qCount = (content.match(/^#{1,6}\s+.*\?$/gm) || []).length + (content.match(/<h[1-6][^>]*>.*\?<\/h[1-6]>/gi) || []).length;
  }
  let aeoPts = 0;
  if (qCount >= 3) aeoPts = 10;
  else if (qCount === 2) aeoPts = 7;
  else if (qCount === 1) aeoPts = 4;
  const aeoDetail =
    qCount === 0
      ? "No question-style headings - AI answer engines favor them"
      : `${qCount} question heading${qCount === 1 ? "" : "s"}`;
  components.push({ label: "AEO signals", points: aeoPts, max: 10, detail: aeoDetail });

  const total = components.reduce((sum, c) => sum + c.points, 0);
  return { total: Math.min(100, Math.max(0, total)), components };
}

/**
 * Backward-compatible: returns just the numeric score.
 */
export function calculateContentScore(content: string, analysis: SEOAnalysis): number {
  return calculateContentScoreDetailed(content, analysis).total;
}
