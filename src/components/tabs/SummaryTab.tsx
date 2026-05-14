"use client";

import { useMemo, useState } from "react";
import { LoadingBars } from "../LoadingBars";
import { ShimmerLoader, DEFAULT_GENERATE_ALL_MESSAGES } from "../ShimmerLoader";
import { calculateContentScoreDetailed, type ContentScore } from "../../lib/scoring";
import { buildSummaryItems } from "../../lib/summary";
import { MJH_BLUE, MJH_GOLD } from "../styles";
import type {
  SEOAnalysis,
  DeepAnalysis,
  DocumentFields,
  LinkingSuggestion,
  SummaryItem,
  SummarySeverity,
} from "../../lib/types";

interface SummaryTabProps {
  text: string;
  analysis: SEOAnalysis | null;
  deepAnalysis: DeepAnalysis | null;
  documentFields?: DocumentFields;
  linkingSuggestions: LinkingSuggestion[];
  isAnyLoading: boolean;
  onGenerateAll: () => void;
  onItemClick: (item: SummaryItem) => void;
}

type FilterKey = "all" | "error" | "warning" | "opportunity";

const cardStyle: React.CSSProperties = {
  borderRadius: 14,
  background: "#ffffff",
  boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 0 0 1px rgba(0,0,0,0.03)",
  padding: "14px",
};

function scoreColors(score: number): { bg: string; text: string; label: string } {
  if (score >= 70) return { bg: "rgba(22,163,74,0.1)", text: "#16a34a", label: "Strong" };
  if (score >= 40) return { bg: "rgba(230,192,27,0.15)", text: "#8B7310", label: "Decent" };
  return { bg: "rgba(220,38,38,0.08)", text: "#dc2626", label: "Needs work" };
}

function ScoreBadge({ score, breakdown }: { score: number; breakdown: ContentScore["components"] }) {
  const [expanded, setExpanded] = useState(false);
  const c = scoreColors(score);
  return (
    <div style={cardStyle}>
      <button
        onClick={() => setExpanded((v) => !v)}
        style={{
          width: "100%",
          background: "none",
          border: "none",
          padding: 0,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: 14,
          textAlign: "left",
        }}
      >
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: "50%",
            background: c.bg,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <span style={{ fontSize: 22, fontWeight: 700, color: c.text }}>{score}</span>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 10.5, textTransform: "uppercase", letterSpacing: "0.06em", color: "#94a3b8", fontWeight: 600, marginBottom: 2 }}>
            Content Score
          </div>
          <div style={{ fontSize: 14, fontWeight: 700, color: c.text, marginBottom: 2 }}>{c.label}</div>
          <div style={{ fontSize: 11, color: "#9ca3af", lineHeight: 1.45 }}>
            {expanded ? "Click to collapse" : "Click to see what's driving this score"}
          </div>
        </div>
        <svg
          width="16"
          height="16"
          viewBox="0 0 20 20"
          fill="#9ca3af"
          style={{ flexShrink: 0, transform: expanded ? "rotate(180deg)" : "none", transition: "transform 150ms" }}
        >
          <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
        </svg>
      </button>

      {expanded && breakdown.length > 0 && (
        <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
          {breakdown.map((comp, i) => {
            const pct = comp.max > 0 ? (comp.points / comp.max) * 100 : 0;
            const barColor = pct >= 75 ? "#16a34a" : pct >= 40 ? "#E6C01B" : "#dc2626";
            return (
              <div key={i}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 3 }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: "#374151" }}>{comp.label}</span>
                  <span style={{ fontSize: 11, color: "#6b7280", fontVariantNumeric: "tabular-nums" }}>
                    {comp.points} / {comp.max}
                  </span>
                </div>
                <div style={{ height: 4, background: "#f1f5f9", borderRadius: 99, overflow: "hidden", marginBottom: 4 }}>
                  <div style={{ width: `${pct}%`, height: "100%", background: barColor, transition: "width 200ms" }} />
                </div>
                <div style={{ fontSize: 10.5, color: "#9ca3af", lineHeight: 1.4 }}>{comp.detail}</div>
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

function ItemCard({ item, onClick }: { item: SummaryItem; onClick: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const v = severityVisual(item.severity);
  return (
    <div
      style={{
        padding: "10px 12px",
        background: "#ffffff",
        borderRadius: 10,
        boxShadow: "0 1px 2px rgba(0,0,0,0.03), 0 0 0 1px rgba(0,0,0,0.04)",
        display: "flex",
        flexDirection: "column",
        gap: 4,
      }}
    >
      <div
        onClick={onClick}
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: 9,
          cursor: "pointer",
        }}
      >
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
          <div style={{ fontSize: 11, color: "#4b5563", lineHeight: 1.5 }}>{item.description}</div>
        </div>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 4 }}>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setExpanded((v) => !v);
          }}
          style={{
            background: "none",
            border: "none",
            padding: 0,
            cursor: "pointer",
            fontSize: 10,
            fontWeight: 600,
            color: "#94a3b8",
            textDecoration: "underline",
          }}
        >
          {expanded ? "Hide fix" : "How to fix"}
        </button>
        {item.jumpTo.tab !== "summary" && (
          <button
            onClick={onClick}
            style={{
              background: "none",
              border: "none",
              padding: 0,
              cursor: "pointer",
              fontSize: 10,
              fontWeight: 600,
              color: MJH_BLUE,
            }}
          >
            {`Go to ${item.jumpTo.tab.charAt(0).toUpperCase()}${item.jumpTo.tab.slice(1)} ›`}
          </button>
        )}
      </div>
      {expanded && (
        <div
          style={{
            padding: "8px 10px",
            background: v.bg,
            borderRadius: 6,
            fontSize: 11,
            color: "#374151",
            lineHeight: 1.55,
            marginTop: 4,
          }}
        >
          {item.howToFix}
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
  isAnyLoading,
  onGenerateAll,
  onItemClick,
}: SummaryTabProps) {
  const scoreDetail = useMemo(() => {
    if (!analysis) return null;
    return calculateContentScoreDetailed(text, analysis);
  }, [text, analysis]);
  const score = scoreDetail?.total ?? null;

  const items = useMemo(
    () =>
      buildSummaryItems({
        analysis,
        deepAnalysis,
        documentFields,
        contentScore: score,
        linkingSuggestions,
        text,
      }),
    [analysis, deepAnalysis, documentFields, score, linkingSuggestions, text]
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
        <div style={{ fontSize: 13, color: "#9ca3af", fontWeight: 500 }}>Run keyword analysis first</div>
        <div style={{ fontSize: 11, color: "#d1d5db", marginTop: 4 }}>
          Open the Keywords tab and start writing - the summary will populate here.
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 12 }}>
      {/* Content Score badge */}
      {score != null && scoreDetail && <ScoreBadge score={score} breakdown={scoreDetail.components} />}

      {/* Generate All */}
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
              background: !text || text.trim().length < 100 ? "#e5e7eb" : MJH_GOLD,
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
            title="Run deep analysis, content suggestions, and linking suggestions in parallel"
          >
            Generate everything
          </button>
        )}
        <div style={{ fontSize: 10, color: "#9ca3af", marginTop: 6, textAlign: "center" }}>
          Runs deep analysis + content suggestions + linking suggestions at once.
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
                <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>
                  No issues, warnings, or opportunities flagged for this article.
                </div>
              </>
            ) : (
              <div style={{ fontSize: 12, color: "#9ca3af" }}>Nothing in this category.</div>
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
          <span style={{ fontSize: 10, color: "#9ca3af" }}>More signals coming in...</span>
        </div>
      )}
    </div>
  );
}
