"use client";

import { useMemo, useState } from "react";
import { LoadingBars } from "../LoadingBars";
import { ShimmerLoader, DEFAULT_GENERATE_ALL_MESSAGES } from "../ShimmerLoader";
import { calculateContentScoreDetailed, type ContentScore } from "../../lib/scoring";
import { buildSummaryItems } from "../../lib/summary";
import { MJH_BLUE } from "../styles";
import type {
  SEOAnalysis,
  DeepAnalysis,
  DocumentFields,
  LinkingSuggestion,
  LinkCheckResult,
  SummaryItem,
  SummarySeverity,
} from "../../lib/types";

interface SummaryTabProps {
  text: string;
  analysis: SEOAnalysis | null;
  deepAnalysis: DeepAnalysis | null;
  documentFields?: DocumentFields;
  linkingSuggestions: LinkingSuggestion[];
  linkCheckResults?: LinkCheckResult[];
  // Editor's SELECTED primary keyword - score uses it so it updates instantly.
  primaryKeyword?: string;
  secondaryKeyword?: string;
  isAnyLoading: boolean;
  onGenerateAll: () => void;
  onItemClick: (item: SummaryItem) => void;
}

type FilterKey = "all" | "error" | "warning" | "opportunity";

const cardStyle: React.CSSProperties = {
  borderRadius: 14,
  background: "rgba(255,255,255,0.55)",
  backdropFilter: "blur(16px) saturate(170%)",
  WebkitBackdropFilter: "blur(16px) saturate(170%)",
  boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.85), inset 1.5px 2px 1px -1px rgba(255,255,255,1), inset -2px -3px 2px -1px rgba(255,255,255,0.6), 0 2px 6px rgba(0,0,0,0.07), 0 10px 26px rgba(0,0,0,0.08)",
  padding: "14px",
};

// Display labels for the "Go to ..." jump buttons. MUST stay in sync with the tab
// labels in SEONotebookPanel's tabDefs - the internal id "technical" is shown to
// editors as "Other Recs", and "aeo" as "AEO/GEO".
const TAB_LABEL: Record<string, string> = {
  summary: "Summary",
  keywords: "Keywords",
  aeo: "AEO/GEO",
  linking: "Linking",
  meta: "Meta",
  technical: "Other Recs",
};

function scoreColors(score: number): { bg: string; text: string; label: string } {
  if (score >= 70) return { bg: "rgba(22,163,74,0.1)", text: "#16a34a", label: "Strong" };
  if (score >= 40) return { bg: "rgba(230,192,27,0.15)", text: "#8B7310", label: "Decent" };
  return { bg: "rgba(220,38,38,0.08)", text: "#dc2626", label: "Needs work" };
}

