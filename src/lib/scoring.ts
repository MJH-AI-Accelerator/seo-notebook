import type { SEOAnalysis } from "./types";

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

/**
 * Client-side content score (0-100) with per-component breakdown.
 * Mirrors backend scoring.ts.
 */
export function calculateContentScoreDetailed(content: string, analysis: SEOAnalysis): ContentScore {
  if (!content || !analysis) {
    return { total: 0, components: [] };
  }
  const lowerContent = content.toLowerCase();
  const words = content.split(/\s+/).filter(Boolean).length;
  const components: ScoreComponent[] = [];

  // 1. Primary keyword (up to 25)
  const primaryTerm = (analysis.primaryKeyword?.term || "").toLowerCase();
  if (primaryTerm) {
    const escaped = primaryTerm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const primaryRegex = new RegExp(escaped, "gi");
    const primaryMatches = content.match(primaryRegex);
    const primaryCount = primaryMatches?.length || 0;
    let pts = 0;
    let detail: string;
    if (primaryCount === 0) {
      detail = `Primary keyword "${primaryTerm}" not found in content`;
    } else {
      pts += 12;
      const density = words > 0 ? (primaryCount / words) * 100 : 0;
      if (density >= 0.5 && density <= 2.5) {
        pts += 13;
        detail = `Primary keyword present, density ${density.toFixed(2)}% (ideal range)`;
      } else if (density < 0.5) {
        pts += 7;
        detail = `Primary keyword present but density only ${density.toFixed(2)}% - aim for 0.5-2.5%`;
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
    const inContentCount = supportingKws.filter((kw) => lowerContent.includes(kw.term.toLowerCase())).length;
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
  let wcPts = 0;
  let wcDetail: string;
  if (words >= 1500) {
    wcPts = 15;
    wcDetail = `${words} words - meets 2026 HCP standard (1,500+)`;
  } else if (words >= 800) {
    wcPts = 12;
    wcDetail = `${words} words - decent but below the 1,500 HCP standard`;
  } else if (words >= 400) {
    wcPts = 8;
    wcDetail = `${words} words - too thin for competitive HCP ranking`;
  } else if (words >= 200) {
    wcPts = 4;
    wcDetail = `${words} words - far below ranking threshold`;
  } else {
    wcDetail = `${words} words - start writing`;
  }
  components.push({ label: "Word count", points: wcPts, max: 15, detail: wcDetail });

  // 4. Heading structure (up to 10)
  const hasH1orTitle = /^#\s|<h1/im.test(content);
  const hasSubheadings = /^##\s|^###\s|<h2|<h3/im.test(content);
  const structurePts = (hasH1orTitle ? 5 : 0) + (hasSubheadings ? 5 : 0);
  const structureDetail = !hasH1orTitle && !hasSubheadings
    ? "No headings detected - add H2/H3 structure"
    : !hasSubheadings
    ? "Has title but no subheadings"
    : !hasH1orTitle
    ? "Has subheadings but no clear H1"
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

  // 6. AEO signals (up to 10)
  let aeoPts = 0;
  const questionHeadings = content.match(/^#{1,6}\s+.*\?$/gm) || content.match(/<h[1-6][^>]*>.*\?<\/h[1-6]>/gi);
  const qCount = questionHeadings?.length || 0;
  if (qCount >= 2) aeoPts += 4;
  else if (qCount >= 1) aeoPts += 2;
  const hasFaq = /faq|frequently asked/i.test(content);
  if (hasFaq) aeoPts += 4;
  if (qCount > 0) aeoPts += 2;
  const aeoDetail =
    qCount === 0 && !hasFaq
      ? "No question headings or FAQ section - AEO surface area is zero"
      : `${qCount} question heading${qCount === 1 ? "" : "s"}${hasFaq ? " + FAQ section" : ""}`;
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
