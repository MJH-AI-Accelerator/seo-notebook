"use client";

import { useMemo, useState } from "react";
import { LoadingBars } from "../LoadingBars";
import { MJH_BLUE, MJH_GOLD } from "../styles";
import type { DocumentFields, HeadingItem, LinkCheckResult, TechnicalAuditItem } from "../../lib/types";
import { isShortFormContent } from "../../lib/summary";
import { containsKeywordTokens, keywordLeadsSlug } from "../../lib/utils";

interface TechnicalTabProps {
  text: string;
  documentFields?: DocumentFields;
  primaryKeyword?: string;
  secondaryKeyword?: string;
  isLoading?: boolean;
  linkCheckResults: LinkCheckResult[];
  isLinkCheckLoading: boolean;
  linkCheckError: string | null;
  hasRunLinkCheck: boolean;
  onCheckLinks: () => void;
}

// URL Slug audit. Deliberately vague and non-numeric: we never cite a character
// count or say "too long" - just scan for the primary keyword (ideally leading
// the URL) and nudge toward short, descriptive slugs.
function urlAudit(slug?: string, primaryKeyword?: string, secondaryKeyword?: string): TechnicalAuditItem {
  const SHORT_DESC = "Keep the URL short and descriptive - concise URLs are easier to read - and avoid trailing, duplicate, or excessive spaces.";
  if (!slug) {
    return {
      label: "URL Slug",
      value: "Missing",
      status: "warning",
      recommendation: `Add a URL slug that leads with your primary keyword. ${SHORT_DESC}`,
    };
  }
  const slugAsWords = slug.replace(/-/g, " ");
  const hasPrimary = primaryKeyword ? containsKeywordTokens(slugAsWords, primaryKeyword) : true;
  const leads = primaryKeyword ? keywordLeadsSlug(slug, primaryKeyword) : true;
  const hasSecondary = secondaryKeyword ? containsKeywordTokens(slugAsWords, secondaryKeyword) : true;

  if (primaryKeyword && !hasPrimary) {
    const secNote = secondaryKeyword && !hasSecondary ? ` Your secondary keyword "${secondaryKeyword}" could follow it.` : "";
    return {
      label: "URL Slug",
      value: `/${slug}`,
      status: "warning",
      recommendation: `Work your primary keyword "${primaryKeyword}" into the URL, ideally at the start - if the address gets shortened, a leading keyword still shows.${secNote} ${SHORT_DESC}`,
    };
  }
  if (primaryKeyword && hasPrimary && !leads) {
    return {
      label: "URL Slug",
      value: `/${slug}`,
      status: "warning",
      recommendation: `Your primary keyword is in the URL but not at the start. Leading with it reads better and holds up if the address gets shortened. ${SHORT_DESC}`,
    };
  }
  // Primary leads (or no primary set). Clean pass.
  return { label: "URL Slug", value: `/${slug}`, status: "good" };
}