// The score card. The breakdown is ALWAYS visible - the score is just a roll-up
// of the six visible components below it. No hidden state, no "click to see why".
function ScoreBadge({ score, breakdown }: { score: number; breakdown: ContentScore["components"] }) {
  const c = scoreColors(score);
  return (
    <div style={cardStyle}>
      {/* Top row: number + label */}
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: "50%",
            background: c.bg,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            lineHeight: 1,
          }}
        >
          <span style={{ fontSize: 20, fontWeight: 700, color: c.text }}>{score}</span>
          <span style={{ fontSize: 8, fontWeight: 700, color: c.text, opacity: 0.7, letterSpacing: "0.06em", marginTop: 2 }}>
            / 100
          </span>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 10.5, textTransform: "uppercase", letterSpacing: "0.06em", color: "#4b5563", fontWeight: 600, marginBottom: 2 }}>
            Content Score
          </div>
          <div style={{ fontSize: 14, fontWeight: 700, color: c.text }}>{c.label}</div>
        </div>
      </div>

      {/* Always-visible breakdown - each row shows what's driving the score */}
      {breakdown.length > 0 && (
        <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
          {breakdown.map((comp, i) => {
            const pct = comp.max > 0 ? (comp.points / comp.max) * 100 : 0;
            const barColor = pct >= 75 ? "#16a34a" : pct >= 40 ? "#E6C01B" : "#dc2626";
            return (
              <div key={i}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 3 }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: "#1f2937" }}>{comp.label}</span>
                  <span style={{ fontSize: 11, color: "#4b5563", fontVariantNumeric: "tabular-nums" }}>
                    {comp.points} / {comp.max}
                  </span>
                </div>
                <div style={{ height: 4, background: "#f1f5f9", borderRadius: 99, overflow: "hidden", marginBottom: 4 }}>
                  <div style={{ width: `${pct}%`, height: "100%", background: barColor, transition: "width 200ms" }} />
                </div>
                <div style={{ fontSize: 10.5, color: "#4b5563", lineHeight: 1.4 }}>{comp.detail}</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function severityVisual(s: SummarySeverity) {
  if (s === "error") return { dot: "#dc2626", bg: "rgba(220,38,38,0.08)" };
  if (s === "warning") return { dot: "#E6C01B", bg: "rgba(230,192,27,0.15)" };
  return { dot: MJH_BLUE, bg: "rgba(0,93,172,0.06)" };
}

// One issue / warning / opportunity. Everything is visible up front - no expand
// state, no "click to see why". Clicking the card jumps to the source tab.
function ItemCard({ item, onClick }: { item: SummaryItem; onClick: () => void }) {
  const v = severityVisual(item.severity);
  const tab = item.jumpTo.tab;
  const tabLabel = TAB_LABEL[tab] ?? tab.charAt(0).toUpperCase() + tab.slice(1);
  return (
    <div
      onClick={onClick}
      style={{
        padding: "10px 12px",
        background: "rgba(255,255,255,0.55)",
        backdropFilter: "blur(16px) saturate(170%)",
        WebkitBackdropFilter: "blur(16px) saturate(170%)",
        borderRadius: 10,
        boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.5), inset 1.2px 1.5px 0 -1px rgba(255,255,255,0.85), 0 1px 3px rgba(0,0,0,0.05), 0 4px 12px rgba(0,0,0,0.05)",
        display: "flex",
        flexDirection: "column",
        gap: 6,
        cursor: "pointer",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 9 }}>
        <div
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: v.dot,
            marginTop: 5,
            flexShrink: 0,
          }}
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#1f2937", marginBottom: 2 }}>{item.label}</div>
          <div style={{ fontSize: 11, color: "#1f2937", lineHeight: 1.5 }}>{item.description}</div>
        </div>
      </div>
      {/* How to fix - always visible, inline, severity-tinted */}
      <div
        style={{
          padding: "7px 10px",
          background: v.bg,
          borderRadius: 6,
          fontSize: 11,
          color: "#1f2937",
          lineHeight: 1.55,
        }}
      >
        <span style={{ fontWeight: 700, color: "#4b5563", letterSpacing: "0.04em", fontSize: 9.5, textTransform: "uppercase", marginRight: 6 }}>
          Fix
        </span>
        {item.howToFix}
      </div>
      {item.jumpTo.tab !== "summary" && (
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: MJH_BLUE }}>
            Go to {tabLabel} ›
          </span>
        </div>
      )}
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  label,
  count,
  dotColor,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
  dotColor?: string;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "4px 9px",
        background: active ? "#1f2937" : "#ffffff",
        color: active ? "#ffffff" : "#4b5563",
        border: active ? "1px solid #1f2937" : "1px solid rgba(0,0,0,0.08)",
        borderRadius: 99,
        cursor: "pointer",
        fontSize: 11,
        fontWeight: 600,
        display: "flex",
        alignItems: "center",
        gap: 5,
        transition: "all 150ms",
      }}
    >
      {dotColor && (
        <span style={{ width: 6, height: 6, borderRadius: "50%", background: dotColor, display: "inline-block" }} />
      )}
      <span>{label}</span>
      <span style={{ fontSize: 10, opacity: 0.8 }}>{count}</span>
    </button>
  );
}

