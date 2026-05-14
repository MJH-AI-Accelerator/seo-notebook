"use client";

import { useMemo } from "react";
import type { DocumentFields, TechnicalAuditItem } from "../../lib/types";

interface MetaTabProps {
  text: string;
  documentFields?: DocumentFields;
  primaryKeyword?: string;
}

const cardStyle: React.CSSProperties = {
  borderRadius: 14,
  background: "#ffffff",
  boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 0 0 1px rgba(0,0,0,0.03)",
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

function AuditCard({ label, value, status, recommendation, anchorId }: { label: string; value: string; status: TechnicalAuditItem["status"]; recommendation?: string; anchorId?: string }) {
  return (
    <div id={anchorId} style={cardStyle}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 6 }}>
        <span style={{ fontSize: 10.5, textTransform: "uppercase", letterSpacing: "0.06em", color: "#94a3b8", fontWeight: 600 }}>{label}</span>
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
          borderRadius: 6, fontSize: 11, color: "#4b5563", lineHeight: 1.5,
        }}>
          {recommendation}
        </div>
      )}
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

function titleAudit(title?: string, primaryKeyword?: string): TechnicalAuditItem {
  if (!title) return { label: "Title Tag", value: "Missing", status: "error", recommendation: "Add a 30-60 character title that includes your primary keyword." };
  const len = title.length;
  const lacksKeyword = primaryKeyword && !title.toLowerCase().includes(primaryKeyword.toLowerCase());
  if (len < 30) return { label: "Title Tag", value: `${title} (${len} chars)`, status: "warning", recommendation: `Too short - aim for 30-60 characters.${lacksKeyword ? ` Also missing primary keyword "${primaryKeyword}".` : ""}` };
  if (len > 60) return { label: "Title Tag", value: `${title} (${len} chars)`, status: "warning", recommendation: `Too long - Google truncates beyond ~60 characters.${lacksKeyword ? ` Also missing primary keyword "${primaryKeyword}".` : ""}` };
  if (lacksKeyword) return { label: "Title Tag", value: `${title} (${len} chars)`, status: "warning", recommendation: `Length is good but primary keyword "${primaryKeyword}" is not included.` };
  return { label: "Title Tag", value: `${title} (${len} chars)`, status: "good" };
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

export function MetaTab({ text, documentFields, primaryKeyword }: MetaTabProps) {
  const audits = useMemo<TechnicalAuditItem[]>(() => {
    return [
      titleAudit(documentFields?.title, primaryKeyword),
      metaDescriptionAudit(documentFields?.metaDescription, primaryKeyword),
      urlAudit(documentFields?.slug, primaryKeyword),
    ];
  }, [documentFields, primaryKeyword]);

  const headings = documentFields?.headings || [];
  const imageNames = documentFields?.imageNames || [];

  const headingsAudit: TechnicalAuditItem = headings.length === 0
    ? {
        label: "Headings (H2/H3)", value: "No headings found", status: "warning",
        recommendation: "Use H2 and H3 headings to structure your article. Google rewards clear hierarchy and pulls headings into featured snippets.",
      }
    : { label: "Headings (H2/H3)", value: `${headings.length} heading${headings.length === 1 ? "" : "s"} detected`, status: "good" };

  const imagesAudit: TechnicalAuditItem = imageNames.length === 0
    ? {
        label: "Images", value: "No images detected", status: "warning",
        recommendation: "Articles with at least one image perform better. Add a hero image with descriptive alt text.",
      }
    : { label: "Images", value: `${imageNames.length} image${imageNames.length === 1 ? "" : "s"} detected`, status: "good" };

  const wordCount = text ? text.split(/\s+/).filter(Boolean).length : 0;
  const wordAudit: TechnicalAuditItem = wordCount === 0
    ? { label: "Word Count", value: "0 words", status: "error", recommendation: "Start writing - articles need at least 200 words to rank." }
    : wordCount < 400
    ? { label: "Word Count", value: `${wordCount} words`, status: "warning", recommendation: "Articles under 400 words rarely rank for competitive terms. Aim for 800+ for thought leadership." }
    : wordCount < 800
    ? { label: "Word Count", value: `${wordCount} words`, status: "warning", recommendation: "Decent length. 800+ words tends to perform best for healthcare professional content." }
    : { label: "Word Count", value: `${wordCount} words`, status: "good" };

  // Anchor IDs let the Summary tab deep-link straight to a specific audit card.
  const auditAnchors = ["anchor-meta-title", "anchor-meta-description", "anchor-url-slug"];

  return (
    <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 10 }}>
      {!documentFields && (
        <div style={{ ...cardStyle, textAlign: "center" }}>
          <span style={{ fontSize: 12, color: "#9ca3af" }}>Waiting for document content...</span>
        </div>
      )}

      {audits.map((a, i) => (
        <AuditCard key={i} anchorId={auditAnchors[i]} label={a.label} value={a.value} status={a.status} recommendation={a.recommendation} />
      ))}

      <AuditCard anchorId="anchor-headings-outline" label={headingsAudit.label} value={headingsAudit.value} status={headingsAudit.status} recommendation={headingsAudit.recommendation} />
      {headings.length > 0 && (
        <div style={{ ...cardStyle, padding: "8px 14px" }}>
          <div style={{ fontSize: 10, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600, marginBottom: 6 }}>
            Heading Outline
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {headings.slice(0, 12).map((h, i) => (
              <div key={i} style={{ fontSize: 11, color: "#4b5563", lineHeight: 1.4 }}>{h}</div>
            ))}
            {headings.length > 12 && (
              <div style={{ fontSize: 10, color: "#9ca3af" }}>+ {headings.length - 12} more</div>
            )}
          </div>
        </div>
      )}

      <AuditCard anchorId="anchor-images" label={imagesAudit.label} value={imagesAudit.value} status={imagesAudit.status} recommendation={imagesAudit.recommendation} />
      <AuditCard anchorId="anchor-word-count" label={wordAudit.label} value={wordAudit.value} status={wordAudit.status} recommendation={wordAudit.recommendation} />
    </div>
  );
}
