"use client";

import { useMemo } from "react";
import type { DocumentFields, TechnicalAuditItem } from "../../lib/types";
import { containsKeywordTokens } from "../../lib/utils";

interface MetaTabProps {
  documentFields?: DocumentFields;
  primaryKeyword?: string;
  secondaryKeyword?: string;
  isLoading?: boolean;
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
          under URL Slug in TechnicalTab) - same box, no connector. */}
      {footer}
    </div>
  );
}

// Builds the "primary X included, secondary Y not" clause shared across audits.
// Returns "" when there's nothing to flag (both present, or none set).
function keywordCoverageNote(haystack: string, primaryKeyword?: string, secondaryKeyword?: string): string {
  const hasPrimary = primaryKeyword ? containsKeywordTokens(haystack, primaryKeyword) : true;
  const hasSecondary = secondaryKeyword ? containsKeywordTokens(haystack, secondaryKeyword) : true;
  if (primaryKeyword && !hasPrimary && secondaryKeyword && !hasSecondary) {
    return `Neither your primary keyword "${primaryKeyword}" nor your secondary keyword "${secondaryKeyword}" appears here.`;
  }
  if (primaryKeyword && !hasPrimary) {
    return `Your primary keyword "${primaryKeyword}" isn't included${secondaryKeyword ? ` (secondary keyword "${secondaryKeyword}" ${hasSecondary ? "is" : "isn't"}).` : "."}`;
  }
  if (secondaryKeyword && !hasSecondary) {
    return `Your secondary keyword "${secondaryKeyword}" isn't included${primaryKeyword && hasPrimary ? ` (primary keyword "${primaryKeyword}" is present)` : ""}. Work it in if it reads naturally.`;
  }
  return "";
}

function metaDescriptionAudit(meta?: string, primaryKeyword?: string, secondaryKeyword?: string): TechnicalAuditItem {
  if (!meta) {
    return {
      label: "Meta Description",
      value: "Missing",
      status: "error",
      recommendation: `Add a 120-160 character meta description that includes your primary keyword${secondaryKeyword ? " (and your secondary keyword if it fits)" : ""}.`,
    };
  }
  const len = meta.length;
  const kwNote = keywordCoverageNote(meta, primaryKeyword, secondaryKeyword);
  if (len < 120) {
    return {
      label: "Meta Description",
      value: `${meta} (${len} chars)`,
      status: "warning",
      recommendation: `A little short - aim for 120-160 characters.${kwNote ? ` ${kwNote}` : ""}`,
    };
  }
  if (len > 160) {
    return {
      label: "Meta Description",
      value: `${meta} (${len} chars)`,
      status: "warning",
      recommendation: `Over 160 characters - Google may shorten it in search, so trim it a little.${kwNote ? ` ${kwNote}` : ""}`,
    };
  }
  if (kwNote) {
    return {
      label: "Meta Description",
      value: `${meta} (${len} chars)`,
      status: "warning",
      recommendation: `Length is good. ${kwNote}`,
    };
  }
  return {
    label: "Meta Description",
    value: `${meta} (${len} chars)`,
    status: "good",
  };
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

export function MetaTab({ documentFields, primaryKeyword, secondaryKeyword, isLoading }: MetaTabProps) {
  const audits = useMemo<TechnicalAuditItem[]>(() => {
    const list: TechnicalAuditItem[] = [];
    list.push(titleAudit(documentFields?.title, primaryKeyword));
    list.push(metaDescriptionAudit(documentFields?.metaDescription, primaryKeyword, secondaryKeyword));
    // URL Slug audit moved to the Other Recs tab.
    return list;
  }, [documentFields, primaryKeyword, secondaryKeyword]);

  // Anchor IDs let the Summary tab deep-link straight to a specific audit card.
  const auditAnchors = ["anchor-meta-title", "anchor-meta-description"];

  // Show a loading placeholder while document fields are being read, so we don't
  // flash "Missing" cards based on the previous doc / no doc.
  const hasAnyField =
    !!documentFields &&
    (documentFields.title !== undefined ||
      documentFields.metaDescription !== undefined ||
      documentFields.slug !== undefined);
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
        />
      ))}
    </div>
  );
}