export function SummaryTab({
  text,
  analysis,
  deepAnalysis,
  documentFields,
  linkingSuggestions,
  linkCheckResults,
  primaryKeyword,
  secondaryKeyword,
  isAnyLoading,
  onGenerateAll,
  onItemClick,
}: SummaryTabProps) {
  const scoreDetail = useMemo(() => {
    if (!analysis) return null;
    // Score against the editor's SELECTED primary so it updates instantly on selection.
    const scored =
      primaryKeyword && primaryKeyword !== analysis.primaryKeyword?.term
        ? { ...analysis, primaryKeyword: { ...analysis.primaryKeyword, term: primaryKeyword } }
        : analysis;
    return calculateContentScoreDetailed(text, scored, documentFields);
  }, [text, analysis, documentFields, primaryKeyword]);
  const score = scoreDetail?.total ?? null;

  const items = useMemo(
    () =>
      buildSummaryItems({
        analysis,
        deepAnalysis,
        documentFields,
        contentScore: score,
        linkingSuggestions,
        linkCheckResults,
        text,
        primaryKeyword,
        secondaryKeyword,
      }),
    [analysis, deepAnalysis, documentFields, score, linkingSuggestions, linkCheckResults, text, primaryKeyword, secondaryKeyword]
  );

  const [filter, setFilter] = useState<FilterKey>("all");
  const counts = useMemo(
    () => ({
      all: items.length,
      error: items.filter((i) => i.severity === "error").length,
      warning: items.filter((i) => i.severity === "warning").length,
      opportunity: items.filter((i) => i.severity === "opportunity").length,
    }),
    [items]
  );
  const filtered = filter === "all" ? items : items.filter((i) => i.severity === filter);

  if (!analysis) {
    return (
      <div style={{ padding: 24, textAlign: "center" }}>
        <div style={{ fontSize: 13, color: "#4b5563", fontWeight: 500 }}>Start with the Keywords tab</div>
        <div style={{ fontSize: 11, color: "#4b5563", marginTop: 4 }}>
          Once keywords are analyzed, the summary appears here.
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 12 }}>
      {/* Content Score badge */}
      {score != null && scoreDetail && <ScoreBadge score={score} breakdown={scoreDetail.components} />}

      {/* Generate everything - runs the analyses that fill the AEO/GEO, Linking,
          and Other Recs tabs in parallel. Their results flow back into this Summary. */}
      <div style={cardStyle}>
        {isAnyLoading ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "4px 0" }}>
            <ShimmerLoader messages={DEFAULT_GENERATE_ALL_MESSAGES} />
          </div>
        ) : (
          <button
            onClick={onGenerateAll}
            disabled={!text || text.trim().length < 100}
            style={{
              width: "100%",
              padding: "10px 14px",
              fontSize: 12,
              fontWeight: 700,
              color: !text || text.trim().length < 100 ? "#9ca3af" : "#1f2937",
              background: !text || text.trim().length < 100 ? "#e5e7eb" : "linear-gradient(135deg, rgba(230,192,27,0.82), rgba(230,192,27,0.98))",
              backdropFilter: "blur(10px) saturate(160%)",
              WebkitBackdropFilter: "blur(10px) saturate(160%)",
              boxShadow: !text || text.trim().length < 100 ? "none" : "inset 0 1px 1px rgba(255,255,255,0.6), inset 0 -1px 2px rgba(0,0,0,0.12), 0 2px 8px rgba(230,192,27,0.32)",
              border: "none",
              borderRadius: 8,
              cursor: !text || text.trim().length < 100 ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              transition: "all 150ms",
              letterSpacing: "0.01em",
            }}
          >
            Run all analyses
          </button>
        )}
        <div style={{ fontSize: 10.5, color: "#4b5563", marginTop: 8, lineHeight: 1.5 }}>
          Runs the analyses that fill the <strong>AEO/GEO</strong>, <strong>Linking</strong>, and <strong>Other Recs</strong> tabs. New issues they find appear in this Summary as each one finishes.
        </div>
      </div>

      {/* Filter chips */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        <FilterChip active={filter === "all"} onClick={() => setFilter("all")} label="All" count={counts.all} />
        <FilterChip active={filter === "error"} onClick={() => setFilter("error")} label="Errors" count={counts.error} dotColor="#dc2626" />
        <FilterChip active={filter === "warning"} onClick={() => setFilter("warning")} label="Warnings" count={counts.warning} dotColor="#E6C01B" />
        <FilterChip active={filter === "opportunity"} onClick={() => setFilter("opportunity")} label="Opportunities" count={counts.opportunity} dotColor={MJH_BLUE} />
      </div>

      {/* Items list */}
      <div id="anchor-summary-issues" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {filtered.length === 0 ? (
          <div style={{ ...cardStyle, textAlign: "center", padding: "20px 14px" }}>
            {items.length === 0 ? (
              <>
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: "50%",
                    background: "rgba(22,163,74,0.1)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    margin: "0 auto 8px",
                  }}
                >
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="#16a34a">
                    <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                  </svg>
                </div>
                <div style={{ fontSize: 13, color: "#16a34a", fontWeight: 700 }}>Looking good</div>
                <div style={{ fontSize: 11, color: "#4b5563", marginTop: 2 }}>
                  No issues found for this article.
                </div>
              </>
            ) : (
              <div style={{ fontSize: 12, color: "#4b5563" }}>Nothing in this category.</div>
            )}
          </div>
        ) : (
          filtered.map((item) => <ItemCard key={item.id} item={item} onClick={() => onItemClick(item)} />)
        )}
      </div>

      {/* Loading hint when something's still running and we have partial data */}
      {isAnyLoading && items.length > 0 && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "4px 0" }}>
          <LoadingBars size="xs" color={MJH_BLUE} />
          <span style={{ fontSize: 10, color: "#4b5563" }}>Still checking...</span>
        </div>
      )}
    </div>
  );
}
