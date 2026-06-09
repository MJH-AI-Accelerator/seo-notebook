"use client";

import { useMemo, useState } from "react";
import type { DocumentFields, TechnicalAuditItem } from "../../lib/types";

interface MetaTabProps {
  documentFields?: DocumentFields;
  primaryKeyword?: string;
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

function metaDescriptionAudit(meta?: string, primaryKeyword?: string): TechnicalAuditItem {
  if (!meta) {
    return { label: "Meta Description", value: "Missing", status: "error", recommendation: "Add a 120-160 character meta description that includes your primary keyword." };
  }
  const len = meta.length;
  const lacksKeyword = primaryKeyword && !meta.toLowerCase().includes(primaryKeyword.toLowerCase());
  if (len < 120) return { label: "Meta Description", value: `${meta} (${len} chars)`, status: "warning", recommendation: `Too short - aim for 120-160 characters.${lacksKeyword ? ` Also missing primary keyword "${primaryKeyword}".` : ""}` };
  if (len > 160) return { label: "Meta Description", value: `${meta} (${len} chars)`, status: "warning", recommendation: `Too long - Google may truncate beyond 160 characters.${lacksKeyword ? ` Also missing primary keyword "${primaryKeyword}".` : ""}` };
  if (lacksKeyword) return { label: "Meta Description", value: `${meta} (${len} chars)`, status: "warning", recommendation: `Length is good but primary keyword "${primaryKeyword}" is not included.` };
  return { label: "Meta Description", value: `${meta} (${len} chars)`, status: "good" };
}

// Locate the first occurrence of any token in the primary keyword within the title.
function keywordPositionInTitle(title: string, primaryKeyword: string): { charIndex: number; wordIndex: number } | null {
  const lowerTitle = title.toLowerCase();
  const tokens = primaryKeyword.toLowerCase().split(/\s+/).filter((t) => t.length > 1);
  if (tokens.length === 0) return null;
  let firstHit = -1;
  for (const t of tokens) {
    const i = lowerTitle.indexOf(t);
    if (i >= 0 && (firstHit === -1 || i < firstHit)) firstHit = i;
  }
  if (firstHit === -1) return null;
  const wordsBefore = title.slice(0, firstHit).trim().split(/\s+/).filter(Boolean);
  return { charIndex: firstHit, wordIndex: wordsBefore.length };
}

// Title audit per director guidance: editors can't easily change title length
// (the article title IS the page title), so we don't warn about length. We check
// that the primary keyword sits within the first 30 chars / 5 words so it
// survives Google's ~60-char SERP truncation.
function titleAudit(title?: string, primaryKeyword?: string): TechnicalAuditItem {
  if (!title) return { label: "Title Tag", value: "Missing", status: "error", recommendation: "Add a title that leads with the primary keyword." };
  const len = title.length;
  if (primaryKeyword) {
    const pos = keywordPositionInTitle(title, primaryKeyword);
    if (!pos) {
      return {
        label: "Title Tag",
        value: `${title} (${len} chars)`,
        status: "warning",
        recommendation: `Primary keyword "${primaryKeyword}" isn't in the title. Reorder or rephrase so the title leads with the keyword - Google shows roughly the first 60 characters in search.`,
      };
    }
    if (pos.charIndex > 30 && pos.wordIndex > 5) {
      return {
        label: "Title Tag",
        value: `${title} (${len} chars)`,
        status: "warning",
        recommendation: `Primary keyword "${primaryKeyword}" starts at character ${pos.charIndex + 1}. Move it toward the front so it stays visible if Google truncates the title at ~60 characters.`,
      };
    }
  }
  return { label: "Title Tag", value: `${title} (${len} chars)`, status: "good" };
}

// Caution block that lives INSIDE the URL Slug card (same box - no connector). A
// slug change on an indexed page without a 301 redirect silently drops search
// rankings to zero and breaks every external link to the old URL - but it's a
// warning (avoidable), not an error, so it's styled amber. It echoes the card's
// own recommendation-block pattern (amber left rail + tint) with a divider above
// it, so it reads as a distinct caution that's clearly part of the slug card. The
// headline is always visible; the "why / how" detail tucks behind Learn more.
function SlugRedirectNotice() {
  const [expanded, setExpanded] = useState(false);
  return (
    <div
      style={{
        marginTop: 10,
        paddingTop: 10,
        borderTop: "1px solid rgba(0,0,0,0.07)",
      }}
    >
      <div
        style={{
          padding: "8px 10px",
          background: "rgba(245,158,11,0.08)",
          borderLeft: "2px solid #f59e0b",
          borderRadius: 6,
        }}
      >
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
          style={{
            display: "flex",
            alignItems: "center",
            gap: 3,
            marginTop: 6,
            padding: 0,
            background: "none",
            border: "none",
            cursor: "pointer",
            fontSize: 10.5,
            fontWeight: 700,
            color: "#b45309",
            fontFamily: "inherit",
          }}
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

function urlAudit(slug?: string, primaryKeyword?: string): TechnicalAuditItem {
  if (!slug) return { label: "URL Slug", value: "Missing", status: "error", recommendation: "Add a clean, hyphenated URL slug containing your primary keyword." };
  const issues: string[] = [];
  if (slug.length > 75) issues.push("too long (over 75 chars)");
  if (/[A-Z]/.test(slug)) issues.push("contains uppercase letters");
  if (/_/.test(slug)) issues.push("uses underscores instead of hyphens");
  if (/[^a-zA-Z0-9-/]/.test(slug.replace(/^\//, ""))) issues.push("contains special characters");
  if (primaryKeyword && !slug.toLowerCase().includes(primaryKeyword.toLowerCase().replace(/\s+/g, "-"))) {
    issues.push(`missing primary keyword "${primaryKeyword}"`);
  }
  if (issues.length === 0) return { label: "URL Slug", value: `/${slug}`, status: "good" };
  return { label: "URL Slug", value: `/${slug}`, status: "warning", recommendation: `Issues: ${issues.join(", ")}.` };
}

export function MetaTab({ documentFields, primaryKeyword }: MetaTabProps) {
  const audits = useMemo<TechnicalAuditItem[]>(() => {
    return [
      titleAudit(documentFields?.title, primaryKeyword),
      metaDescriptionAudit(documentFields?.metaDescription, primaryKeyword),
      urlAudit(documentFields?.slug, primaryKeyword),
    ];
  }, [documentFields, primaryKeyword]);

  // Anchor IDs let the Summary tab deep-link straight to a specific audit card.
  const auditAnchors = ["anchor-meta-title", "anchor-meta-description", "anchor-url-slug"];

  return (
    <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 10 }}>
      {!documentFields && (
        <div style={{ ...cardStyle, textAlign: "center" }}>
          <span style={{ fontSize: 12, color: "#4b5563" }}>Waiting for document content...</span>
        </div>
      )}

      {audits.map((a, i) => (
        <AuditCard
          key={i}
          anchorId={auditAnchors[i]}
          label={a.label}
          value={a.value}
          status={a.status}
          recommendation={a.recommendation}
          // 301-redirect caution lives INSIDE the URL Slug card (same box, no connector).
          footer={a.label === "URL Slug" ? <SlugRedirectNotice /> : undefined}
        />
      ))}
    </div>
  );
}