// Caution block that lives INSIDE the URL Slug card. Changing an indexed page's
// slug without a 301 redirect drops its search rankings to zero and breaks every
// external link to the old URL - a warning (avoidable), not an error.
function SlugRedirectNotice() {
  const [expanded, setExpanded] = useState(false);
  return (
    <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid rgba(0,0,0,0.07)" }}>
      <div style={{ padding: "8px 10px", background: "rgba(245,158,11,0.08)", borderLeft: "2px solid #f59e0b", borderRadius: 6 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
          <svg width="12" height="12" viewBox="0 0 20 20" fill="#f59e0b" aria-hidden="true">
            <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
          </svg>
          <span style={{ fontSize: 10.5, fontWeight: 700, color: "#b45309", textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Changing a URL?
          </span>
        </div>
        <div style={{ fontSize: 11, color: "#1f2937", lineHeight: 1.55 }}>
          If the page has been published and indexed, you MUST add a 301 redirect from the old slug to the new one before changing it. For a brand-new page that's never been published, no redirect needed.
        </div>
        <button
          onClick={() => setExpanded((v) => !v)}
          style={{ display: "flex", alignItems: "center", gap: 3, marginTop: 6, padding: 0, background: "none", border: "none", cursor: "pointer", fontSize: 10.5, fontWeight: 700, color: "#b45309", fontFamily: "inherit" }}
        >
          {expanded ? "Show less" : "Learn more"}
          <svg width="10" height="10" viewBox="0 0 20 20" fill="currentColor" style={{ transform: expanded ? "rotate(180deg)" : "none", transition: "transform 150ms" }}>
            <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
          </svg>
        </button>
        {expanded && (
          <ul style={{ margin: "6px 0 0", paddingLeft: 16, fontSize: 11, color: "#1f2937", lineHeight: 1.55 }}>
            <li>Without the 301, the page loses every search ranking and every external link to it breaks.</li>
            <li>A 301 preserves the rankings and link equity built up on the old URL.</li>
            <li>Set this up using vanity redirects in Sanity.</li>
          </ul>
        )}
      </div>
    </div>
  );
}

const cardStyle: React.CSSProperties = {
  borderRadius: 14,
  background: "rgba(255,255,255,0.55)",
  backdropFilter: "blur(16px) saturate(170%)",
  WebkitBackdropFilter: "blur(16px) saturate(170%)",
  boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.85), inset 1.5px 2px 1px -1px rgba(255,255,255,1), inset -2px -3px 2px -1px rgba(255,255,255,0.6), 0 2px 6px rgba(0,0,0,0.07), 0 10px 26px rgba(0,0,0,0.08)",
  padding: "14px",
};

function StatusBadge({ status }: { status: TechnicalAuditItem["status"] }) {
  const map = {
    good: { bg: "rgba(22,163,74,0.12)", color: "#16a34a", label: "Good" },
    warning: { bg: "rgba(230,192,27,0.18)", color: "#8B7310", label: "Review" },
    error: { bg: "rgba(220,38,38,0.1)", color: "#dc2626", label: "Fix" },
  } as const;
  const c = map[status];
  return (
    <span style={{
      fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em",
      padding: "2px 7px", borderRadius: 99, background: c.bg, color: c.color, flexShrink: 0,
    }}>
      {c.label}
    </span>
  );
}

function AuditCard({ label, value, status, recommendation, anchorId, footer }: { label: string; value: string; status: TechnicalAuditItem["status"]; recommendation?: string; anchorId?: string; footer?: React.ReactNode }) {
  return (
    <div id={anchorId} style={cardStyle}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 6 }}>
        <span style={{ fontSize: 10.5, textTransform: "uppercase", letterSpacing: "0.06em", color: "#4b5563", fontWeight: 600 }}>{label}</span>
        <StatusBadge status={status} />
      </div>
      <div style={{
        fontSize: 12, color: status === "error" ? "#9ca3af" : "#374151", lineHeight: 1.5,
        fontStyle: status === "error" ? "italic" : "normal", wordBreak: "break-word",
      }}>
        {value}
      </div>
      {recommendation && (
        <div style={{
          marginTop: 8, padding: "6px 10px",
          background: status === "error" ? "rgba(220,38,38,0.04)" : "rgba(230,192,27,0.06)",
          borderLeft: `2px solid ${status === "error" ? "#dc2626" : "#E6C01B"}`,
          borderRadius: 6, fontSize: 11, color: "#1f2937", lineHeight: 1.5,
        }}>
          {recommendation}
        </div>
      )}
      {/* Optional extra content inside the card box (e.g. the 301 redirect caution
          under URL Slug) - same box, no connector. */}
      {footer}
    </div>
  );
}

const IMAGE_EXT_RE = /\.(jpe?g|png|gif|webp|svg|tiff?|bmp)$/i;
const GENERIC_FILENAME_RE = /^(IMG_|DSC|DCIM|screenshot|photo\d*|image\d*|untitled|file_?\d+|unsplash|stock)/i;

function classifyImageNames(names: string[]): { filenames: string[]; altTexts: string[] } {
  const filenames: string[] = [];
  const altTexts: string[] = [];
  for (const n of names) {
    if (IMAGE_EXT_RE.test(n)) filenames.push(n);
    else altTexts.push(n);
  }
  return { filenames, altTexts };
}

function imageFilenameAudit(filenames: string[]): TechnicalAuditItem | null {
  if (filenames.length === 0) return null;
  const issues: { filename: string; reason: string }[] = [];
  for (const f of filenames) {
    const base = f.replace(IMAGE_EXT_RE, "");
    if (GENERIC_FILENAME_RE.test(base)) {
      issues.push({ filename: f, reason: "generic name from a camera or screenshot tool" });
      continue;
    }
    if (/_/.test(base)) {
      issues.push({ filename: f, reason: "uses underscores instead of hyphens" });
      continue;
    }
    if (/\s/.test(base)) {
      issues.push({ filename: f, reason: "contains spaces (use hyphens)" });
      continue;
    }
    const words = base.split("-").filter(Boolean);
    if (words.length < 2) {
      issues.push({ filename: f, reason: "single word - use 2-3 descriptive hyphenated words" });
    } else if (words.length > 5) {
      issues.push({ filename: f, reason: "too many words - keep to 3-5" });
    }
  }
  if (issues.length === 0) {
    return {
      label: "Image Filenames",
      value: `${filenames.length} filename${filenames.length === 1 ? "" : "s"} look descriptive`,
      status: "good",
    };
  }
  const examples = issues.slice(0, 2).map((i) => `"${i.filename}" - ${i.reason}`).join("; ");
  return {
    label: "Image Filenames",
    value: `${issues.length} of ${filenames.length} filename${filenames.length === 1 ? "" : "s"} need attention`,
    status: "warning",
    recommendation: `${examples}. Use 2-3 hyphenated descriptive words, ideally including the primary keyword.`,
  };
}

// Alt-text audit. Per director guidance, alt text should be roughly 2-5
// descriptive keywords - flag only a bare single word or text over 125 chars.
function imageAltTextAudit(altTexts: string[]): TechnicalAuditItem | null {
  if (altTexts.length === 0) return null;
  const issues: { alt: string; reason: string }[] = [];
  let audited = 0; // non-empty alt texts actually evaluated (blank = decorative, skipped)
  for (const alt of altTexts) {
    const trimmed = alt.trim();
    if (!trimmed) continue;
    audited++;
    const len = trimmed.length;
    const wc = trimmed.split(/\s+/).filter(Boolean).length;
    if (len >= 125) {
      issues.push({ alt: trimmed, reason: `${len} chars - shorten to under 125` });
    } else if (wc < 2) {
      issues.push({ alt: trimmed, reason: "just one word - use 2-5 descriptive keywords" });
    }
  }
  if (audited === 0) return null; // all images have intentionally-empty (decorative) alt
  if (issues.length === 0) {
    return {
      label: "Image Alt Text",
      value: `${audited} alt text${audited === 1 ? "" : "s"} look well-formed`,
      status: "good",
    };
  }
  const examples = issues.slice(0, 2).map((i) => {
    const short = i.alt.length > 50 ? `${i.alt.slice(0, 50)}...` : i.alt;
    return `"${short}" - ${i.reason}`;
  }).join("; ");
  return {
    label: "Image Alt Text",
    value: `${issues.length} of ${audited} alt text${audited === 1 ? "" : "s"} need attention`,
    status: "warning",
    recommendation: `${examples}. Alt text should be 2-5 descriptive keywords that describe the image, ideally including the primary keyword, and stay under 125 characters.`,
  };
}

// Image title audit. Per the director, the title attribute (hover tooltip) sends
// an SEO signal, so each image should carry a short descriptive title.
// When NONE of the document's images have a title field at all, the host schema
// likely doesn't expose one - skip silently rather than flag every image.
function imageTitleAudit(titles: string[], imageCount: number): TechnicalAuditItem | null {
  if (imageCount <= 0) return null;
  const withTitle = titles.length;
  if (withTitle === 0) return null; // schema doesn't expose a title field - skip
  const missing = imageCount - withTitle;
  if (missing > 0) {
    return {
      label: "Image Titles",
      value: `${withTitle} of ${imageCount} image${imageCount === 1 ? "" : "s"} ${withTitle === 1 ? "has" : "have"} a title`,
      status: "warning",
      recommendation: `Add a descriptive title attribute (2-5 keywords) to the ${missing} image${missing === 1 ? "" : "s"} without one. The title appears on hover and sends an SEO signal.`,
    };
  }
  const sparse = titles.filter((t) => t.trim().split(/\s+/).filter(Boolean).length < 2);
  if (sparse.length > 0) {
    return {
      label: "Image Titles",
      value: `${sparse.length} image title${sparse.length === 1 ? "" : "s"} ${sparse.length === 1 ? "is" : "are"} a single word`,
      status: "warning",
      recommendation: "Use 2-5 descriptive keywords in each image title, not a single word.",
    };
  }
  return {
    label: "Image Titles",
    value: `All ${imageCount} image${imageCount === 1 ? "" : "s"} have a descriptive title`,
    status: "good",
  };
}

function computeHeadingStructureAudits(
  headings: HeadingItem[],
  wordCount: number,
  primaryKeyword?: string,
  secondaryKeyword?: string,
  unstyledHeadings?: string[]
): TechnicalAuditItem[] {
  const audits: TechnicalAuditItem[] = [];
  // Count H2 AND H3 as section headings: an article sectioned only with H3s is
  // still sectioned, so it shouldn't be told it has "no section headings". Mirrors
  // the plugin + summary.ts.
  const sectionCount = headings.filter((h) => h.level === 2 || h.level === 3).length;

  // Heading-density check. Long articles need more section breaks; thresholds
  // backed by SEO best-practice research. Order matters: the zero-section case is
  // an error and must be checked before the softer warnings so it matches summary.ts.
  let densityFired = false;
  if (wordCount >= 1000 && sectionCount === 0) {
    audits.push({
      label: "Section Headings",
      value: `No section headings in a ${wordCount}-word article`,
      status: "error",
      recommendation: "Articles this long need section headings. Add 2-3 H2 (or H3) headings to break the body into scannable sections.",
    });
    densityFired = true;
  } else if (wordCount >= 2500 && sectionCount < 5) {
    audits.push({
      label: "Section Headings",
      value: `${sectionCount} section heading${sectionCount === 1 ? "" : "s"} for a ${wordCount}-word article`,
      status: "warning",
      recommendation: "Long articles read best with 1 section heading per 300-400 words. Break the content into more named sections so readers and search engines can navigate it.",
    });
    densityFired = true;
  } else if (wordCount >= 1500 && sectionCount < 3) {
    audits.push({
      label: "Section Headings",
      value: `${sectionCount} section heading${sectionCount === 1 ? "" : "s"} for a ${wordCount}-word article`,
      status: "warning",
      recommendation: "Articles above 1,500 words usually need at least 3 named sections. Add section breaks so the outline is scannable.",
    });
    densityFired = true;
  }

  // Lines that look like headings but were typed as plain text - nudge to style as H2.
  if (unstyledHeadings && unstyledHeadings.length > 0) {
    const n = unstyledHeadings.length;
    const examples = unstyledHeadings.slice(0, 2).map((t) => `"${t}"`).join(", ");
    audits.push({
      label: "Looks Like a Heading",
      value: `${n} line${n === 1 ? "" : "s"} read${n === 1 ? "s" : ""} like a heading but ${n === 1 ? "isn't" : "aren't"} styled`,
      status: "warning",
      recommendation: `${examples}${n > 2 ? ", and more," : ""} ${n === 1 ? "looks" : "look"} like a section heading typed as plain text. In Sanity, select the line and apply the "Heading 2" style so it counts as a real heading.`,
    });
  }

  if (headings.length === 0) {
    if (!densityFired) {
      audits.push({
        label: "Heading Structure",
        value: "No headings in body",
        status: "warning",
        recommendation: "Consider adding H2-H6 subheadings to structure the article into scannable sections.",
      });
    }
    return audits;
  }
  // (No "H1 in body" warning. The article title IS the page H1, and the Heading Outline
  // below now shows it explicitly - so a stray body H1 is displayed there, not scolded.)
  let prevLevel = 0;
  const skips: { from: number; to: number; at: string }[] = [];
  for (const h of headings) {
    if (prevLevel > 0 && h.level > prevLevel + 1) skips.push({ from: prevLevel, to: h.level, at: h.text || "(empty)" });
    prevLevel = h.level;
  }
  if (skips.length > 0) {
    const first = skips[0];
    audits.push({
      label: "Heading Hierarchy",
      value: `${skips.length} skipped level${skips.length === 1 ? "" : "s"}`,
      status: "warning",
      recommendation: `Headings jump from H${first.from} to H${first.to} at "${first.at.slice(0, 60)}". Use sequential levels (H2 → H3 → H4) so the outline reads cleanly to screen readers and search engines.`,
    });
  }
  const empties = headings.filter((h) => !h.text.trim());
  if (empties.length > 0) {
    audits.push({
      label: "Empty Headings",
      value: `${empties.length} empty heading${empties.length === 1 ? "" : "s"}`,
      status: "error",
      recommendation: "Either remove the empty heading blocks or fill them with text. Empty headings confuse the outline.",
    });
  }
  if (audits.length === 0) {
    audits.push({
      label: "Heading Structure",
      value: `${headings.length} heading${headings.length === 1 ? "" : "s"}, hierarchy is clean`,
      status: "good",
    });
  }

  // Keyword-in-headings nudge (separate from structural health). Reinforce relevance by
  // working the primary and/or secondary keyword into at least one subheading. Only fires
  // when subheadings actually exist - otherwise the "no headings" / density notes cover it.
  const subheads = headings.filter((h) => h.level >= 2);
  const subheadingText = subheads.map((h) => h.text).join("  ");
  const hasPrimaryInHeads = primaryKeyword ? containsKeywordTokens(subheadingText, primaryKeyword) : false;
  const hasSecondaryInHeads = secondaryKeyword ? containsKeywordTokens(subheadingText, secondaryKeyword) : false;
  if (subheads.length > 0 && (primaryKeyword || secondaryKeyword) && !hasPrimaryInHeads && !hasSecondaryInHeads) {
    const kw = [
      primaryKeyword ? `primary keyword "${primaryKeyword}"` : "",
      secondaryKeyword ? `secondary keyword "${secondaryKeyword}"` : "",
    ].filter(Boolean).join(" or ");
    audits.push({
      label: "Keywords in Headings",
      value: "No subheading uses your target keyword",
      status: "warning",
      recommendation: `Work your ${kw} into at least one H2 or H3. Keywords in headers reinforce relevance for readers and search engines.`,
    });
  }

  return audits;
}

// Small health badge for a checked URL (OK / 301 / 404 / BLOCKED ...).
function HealthBadge({ result }: { result: LinkCheckResult }) {
  const map = {
    ok: { color: "#16a34a", label: "OK" },
    redirect: { color: "#8B7310", label: result.status > 0 ? String(result.status) : "REDIR" },
    broken: { color: "#dc2626", label: result.status > 0 ? String(result.status) : "404" },
    unverified: { color: "#b45309", label: result.status > 0 ? String(result.status) : "BLOCKED" },
    error: { color: "#dc2626", label: "ERR" },
  } as const;
  const c = map[result.category];
  return (
    <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.04em", padding: "2px 6px", borderRadius: 99, background: "#ffffff", color: c.color, fontVariantNumeric: "tabular-nums", flexShrink: 0, marginTop: 1 }}>
      {c.label}
    </span>
  );
}

function LinkCheckCard({
  urls,
  linksDetailed,
  results,
  isLoading,
  error,
  hasRun,
  onCheck,
}: {
  urls: string[];
  linksDetailed?: { url: string; hyperlinked: boolean; anchorText?: string }[];
  results: LinkCheckResult[];
  isLoading: boolean;
  error: string | null;
  hasRun: boolean;
  onCheck: () => void;
}) {
  const [openBucket, setOpenBucket] = useState<string | null>(null);
  const haveTypes = !!linksDetailed;
  const detailByUrl = useMemo(() => new Map((linksDetailed || []).map((d) => [d.url, d])), [linksDetailed]);
  const resultByUrl = useMemo(() => new Map(results.map((r) => [r.url, r])), [results]);

  // Paired tiles (see plugin): Working/Broken (health) + Linked/Not-linked (type). Interleaved
  // so a 2-column grid stacks opposites. "Working" includes redirects.
  const blockedUrls = results.filter((r) => r.category === "unverified").map((r) => r.url);
  const tiles = useMemo(() => {
    const hyper = (linksDetailed || []).filter((l) => l.hyperlinked).map((l) => l.url);
    const plain = (linksDetailed || []).filter((l) => !l.hyperlinked).map((l) => l.url);
    const working = results.filter((r) => r.category === "ok" || r.category === "redirect").map((r) => r.url);
    const broken = results.filter((r) => r.category === "broken" || r.category === "error").map((r) => r.url);
    const t: { key: string; label: string; color: string; urls: string[]; note?: string }[] = [];
    if (hasRun) t.push({ key: "working", label: "Working", color: "#16a34a", urls: working });
    if (haveTypes) t.push({ key: "linked", label: "Linked", color: "#16a34a", urls: hyper });
    if (hasRun) t.push({ key: "broken", label: "Broken", color: "#dc2626", urls: broken });
    if (haveTypes) t.push({ key: "notlinked", label: "Not linked", color: "#dc2626", urls: plain, note: "Not links yet - hyperlink these so readers can click them and search engines can follow them." });
    return t;
  }, [haveTypes, linksDetailed, hasRun, results]);

  const open = tiles.find((t) => t.key === openBucket) || null;

  const renderLinkRow = (url: string) => {
    const d = detailByUrl.get(url);
    const r = resultByUrl.get(url);
    return (
      <a key={url} href={url} target="_blank" rel="noopener noreferrer" style={{ display: "flex", gap: 8, alignItems: "flex-start", padding: "6px 8px", background: "rgba(0,0,0,0.025)", borderRadius: 6, textDecoration: "none", marginTop: 4 }}>
        {r && <HealthBadge result={r} />}
        <div style={{ minWidth: 0, flex: 1 }}>
          {d?.anchorText && (
            <div style={{ fontSize: 11, color: "#1f2937", fontWeight: 600, lineHeight: 1.3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>&ldquo;{d.anchorText}&rdquo;</div>
          )}
          <div style={{ fontSize: 10, color: "#4b5563", fontFamily: "ui-monospace, SFMono-Regular, monospace", wordBreak: "break-all", lineHeight: 1.35 }}>{url}</div>
        </div>
      </a>
    );
  };

  return (
    <div id="anchor-link-check" style={cardStyle}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 6 }}>
        <span style={{ fontSize: 10.5, textTransform: "uppercase", letterSpacing: "0.06em", color: "#4b5563", fontWeight: 600 }}>Link Health</span>
        {hasRun && !isLoading && (
          <button onClick={onCheck} style={{ background: "none", border: "none", fontSize: 10, fontWeight: 600, color: MJH_BLUE, cursor: "pointer", padding: "2px 4px" }} title="Run again">Re-check</button>
        )}
      </div>

      {urls.length === 0 ? (
        <div style={{ fontSize: 11, color: "#4b5563", lineHeight: 1.5 }}>No links found in the body.</div>
      ) : (
        <>
          <div style={{ fontSize: 11, color: "#4b5563", lineHeight: 1.5, marginBottom: 10 }}>
            {urls.length} link{urls.length === 1 ? "" : "s"} in the body.{tiles.length > 0 ? " Tap a box to see which." : ""}
          </div>

          {tiles.length > 0 && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 6 }}>
              {tiles.map((t) => {
                const empty = t.urls.length === 0;
                const active = openBucket === t.key && !empty;
                return (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => !empty && setOpenBucket(active ? null : t.key)}
                    aria-expanded={active}
                    aria-label={`${t.urls.length} ${t.label} links`}
                    style={{ padding: "8px 4px", background: active ? "rgba(0,93,172,0.08)" : "rgba(0,0,0,0.025)", border: active ? `1px solid ${MJH_BLUE}55` : "1px solid transparent", borderRadius: 8, textAlign: "center", cursor: empty ? "default" : "pointer", opacity: empty ? 0.5 : 1 }}
                  >
                    <div style={{ fontSize: 18, fontWeight: 700, color: t.color, fontVariantNumeric: "tabular-nums", lineHeight: 1 }}>{t.urls.length}</div>
                    <div style={{ fontSize: 9, fontWeight: 700, color: "#4b5563", textTransform: "uppercase", letterSpacing: "0.05em", marginTop: 4 }}>{t.label}</div>
                  </button>
                );
              })}
            </div>
          )}

          {open && open.urls.length > 0 && (
            <div style={{ marginTop: 8 }}>
              {open.note && (
                <div style={{ fontSize: 10.5, color: "#92400e", background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.25)", borderRadius: 6, padding: "6px 9px", lineHeight: 1.45, marginBottom: 2 }}>{open.note}</div>
              )}
              {open.urls.map(renderLinkRow)}
            </div>
          )}

          {hasRun && blockedUrls.length > 0 && (
            <div style={{ marginTop: 8, padding: "6px 10px", background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.25)", borderRadius: 6, fontSize: 10.5, color: "#92400e", lineHeight: 1.45 }}>
              {blockedUrls.length} link{blockedUrls.length === 1 ? "" : "s"} couldn&apos;t be auto-checked (the destination blocks our checker) - open them to confirm.
            </div>
          )}

          {!hasRun && !isLoading && (
            <button onClick={onCheck} style={{ width: "100%", marginTop: 10, padding: "8px 12px", fontSize: 11, fontWeight: 700, color: "#1f2937", background: MJH_GOLD, border: "none", borderRadius: 6, cursor: "pointer", letterSpacing: "0.01em" }}>
              Check {urls.length} link{urls.length === 1 ? "" : "s"} for broken / redirects
            </button>
          )}

          {isLoading && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "16px 0" }}>
              <LoadingBars size="xs" color={MJH_BLUE} />
              <span style={{ fontSize: 11, color: "#4b5563" }}>Checking {urls.length} link{urls.length === 1 ? "" : "s"}...</span>
            </div>
          )}

          {error && !isLoading && (
            <div style={{ marginTop: 10, padding: "10px 12px", background: "rgba(220,38,38,0.04)", border: "1px solid rgba(220,38,38,0.18)", borderRadius: 8, fontSize: 11, color: "#b91c1c", lineHeight: 1.5 }}>
              {error}
              <button onClick={onCheck} style={{ display: "block", marginTop: 6, padding: "4px 10px", fontSize: 11, fontWeight: 700, color: "#ffffff", background: "#dc2626", border: "none", borderRadius: 5, cursor: "pointer" }}>Try again</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export function TechnicalTab({
  text, documentFields, primaryKeyword, secondaryKeyword, isLoading,
  linkCheckResults, isLinkCheckLoading, linkCheckError, hasRunLinkCheck, onCheckLinks,
}: TechnicalTabProps) {
  const urlSlugAudit = useMemo(
    () => urlAudit(documentFields?.slug, primaryKeyword, secondaryKeyword),
    [documentFields?.slug, primaryKeyword, secondaryKeyword]
  );
  const headings = documentFields?.headings || [];
  const headingsDetailed = documentFields?.headingsDetailed;
  const headingsForStructure: HeadingItem[] = headingsDetailed ?? headings.map((t) => ({ text: t, level: 2 }));
  const wordCount = text ? text.split(/\s+/).filter(Boolean).length : 0;
  const structureAudits = useMemo(() => computeHeadingStructureAudits(headingsForStructure, wordCount, primaryKeyword, secondaryKeyword), [headingsForStructure, wordCount, primaryKeyword, secondaryKeyword]);

  const imageNames = documentFields?.imageNames || [];
  const { filenames: imageFilenames, altTexts: imageAltTexts } = useMemo(
    () => classifyImageNames(imageNames),
    [imageNames]
  );
  const filenameAudit = useMemo(() => imageFilenameAudit(imageFilenames), [imageFilenames]);
  const altTextAudit = useMemo(() => imageAltTextAudit(imageAltTexts), [imageAltTexts]);
  const imageTitles = documentFields?.imageTitles || [];
  const imageCount = documentFields?.imageCount ?? 0;
  const imgTitleAudit = useMemo(() => imageTitleAudit(imageTitles, imageCount), [imageTitles, imageCount]);
  const hasImages = imageCount > 0 || imageNames.length > 0;
  const imagesAudit: TechnicalAuditItem | null = !hasImages
    ? { label: "Images", value: "No images detected", status: "warning", recommendation: "Add at least one hero image with descriptive alt text. Articles with images perform better on both reader engagement and search." }
    : null;

  // Empty body = the editor hasn't written yet (or it hasn't loaded); show no card
  // rather than a red "Fix" alarm, matching summary.ts.
  // Videos / podcasts / news / briefs are legitimately short - exempt from the floor.
  const isShortForm = isShortFormContent(documentFields, documentFields?.title);
  const wordAudit: TechnicalAuditItem | null = wordCount === 0
    ? null
    : isShortForm
    ? { label: "Word Count", value: `${wordCount} words`, status: "good" }
    : wordCount < 450
    ? { label: "Word Count", value: `${wordCount} words`, status: "error", recommendation: "Body copy should be at least 450 words. Add more written content." }
    : wordCount < 1500
    ? { label: "Word Count", value: `${wordCount} words`, status: "warning", recommendation: "Above the 450-word floor. For competitive clinical content, push past 1,500 words." }
    : { label: "Word Count", value: `${wordCount} words`, status: "good" };

  const bodyLinks = documentFields?.bodyLinks || [];

  const hasAnyField = !!documentFields && (
    documentFields.title !== undefined ||
    (documentFields.headings && documentFields.headings.length > 0) ||
    (documentFields.imageNames && documentFields.imageNames.length > 0) ||
    wordCount > 0
  );
  if (isLoading && !hasAnyField) {
    return (
      <div style={{ padding: 24, textAlign: "center" }}>
        <div style={{ fontSize: 13, color: "#4b5563", fontWeight: 500 }}>Reading document fields...</div>
        <div style={{ fontSize: 11, color: "#4b5563", marginTop: 4 }}>Audit will run once content loads</div>
      </div>
    );
  }

  return (
    <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 10 }}>
      <AuditCard
        anchorId="anchor-url-slug"
        label={urlSlugAudit.label}
        value={urlSlugAudit.value}
        status={urlSlugAudit.status}
        recommendation={urlSlugAudit.recommendation}
        footer={<SlugRedirectNotice />}
      />

      {/* Link Health sits right under URL Slug - both are about the page's links. */}
      <LinkCheckCard
        urls={bodyLinks}
        results={linkCheckResults}
        isLoading={isLinkCheckLoading}
        error={linkCheckError}
        hasRun={hasRunLinkCheck}
        onCheck={onCheckLinks}
      />

      {wordAudit && <AuditCard anchorId="anchor-word-count" label={wordAudit.label} value={wordAudit.value} status={wordAudit.status} recommendation={wordAudit.recommendation} />}

      {(() => {
        const structIdx = structureAudits.findIndex((a) => a.label !== "Keywords in Headings" && a.label !== "Looks Like a Heading");
        return structureAudits.map((a, i) => (
          <AuditCard key={`structure-${i}`} anchorId={a.label === "Keywords in Headings" ? "anchor-headings-keyword" : a.label === "Looks Like a Heading" ? "anchor-headings-unstyled" : i === structIdx ? "anchor-headings-structure" : undefined} label={a.label} value={a.value} status={a.status} recommendation={a.recommendation} />
        ));
      })()}

      {(headings.length > 0 || !!documentFields?.title) && (
        <div id="anchor-headings-outline" style={{ ...cardStyle, padding: "8px 14px" }}>
          <div style={{ fontSize: 10, color: "#4b5563", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600, marginBottom: 6 }}>
            Heading Outline
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {/* The article title renders as the page H1 - show it first so editors can see
                exactly what their H1 is, then the body headings the tool scanned below it. */}
            {documentFields?.title && (
              <div style={{ fontSize: 11, color: MJH_BLUE, fontWeight: 700, lineHeight: 1.4 }}>
                <span style={{ fontSize: 9, fontWeight: 700, color: MJH_BLUE, marginRight: 6 }}>H1</span>
                {documentFields.title}
                <span style={{ fontSize: 9, color: "#6b7280", fontWeight: 500, marginLeft: 6 }}>(article title)</span>
              </div>
            )}
            {(headingsDetailed ? headingsDetailed.slice(0, 12) : headings.slice(0, 12).map((h) => ({ text: h, level: 2 }))).map((h, i) => {
              const isH1 = h.level === 1;
              return (
                <div key={i} style={{
                  fontSize: 11,
                  color: !h.text ? "#dc2626" : isH1 ? MJH_BLUE : "#4b5563",
                  fontWeight: isH1 ? 700 : 400,
                  fontStyle: h.text ? "normal" : "italic", lineHeight: 1.4,
                  paddingLeft: Math.max(0, (h.level - 2) * 12),
                }}>
                  <span style={{ fontSize: 9, fontWeight: 700, color: isH1 ? MJH_BLUE : "#4b5563", marginRight: 6 }}>H{h.level}</span>
                  {h.text || "(empty)"}
                </div>
              );
            })}
            {(headingsDetailed ?? headings).length > 12 && <div style={{ fontSize: 10, color: "#4b5563" }}>+ {(headingsDetailed ?? headings).length - 12} more</div>}
          </div>
          <div style={{ fontSize: 10, color: "#6b7280", marginTop: 8, lineHeight: 1.4 }}>
            {headings.length > 0
              ? "The title above is your H1; the tool scans the H2-H6 tags below it. Tip: work your primary and/or secondary keyword into a header where it reads naturally."
              : "The title above is your H1, and there are no H2-H6 subheadings yet. Tip: work your primary and/or secondary keyword into the title where it reads naturally."}
          </div>
        </div>
      )}

      {imagesAudit && (
        <AuditCard anchorId="anchor-images" label={imagesAudit.label} value={imagesAudit.value} status={imagesAudit.status} recommendation={imagesAudit.recommendation} />
      )}
      {filenameAudit && (
        <AuditCard anchorId="anchor-image-filenames" label={filenameAudit.label} value={filenameAudit.value} status={filenameAudit.status} recommendation={filenameAudit.recommendation} />
      )}
      {altTextAudit && (
        <AuditCard anchorId="anchor-image-alt" label={altTextAudit.label} value={altTextAudit.value} status={altTextAudit.status} recommendation={altTextAudit.recommendation} />
      )}
      {imgTitleAudit && (
        <AuditCard anchorId="anchor-image-titles" label={imgTitleAudit.label} value={imgTitleAudit.value} status={imgTitleAudit.status} recommendation={imgTitleAudit.recommendation} />
      )}
    </div>
  );
}
