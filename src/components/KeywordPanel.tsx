"use client";

import { useState, useEffect, useRef } from "react";
import { useConfig } from "./ConfigContext";
import { PlacementIndicators } from "./PlacementIndicators";
import { SeedKeywordInput } from "./SeedKeywordInput";
import { FeedbackButton } from "./FeedbackButton";
import { LoadingBars } from "./LoadingBars";
import { MJH_GOLD, MJH_BLUE } from "./styles";
import type { PrimaryKeywordCandidate, DocumentFields, KeywordPlacement } from "../lib/types";

interface KeywordPanelProps {
  text: string;
  publication?: string;
  seedKeywords?: string[];
  onSeedsChange?: (seeds: string[]) => void;
  onSelectPrimary?: (term: string) => void;
  // Optional secondary/supporting target keyword. Audits check the article against
  // BOTH the primary and this secondary keyword. "" / undefined = none selected.
  secondaryKeyword?: string;
  onSelectSecondary?: (term: string) => void;
  documentFields?: DocumentFields;
  externalAnalysis?: {
    analysis: import("../lib/types").SEOAnalysis | null;
    isLoading: boolean;
    isVolumesLoading?: boolean;
    error: string | null;
    deepAnalysis: import("../lib/types").DeepAnalysis | null;
    isDeepLoading: boolean;
    runDeepAnalysis: () => void;
    refreshVolumes?: () => void;
    aeoContentChanged?: boolean;
  };
}

interface SuggestedKeyword {
  term: string;
  volume: number;
  inContent: boolean;
  reason?: string;
  placement?: KeywordPlacement;
}

function SectionHeader({ label, iconColor, actionButton }: { label: string; iconColor: string; actionButton?: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 10 }}>
      <div style={{ width: 7, height: 7, borderRadius: "50%", background: iconColor, flexShrink: 0 }} />
      <span style={{ fontSize: 10.5, textTransform: "uppercase", letterSpacing: "0.06em", color: "#4b5563", fontWeight: 600, flex: 1 }}>
        {label}
      </span>
      {actionButton}
    </div>
  );
}

const cardStyle = {
  borderRadius: 14,
  background: "rgba(255,255,255,0.55)",
  backdropFilter: "blur(16px) saturate(170%)",
  WebkitBackdropFilter: "blur(16px) saturate(170%)",
  boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.85), inset 1.5px 2px 1px -1px rgba(255,255,255,1), inset -2px -3px 2px -1px rgba(255,255,255,0.6), 0 2px 6px rgba(0,0,0,0.07), 0 10px 26px rgba(0,0,0,0.08)",
  padding: "14px",
};

interface KeywordHelpSuggestion {
  type: "change" | "add";
  original?: string;
  revised?: string;
  sentence?: string;
  where?: string;
}

function abbrevVol(v: number | null | undefined): string {
  if (v == null) return "";
  if (v === 0) return "N/A";
  if (v >= 10000) return Math.round(v / 1000) + "K";
  if (v >= 1000) return (v / 1000).toFixed(1) + "K";
  return String(v);
}

function placementCount(p?: KeywordPlacement): number {
  if (!p) return 0;
  return [p.inBody, p.inTitle, p.inMetaDescription, p.inImages, p.inUrl].filter(Boolean).length;
}

type PlacementKey = "inBody" | "inTitle" | "inMetaDescription" | "inImages" | "inUrl" | "none";

function buildSuggestedKeywords(
  supporting: { term: string; volume: number | null; inContent: boolean; placement?: KeywordPlacement }[],
  missing: { term: string; volume: number | null; reason: string; placement?: KeywordPlacement }[],
  documentText: string,
  documentFields?: DocumentFields
): SuggestedKeyword[] {
  const merged: SuggestedKeyword[] = [];
  const lowerText = documentText.toLowerCase();

  for (const kw of supporting) {
    const actuallyInContent = lowerText.includes(kw.term.toLowerCase());
    const livePlacement = computePlacementClient(kw.term, documentText, documentFields);
    merged.push({ term: kw.term, volume: kw.volume ?? 0, inContent: actuallyInContent, placement: livePlacement });
  }

  for (const kw of missing) {
    const actuallyInContent = lowerText.includes(kw.term.toLowerCase());
    const livePlacement = computePlacementClient(kw.term, documentText, documentFields);
    merged.push({ term: kw.term, volume: kw.volume ?? 0, inContent: actuallyInContent, reason: kw.reason, placement: livePlacement });
  }

  merged.sort((a, b) => {
    const pDiff = placementCount(b.placement) - placementCount(a.placement);
    if (pDiff !== 0) return pDiff;
    return b.volume - a.volume;
  });
  return merged;
}

function LightbulbButton({ onClick, isLoading }: { onClick: () => void; isLoading: boolean }) {
  const [hovered, setHovered] = useState(false);

  return (
    <span
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: "relative", cursor: isLoading ? "wait" : "pointer", lineHeight: 1,
        opacity: isLoading ? 0.5 : 1, flexShrink: 0, display: "inline-flex", alignItems: "center",
        color: hovered ? MJH_GOLD : "#9ca3af", transition: "color 150ms",
      }}
      title="Show how to use this keyword"
    >
      {isLoading ? (
        <LoadingBars size="xs" color={MJH_GOLD} />
      ) : (
        <svg width="13" height="13" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path fillRule="evenodd" d="M10 1a6 6 0 00-3.815 10.631C7.001 12.097 7.5 12.93 7.5 13.875V15a2.5 2.5 0 002.5 2.5h0a2.5 2.5 0 002.5-2.5v-1.125c0-.945.498-1.778 1.315-2.244A6 6 0 0010 1zM8.025 13H9.5v-2.077a.75.75 0 011.5 0V13h1.475A4.5 4.5 0 0011.5 9.86V5.75a.75.75 0 00-1.5 0v4.11a4.5 4.5 0 00-1.975 3.14z" clipRule="evenodd" />
        </svg>
      )}
      {hovered && !isLoading && (
        <span style={{
          position: "absolute", bottom: "100%", left: "50%", transform: "translateX(-50%)",
          marginBottom: 4, padding: "2px 6px", borderRadius: 4, background: "#1f2937",
          color: "#ffffff", fontSize: 10, whiteSpace: "nowrap", pointerEvents: "none", zIndex: 10,
        }}>
          See suggestion
        </span>
      )}
    </span>
  );
}

function HighlightKeyword({ text, keyword }: { text: string; keyword: string }) {
  if (!keyword || !text) return <>{text}</>;
  const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const splitRegex = new RegExp(`(${escaped})`, "gi");
  const parts = text.split(splitRegex);
  return (
    <>
      {parts.map((part, i) => {
        const testRegex = new RegExp(`^${escaped}$`, "i");
        return testRegex.test(part) ? (
          <span key={i} style={{ background: "#FEF08A", fontWeight: 600, borderRadius: 2, padding: "0 1px" }}>{part}</span>
        ) : (
          <span key={i}>{part}</span>
        );
      })}
    </>
  );
}

function KeywordHelpDisplay({ suggestions, onRegenerate, isRegenerating, term, publication }: {
  suggestions: KeywordHelpSuggestion[];
  onRegenerate: () => void;
  isRegenerating: boolean;
  term: string;
  publication?: string;
}) {
  return (
    <div style={{ paddingLeft: 8, paddingTop: 4, paddingBottom: 4, display: "flex", flexDirection: "column", gap: 6 }}>
      {suggestions.map((s, i) => (
        <div key={i} style={{ fontSize: 11, lineHeight: 1.5, padding: "6px 8px", background: "rgba(0,93,172,0.05)", borderRadius: 6, borderLeft: `2px solid ${MJH_BLUE}` }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
            <div style={{ flex: 1 }}>
              {s.type === "change" ? (
                <>
                  <div style={{ color: "#4b5563", fontWeight: 600, fontSize: 10, textTransform: "uppercase", marginBottom: 2 }}>Change</div>
                  <div style={{ color: "#991b1b", textDecoration: "line-through", marginBottom: 2 }}>{s.original}</div>
                  <div style={{ color: "#166534" }}><HighlightKeyword text={s.revised || ""} keyword={term} /></div>
                </>
              ) : (
                <>
                  <div style={{ color: "#4b5563", fontWeight: 600, fontSize: 10, textTransform: "uppercase", marginBottom: 2 }}>Add{s.where ? ` - ${s.where}` : ""}</div>
                  <div style={{ color: "#1f2937" }}><HighlightKeyword text={s.sentence || ""} keyword={term} /></div>
                </>
              )}
            </div>
            <FeedbackButton
              suggestionType="keyword_help"
              suggestionText={`${term}: ${s.type === "change" ? s.revised : s.sentence}`}
              publication={publication}
            />
          </div>
        </div>
      ))}
      <button
        onClick={onRegenerate}
        disabled={isRegenerating}
        style={{
          display: "flex", alignItems: "center", gap: 4, padding: "4px 8px", fontSize: 10,
          color: isRegenerating ? "#9ca3af" : MJH_BLUE, background: "none", border: "none",
          cursor: isRegenerating ? "wait" : "pointer", alignSelf: "flex-start", transition: "color 150ms",
        }}
        title="Regenerate suggestions"
      >
        <svg width="12" height="12" viewBox="0 0 20 20" fill="currentColor" style={{ animation: isRegenerating ? "spin 1s linear infinite" : "none" }}>
          <path fillRule="evenodd" d="M15.312 11.424a5.5 5.5 0 01-9.201 2.466l-.312-.311h2.433a.75.75 0 000-1.5H4.598a.75.75 0 00-.75.75v3.634a.75.75 0 001.5 0v-2.033l.312.311a7 7 0 0011.712-3.138.75.75 0 00-1.449-.39zm-10.624-2.85a5.5 5.5 0 019.201-2.466l.312.311h-2.433a.75.75 0 000 1.5h3.634a.75.75 0 00.75-.75V3.535a.75.75 0 00-1.5 0v2.033l-.312-.311A7 7 0 002.628 8.395a.75.75 0 001.449.39z" clipRule="evenodd" />
        </svg>
        {isRegenerating ? "Regenerating..." : "Regenerate"}
      </button>
    </div>
  );
}

function PencilButton({ onClick, active }: { onClick: () => void; active: boolean }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: "none", border: "none", cursor: "pointer", padding: 2,
        display: "flex", alignItems: "center", color: active ? MJH_GOLD : "#9ca3af",
        transition: "color 150ms", flexShrink: 0,
      }}
      title="Add custom keyword"
    >
      <svg width="12" height="12" viewBox="0 0 20 20" fill="currentColor">
        <path d="M2.695 14.763l-1.262 3.154a.5.5 0 00.65.65l3.155-1.262a4 4 0 001.343-.885L17.5 5.5a2.121 2.121 0 00-3-3L3.58 13.42a4 4 0 00-.885 1.343z" />
      </svg>
    </button>
  );
}

function PrimaryKeywordSelector({
  candidates, selectedTerm, onSelect,
}: {
  candidates: PrimaryKeywordCandidate[];
  selectedTerm: string;
  onSelect: (term: string) => void;
}) {
  const [customInputOpen, setCustomInputOpen] = useState(false);
  const [customValue, setCustomValue] = useState("");

  const handleCustomSubmit = () => {
    const trimmed = customValue.trim();
    if (trimmed) {
      onSelect(trimmed);
      setCustomValue("");
      setCustomInputOpen(false);
    }
  };

  return (
    <div style={cardStyle}>
      <SectionHeader
        label="Primary Keyword"
        iconColor="#16a34a"
        actionButton={<PencilButton onClick={() => setCustomInputOpen(!customInputOpen)} active={customInputOpen} />}
      />

      {customInputOpen && (
        <div style={{ marginBottom: 8, display: "flex", gap: 6 }}>
          <input
            type="text" value={customValue} onChange={(e) => setCustomValue(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleCustomSubmit(); }}
            placeholder="Type a custom primary keyword" autoFocus
            style={{ flex: 1, padding: "5px 8px", fontSize: 12, borderRadius: 8, border: "1px solid #e5e7eb", outline: "none", fontFamily: "inherit" }}
          />
          <button
            onClick={handleCustomSubmit} disabled={!customValue.trim()}
            style={{
              padding: "5px 10px", fontSize: 11, fontWeight: 600, borderRadius: 6, border: "none",
              background: customValue.trim() ? MJH_GOLD : "#e5e7eb",
              color: customValue.trim() ? "#ffffff" : "#9ca3af",
              cursor: customValue.trim() ? "pointer" : "not-allowed",
            }}
          >
            Set
          </button>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {candidates.map((candidate) => {
          const isSelected = candidate.term === selectedTerm;
          return (
            <div
              key={candidate.term} onClick={() => onSelect(candidate.term)}
              style={{
                display: "flex", alignItems: "center", gap: 8, padding: "6px 8px", borderRadius: 8, cursor: "pointer",
                background: isSelected ? "rgba(22,163,74,0.06)" : "transparent",
                border: isSelected ? "1px solid rgba(22,163,74,0.2)" : "1px solid transparent", transition: "all 150ms",
              }}
            >
              <div style={{
                width: 14, height: 14, borderRadius: "50%", border: isSelected ? "none" : "2px solid #d1d5db",
                background: isSelected ? "#16a34a" : "transparent", flexShrink: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                {isSelected && <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#ffffff" }} />}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 12, fontWeight: isSelected ? 600 : 400, color: isSelected ? "#166534" : "#374151" }}>
                    {candidate.term}
                  </span>
                  {candidate.volume != null && (
                    <span style={{ fontSize: 11, fontWeight: 600, color: "#1f2937" }}>{abbrevVol(candidate.volume)}/mo</span>
                  )}
                  <span style={{ fontSize: 10, color: "#1f2937" }}>
                    {Math.round(candidate.confidence * 100)}% confidence
                  </span>
                </div>
                {candidate.placement && (
                  <div style={{ marginTop: 3 }}><PlacementIndicators placement={candidate.placement} /></div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SecondaryKeywordSelector({
  options,
  selectedTerm,
  onSelect,
}: {
  options: { term: string; volume: number | null }[];
  selectedTerm: string;
  onSelect: (term: string) => void;
}) {
  const [customInputOpen, setCustomInputOpen] = useState(false);
  const [customValue, setCustomValue] = useState("");

  const handleCustomSubmit = () => {
    const trimmed = customValue.trim();
    if (trimmed) {
      onSelect(trimmed);
      setCustomValue("");
      setCustomInputOpen(false);
    }
  };

  // The selected secondary may be a custom term not present in `options` - append it
  // so the radio still shows as selected.
  const opts = selectedTerm && !options.some((o) => o.term === selectedTerm)
    ? [...options, { term: selectedTerm, volume: null }]
    : options;

  return (
    <div style={cardStyle}>
      <SectionHeader
        label="Secondary Keyword"
        iconColor={MJH_BLUE}
        actionButton={
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase", color: "#9ca3af" }}>Optional</span>
            <PencilButton onClick={() => setCustomInputOpen(!customInputOpen)} active={customInputOpen} />
          </div>
        }
      />

      <div style={{ fontSize: 11, color: "#4b5563", lineHeight: 1.5, marginBottom: 8 }}>
        Pick one more keyword to optimize for. Copilot then checks your title, meta, URL, headings, and images against both keywords.
      </div>

      {customInputOpen && (
        <div style={{ marginBottom: 8, display: "flex", gap: 6 }}>
          <input
            type="text"
            value={customValue}
            onChange={(e) => setCustomValue(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleCustomSubmit(); }}
            placeholder="Type a custom secondary keyword"
            autoFocus
            style={{ flex: 1, padding: "5px 8px", fontSize: 12, borderRadius: 8, border: "1px solid #e5e7eb", outline: "none", fontFamily: "inherit" }}
          />
          <button
            onClick={handleCustomSubmit}
            disabled={!customValue.trim()}
            style={{
              padding: "5px 10px", fontSize: 11, fontWeight: 600, borderRadius: 6, border: "none",
              background: customValue.trim() ? MJH_BLUE : "#e5e7eb",
              color: customValue.trim() ? "#ffffff" : "#9ca3af",
              cursor: customValue.trim() ? "pointer" : "not-allowed",
            }}
          >
            Set
          </button>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {/* None option - secondary is optional */}
        <SecondaryOptionRow term="" label="None" selected={!selectedTerm} onSelect={() => onSelect("")} />
        {opts.map((o) => (
          <SecondaryOptionRow
            key={o.term}
            term={o.term}
            label={o.term}
            volume={o.volume}
            selected={o.term === selectedTerm}
            onSelect={() => onSelect(o.term)}
          />
        ))}
      </div>
    </div>
  );
}

function SecondaryOptionRow({ term, label, volume, selected, onSelect }: { term: string; label: string; volume?: number | null; selected: boolean; onSelect: () => void }) {
  return (
    <div
      onClick={onSelect}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "6px 8px",
        borderRadius: 8,
        cursor: "pointer",
        background: selected ? "rgba(0,93,172,0.06)" : "transparent",
        border: selected ? "1px solid rgba(0,93,172,0.2)" : "1px solid transparent",
        transition: "all 150ms",
      }}
    >
      <div style={{
        width: 14, height: 14, borderRadius: "50%",
        border: selected ? "none" : "2px solid #d1d5db",
        background: selected ? MJH_BLUE : "transparent",
        flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        {selected && <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#ffffff" }} />}
      </div>
      <span style={{ fontSize: 12, fontWeight: selected ? 600 : 400, color: term ? (selected ? "#00468a" : "#374151") : "#6b7280", flex: 1, minWidth: 0 }}>
        {label}
      </span>
      {volume != null && (
        <span style={{ fontSize: 11, fontWeight: 600, color: "#1f2937" }}>{volume === 0 ? "N/A" : `${abbrevVol(volume)}/mo`}</span>
      )}
    </div>
  );
}

const PLACEMENT_FILTERS: { key: PlacementKey; label: string; letter: string }[] = [
  { key: "inBody", label: "Body", letter: "B" },
  { key: "inTitle", label: "Title", letter: "T" },
  { key: "inMetaDescription", label: "Description", letter: "D" },
  { key: "inImages", label: "Images", letter: "I" },
  { key: "inUrl", label: "URL", letter: "U" },
];

const INITIAL_SHOW = 8;

function computePlacementClient(term: string, content: string, fields?: DocumentFields): KeywordPlacement {
  const lower = term.toLowerCase();
  return {
    inBody: content.toLowerCase().includes(lower),
    inTitle: fields?.title?.toLowerCase().includes(lower) ?? false,
    inMetaDescription: fields?.metaDescription?.toLowerCase().includes(lower) ?? false,
    inImages: fields?.imageNames?.some((name: string) => name.toLowerCase().includes(lower)) ?? false,
    inUrl: fields?.slug?.toLowerCase().includes(lower) ?? false,
  };
}

function SuggestedKeywordsCard({
  keywords, text, apiUrl, publication, documentFields, refreshVolumes, isVolumesLoading,
}: {
  keywords: SuggestedKeyword[];
  text: string;
  apiUrl: string;
  publication?: string;
  documentFields?: DocumentFields;
  refreshVolumes?: () => void;
  isVolumesLoading?: boolean;
}) {
  const [helpData, setHelpData] = useState<Record<string, KeywordHelpSuggestion[]>>({});
  const [loadingTerm, setLoadingTerm] = useState<string | null>(null);
  const [regeneratingTerm, setRegeneratingTerm] = useState<string | null>(null);
  const [manualInputOpen, setManualInputOpen] = useState(false);
  const [manualInputValue, setManualInputValue] = useState("");
  const [manualKeywords, setManualKeywords] = useState<string[]>([]);
  const [expanded, setExpanded] = useState(false);
  const [extraKeywords, setExtraKeywords] = useState<SuggestedKeyword[]>([]);
  const [isGeneratingMore, setIsGeneratingMore] = useState(false);
  const [sortAsc, setSortAsc] = useState(false);
  const [activeFilters, setActiveFilters] = useState<Set<PlacementKey>>(new Set());
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [enrichingTerms, setEnrichingTerms] = useState<Set<string>>(new Set());

  const fetchHelp = async (term: string, forceRegenerate = false) => {
    if (helpData[term] && !forceRegenerate) {
      const next = { ...helpData };
      delete next[term];
      setHelpData(next);
      return;
    }
    if (forceRegenerate) { setRegeneratingTerm(term); } else { setLoadingTerm(term); }
    try {
      const previousSuggestions = forceRegenerate && helpData[term]
        ? helpData[term].map((s) => s.revised || s.sentence || "").filter(Boolean)
        : undefined;
      const res = await fetch(`${apiUrl}/api/seo-copilot/keyword-help`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyword: term, content: text, publication, previousSuggestions }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setHelpData((prev) => ({ ...prev, [term]: data.suggestions || [] }));
    } catch {
      setHelpData((prev) => ({ ...prev, [term]: [{ type: "add", sentence: "Failed to generate suggestions. Try again.", where: "" }] }));
    }
    setLoadingTerm(null);
    setRegeneratingTerm(null);
  };

  // Apply filters
  let filtered = keywords;
  if (activeFilters.size > 0) {
    const hasNoneFilter = activeFilters.has("none");
    const placementFilters = [...activeFilters].filter((f) => f !== "none") as PlacementKey[];
    filtered = keywords.filter((kw) => {
      if (hasNoneFilter) return placementCount(kw.placement) === 0;
      if (placementFilters.length === 0) return true;
      if (!kw.placement) return false;
      for (const f of placementFilters) {
        if (f === "none") continue;
        if (!kw.placement[f as keyof KeywordPlacement]) return false;
      }
      return true;
    });
  }

  const sorted = [...filtered].sort((a, b) => {
    const pA = placementCount(a.placement);
    const pB = placementCount(b.placement);
    if (sortAsc) {
      if (pA !== pB) return pA - pB;
      return a.volume - b.volume;
    }
    if (pA !== pB) return pB - pA;
    return b.volume - a.volume;
  });

  // Recompute placement for extra keywords from live document state
  const liveExtras = extraKeywords.map((ek) => ({
    ...ek,
    placement: computePlacementClient(ek.term, text, documentFields),
    inContent: text.toLowerCase().includes(ek.term.toLowerCase()),
  }));
  const allKeywords = [...sorted, ...liveExtras.filter((ek) => !sorted.some((s) => s.term.toLowerCase() === ek.term.toLowerCase()))];
  const visible = expanded ? allKeywords : allKeywords.slice(0, INITIAL_SHOW);
  const hiddenCount = allKeywords.length - INITIAL_SHOW;

  const toggleFilter = (key: PlacementKey) => {
    setActiveFilters((prev) => {
      if (key === "none") return prev.has("none") ? new Set() : new Set(["none"] as PlacementKey[]);
      const next = new Set(prev);
      next.delete("none");
      if (next.has(key)) { next.delete(key); } else { next.add(key); }
      return next;
    });
  };

  const handleAddManual = async () => {
    const trimmed = manualInputValue.trim();
    if (!trimmed) return;
    if (manualKeywords.includes(trimmed) || allKeywords.some((kw) => kw.term.toLowerCase() === trimmed.toLowerCase())) return;
    setManualKeywords((prev) => [...prev, trimmed]);
    setManualInputValue("");
    const placement = computePlacementClient(trimmed, text, documentFields);
    const inContent = text.toLowerCase().includes(trimmed.toLowerCase());
    setExtraKeywords((prev) => [...prev, { term: trimmed, volume: 0, inContent, placement }]);
    setEnrichingTerms((prev) => new Set(prev).add(trimmed));
    try {
      const res = await fetch(`${apiUrl}/api/seo-copilot/keywords`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keywords: [trimmed] }),
      });
      if (res.ok) {
        const data = await res.json();
        const match = (data.results || []).find((r: { keyword: string }) => r.keyword.toLowerCase() === trimmed.toLowerCase());
        if (match) {
          setExtraKeywords((prev) => prev.map((kw) =>
            kw.term.toLowerCase() === trimmed.toLowerCase() ? { ...kw, volume: match.volume ?? 0 } : kw
          ));
        }
      }
    } catch { /* silent */ }
    setEnrichingTerms((prev) => { const next = new Set(prev); next.delete(trimmed); return next; });
    fetchHelp(trimmed);
  };

  const generateMoreKeywords = async () => {
    setIsGeneratingMore(true);
    try {
      const existingTerms = allKeywords.map((kw) => kw.term);
      const res = await fetch(`${apiUrl}/api/seo-copilot/more-keywords`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: text, existingKeywords: existingTerms, publication }),
      });
      if (res.ok) {
        const data = await res.json();
        const newKws: SuggestedKeyword[] = (data.keywords || []).map((kw: { term: string; volume: number | null; inContent: boolean }) => ({
          term: kw.term, volume: kw.volume ?? 0, inContent: kw.inContent,
          placement: computePlacementClient(kw.term, text, documentFields),
        }));
        setExtraKeywords((prev) => [...prev, ...newKws]);
      }
    } catch { /* silent */ }
    setIsGeneratingMore(false);
  };

  return (
    <div style={cardStyle}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
        <div style={{ width: 6, height: 6, borderRadius: "50%", background: MJH_BLUE, flexShrink: 0 }} />
        <span style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.05em", color: "#4b5563", fontWeight: 600, flex: 1 }}>
          Supporting Keywords
        </span>
        {refreshVolumes && (
          <button
            onClick={refreshVolumes} disabled={isVolumesLoading}
            style={{ background: "none", border: "none", cursor: isVolumesLoading ? "wait" : "pointer", padding: 2, display: "flex", color: isVolumesLoading ? "#d1d5db" : "#9ca3af", fontSize: 10 }}
            title="Refresh keyword volumes"
          >
            {isVolumesLoading ? <LoadingBars size="xs" color="#9ca3af" /> : (
              <svg width="12" height="12" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M15.312 11.424a5.5 5.5 0 01-9.201 2.466l-.312-.311h2.433a.75.75 0 000-1.5H4.598a.75.75 0 00-.75.75v3.634a.75.75 0 001.5 0v-2.033l.312.311a7 7 0 0011.712-3.138.75.75 0 00-1.449-.39zm-10.624-2.85a5.5 5.5 0 019.201-2.466l.312.311h-2.433a.75.75 0 000 1.5h3.634a.75.75 0 00.75-.75V3.535a.75.75 0 00-1.5 0v2.033l-.312-.311A7 7 0 002.628 8.395a.75.75 0 001.449.39z" clipRule="evenodd" />
              </svg>
            )}
          </button>
        )}
        <button onClick={() => setSortAsc(!sortAsc)} style={{ background: "none", border: "none", cursor: "pointer", padding: 2, display: "flex", color: "#4b5563", fontSize: 10 }} title={sortAsc ? "Sort: least placements first" : "Sort: most placements first"}>
          <svg width="12" height="12" viewBox="0 0 20 20" fill="currentColor" style={{ transform: sortAsc ? "rotate(180deg)" : "none", transition: "transform 150ms" }}>
            <path fillRule="evenodd" d="M10 3a.75.75 0 01.55.24l3.25 3.5a.75.75 0 11-1.1 1.02L10 4.852 7.3 7.76a.75.75 0 01-1.1-1.02l3.25-3.5A.75.75 0 0110 3zm-3.76 9.2a.75.75 0 011.06.04l2.7 2.908 2.7-2.908a.75.75 0 111.1 1.02l-3.25 3.5a.75.75 0 01-1.1 0l-3.25-3.5a.75.75 0 01.04-1.06z" clipRule="evenodd" />
          </svg>
        </button>
        <div style={{ position: "relative" }}>
          <button
            onClick={() => setShowFilterDropdown(!showFilterDropdown)}
            style={{
              background: activeFilters.size > 0 ? "rgba(0,93,172,0.1)" : "none",
              border: "none", cursor: "pointer", padding: "2px 4px", display: "flex", alignItems: "center", gap: 2,
              color: activeFilters.size > 0 ? MJH_BLUE : "#9ca3af", borderRadius: 4, fontSize: 10,
            }}
            title="Filter by placement"
          >
            <svg width="12" height="12" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M2.628 1.601C5.028 1.206 7.49 1 10 1s4.973.206 7.372.601a.75.75 0 01.628.74v2.288a2.25 2.25 0 01-.659 1.59l-4.682 4.683a2.25 2.25 0 00-.659 1.59v3.037c0 .684-.31 1.33-.844 1.757l-1.937 1.55A.75.75 0 018 18.25v-5.757a2.25 2.25 0 00-.659-1.591L2.659 6.22A2.25 2.25 0 012 4.629V2.34a.75.75 0 01.628-.74z" clipRule="evenodd" />
            </svg>
            {activeFilters.size > 0 && <span>{activeFilters.size}</span>}
          </button>
          {showFilterDropdown && (
            <div style={{
              position: "absolute", top: "100%", right: 0, marginTop: 4, width: 150,
              background: "#ffffff", borderRadius: 8, boxShadow: "0 4px 12px rgba(0,0,0,0.12)",
              border: "1px solid #e5e7eb", zIndex: 50, padding: "4px 0",
            }}>
              {PLACEMENT_FILTERS.map(({ key, label, letter }) => (
                <button key={key} onClick={() => toggleFilter(key)} style={{
                  width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "5px 10px",
                  background: "none", border: "none", cursor: "pointer", fontSize: 11, color: "#1f2937", textAlign: "left",
                }}>
                  <div style={{
                    width: 14, height: 14, borderRadius: 3, border: "1.5px solid " + (activeFilters.has(key) ? MJH_BLUE : "#d1d5db"),
                    background: activeFilters.has(key) ? MJH_BLUE : "transparent",
                    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                  }}>
                    {activeFilters.has(key) && (
                      <svg width="8" height="8" viewBox="0 0 12 12" fill="white"><path d="M10 3L4.5 8.5 2 6" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    )}
                  </div>
                  <span style={{ fontWeight: 600, color: "#4b5563", width: 14 }}>{letter}</span>
                  <span>{label}</span>
                </button>
              ))}
              <button onClick={() => toggleFilter("none")} style={{
                width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "5px 10px",
                background: "none", border: "none", cursor: "pointer", fontSize: 11, color: "#1f2937", textAlign: "left", borderTop: "1px solid #f1f5f9",
              }}>
                <div style={{
                  width: 14, height: 14, borderRadius: 3, border: "1.5px solid " + (activeFilters.has("none") ? MJH_BLUE : "#d1d5db"),
                  background: activeFilters.has("none") ? MJH_BLUE : "transparent",
                  display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                }}>
                  {activeFilters.has("none") && (
                    <svg width="8" height="8" viewBox="0 0 12 12" fill="white"><path d="M10 3L4.5 8.5 2 6" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  )}
                </div>
                <span style={{ fontWeight: 600, color: "#4b5563", width: 14 }}>-</span>
                <span>None (missing all)</span>
              </button>
              {activeFilters.size > 0 && (
                <button onClick={() => { setActiveFilters(new Set()); setShowFilterDropdown(false); }} style={{
                  width: "100%", padding: "5px 10px", background: "none", border: "none",
                  borderTop: "1px solid #f1f5f9", cursor: "pointer", fontSize: 10, color: "#dc2626", textAlign: "center",
                }}>
                  Clear filters
                </button>
              )}
            </div>
          )}
        </div>
        <PencilButton onClick={() => setManualInputOpen(!manualInputOpen)} active={manualInputOpen} />
      </div>

      {manualInputOpen && (
        <div style={{ marginBottom: 8, display: "flex", gap: 6 }}>
          <input type="text" value={manualInputValue} onChange={(e) => setManualInputValue(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleAddManual(); }}
            placeholder="Add a keyword manually" autoFocus
            style={{ flex: 1, padding: "5px 8px", fontSize: 12, borderRadius: 8, border: "1px solid #e5e7eb", outline: "none", fontFamily: "inherit" }}
          />
          <button onClick={handleAddManual} disabled={!manualInputValue.trim()} style={{
            padding: "5px 10px", fontSize: 11, fontWeight: 600, borderRadius: 6, border: "none",
            background: manualInputValue.trim() ? MJH_BLUE : "#e5e7eb",
            color: manualInputValue.trim() ? "#ffffff" : "#9ca3af",
            cursor: manualInputValue.trim() ? "pointer" : "not-allowed",
          }}>Add</button>
        </div>
      )}

      <div>
        {visible.map((kw, i) => (
          <div key={kw.term}>
            <div style={{
              display: "flex", alignItems: "center", gap: 8, padding: "5px 0",
              borderBottom: i < visible.length - 1 ? "1px solid #f3f4f6" : "none", minHeight: 28,
            }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", flexShrink: 0, background: kw.inContent ? "#16a34a" : "#d1d5db" }} />
              <span style={{ fontSize: 12, fontWeight: kw.inContent ? 500 : 600, flexGrow: 1, color: "#1f2937" }}>{kw.term}</span>
              {enrichingTerms.has(kw.term) && <LoadingBars size="xs" color="#6b7280" />}
              {!enrichingTerms.has(kw.term) && kw.volume != null && (
                <span style={{ fontSize: 10.5, fontWeight: 600, color: "#1f2937", flexShrink: 0 }} title="Monthly searches">{abbrevVol(kw.volume)}/mo</span>
              )}
              {kw.placement && <PlacementIndicators placement={kw.placement} />}
              {!kw.inContent && <LightbulbButton onClick={() => fetchHelp(kw.term)} isLoading={loadingTerm === kw.term} />}
            </div>
            {helpData[kw.term] && (
              <KeywordHelpDisplay
                suggestions={helpData[kw.term]} onRegenerate={() => fetchHelp(kw.term, true)}
                isRegenerating={regeneratingTerm === kw.term} term={kw.term} publication={publication}
              />
            )}
          </div>
        ))}
      </div>

      {!expanded && hiddenCount > 0 && (
        <button onClick={() => setExpanded(true)} style={{
          marginTop: 6, width: "100%", padding: "4px 0", background: "none", border: "none",
          cursor: "pointer", fontSize: 10, color: "#4b5563", display: "flex", alignItems: "center", justifyContent: "center", gap: 4,
        }}>
          <svg width="10" height="10" viewBox="0 0 20 20" fill="#9ca3af">
            <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
          </svg>
          Show more
        </button>
      )}
      {expanded && (
        <button onClick={generateMoreKeywords} disabled={isGeneratingMore} style={{
          marginTop: 6, width: "100%", padding: "5px 0", background: "none", border: "none",
          cursor: isGeneratingMore ? "wait" : "pointer", fontSize: 10,
          color: isGeneratingMore ? "#9ca3af" : MJH_BLUE,
          display: "flex", alignItems: "center", justifyContent: "center", gap: 4, fontWeight: 500,
        }}>
          {isGeneratingMore ? (
            <><LoadingBars size="xs" color={MJH_BLUE} /> Generating...</>
          ) : (
            <>
              <svg width="10" height="10" viewBox="0 0 20 20" fill={MJH_BLUE}>
                <path fillRule="evenodd" d="M15.312 11.424a5.5 5.5 0 01-9.201 2.466l-.312-.311h2.433a.75.75 0 000-1.5H4.598a.75.75 0 00-.75.75v3.634a.75.75 0 001.5 0v-2.033l.312.311a7 7 0 0011.712-3.138.75.75 0 00-1.449-.39zm-10.624-2.85a5.5 5.5 0 019.201-2.466l.312.311h-2.433a.75.75 0 000 1.5h3.634a.75.75 0 00.75-.75V3.535a.75.75 0 00-1.5 0v2.033l-.312-.311A7 7 0 002.628 8.395a.75.75 0 001.449.39z" clipRule="evenodd" />
              </svg>
              Generate more
            </>
          )}
        </button>
      )}
    </div>
  );
}


export function KeywordPanel({
  text, publication, seedKeywords = [], onSeedsChange, onSelectPrimary,
  secondaryKeyword, onSelectSecondary,
  documentFields, externalAnalysis,
}: KeywordPanelProps) {
  const { apiUrl } = useConfig();
  // Destructure with safe defaults so hooks are always called (Rules of Hooks compliance)
  const analysis = externalAnalysis?.analysis ?? null;
  const isLoading = externalAnalysis?.isLoading ?? false;
  const error = externalAnalysis?.error ?? null;
  const deepAnalysis = externalAnalysis?.deepAnalysis ?? null;
  const isDeepLoading = externalAnalysis?.isDeepLoading ?? false;
  const runDeepAnalysis = externalAnalysis?.runDeepAnalysis ?? (() => {});
  const isVolumesLoading = externalAnalysis?.isVolumesLoading ?? false;
  const refreshVolumes = externalAnalysis?.refreshVolumes;

  // Track the text snapshot when AEO was last triggered to prevent re-fires on same content
  const aeoTextRef = useRef("");
  useEffect(() => {
    if (!externalAnalysis) return;
    const hasV2Aeo = deepAnalysis?.aeo?.questionHeadings?.length;
    if (analysis && !hasV2Aeo && !isDeepLoading && text !== aeoTextRef.current) {
      aeoTextRef.current = text;
      runDeepAnalysis();
    }
  }, [externalAnalysis, analysis, deepAnalysis, isDeepLoading, text, runDeepAnalysis]);

  const defaultSelectedTerm = analysis?.primaryKeyword?.term ?? "";
  const [selectedPrimaryTerm, setSelectedPrimaryTerm] = useState(defaultSelectedTerm);
  const prevDefaultRef = useRef(defaultSelectedTerm);

  // Auto-select first candidate when analysis arrives and nothing is selected yet
  useEffect(() => {
    if (!selectedPrimaryTerm && analysis?.primaryKeywordCandidates?.length) {
      const first = analysis.primaryKeywordCandidates[0].term;
      setSelectedPrimaryTerm(first);
      onSelectPrimary?.(first);
    }
  }, [analysis?.primaryKeywordCandidates]);

  useEffect(() => {
    if (defaultSelectedTerm && defaultSelectedTerm !== prevDefaultRef.current) {
      setSelectedPrimaryTerm((prev) => prev === prevDefaultRef.current ? defaultSelectedTerm : prev);
      prevDefaultRef.current = defaultSelectedTerm;
    }
  }, [defaultSelectedTerm]);

  if ((!text || text.trim().length < 20) && (!seedKeywords || seedKeywords.length === 0)) {
    return (
      <div style={{ padding: 24, textAlign: "center" }}>
        <div style={{ fontSize: 14, color: "#4b5563", fontWeight: 500 }}>Start writing to see keyword suggestions</div>
        <div style={{ fontSize: 12, color: "#4b5563", marginTop: 4 }}>Need at least a few sentences</div>
      </div>
    );
  }

  if (isLoading && !analysis) {
    return (
      <div style={{ padding: 24, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
        <LoadingBars />
        <span style={{ fontSize: 12, color: "#4b5563" }}>Analyzing content...</span>
      </div>
    );
  }

  if (error && !analysis) {
    return (
      <div style={{ ...cardStyle, margin: 12, background: "#fef2f2", color: "#dc2626" }}>
        <span style={{ fontSize: 12 }}>Error: {error}</span>
      </div>
    );
  }

  if (!analysis) return null;

  const suggestedKeywords = buildSuggestedKeywords(analysis.supportingKeywords || [], analysis.missingKeywords, text, documentFields);

  // Recompute placement for primary candidates from live document state
  const rawCandidates = analysis.primaryKeywordCandidates && analysis.primaryKeywordCandidates.length > 0
    ? analysis.primaryKeywordCandidates
    : [analysis.primaryKeyword];
  const candidates: PrimaryKeywordCandidate[] = rawCandidates.map((c) => ({
    ...c,
    placement: computePlacementClient(c.term, text, documentFields),
  }));

  const activeTerm = candidates.find((c) => c.term === selectedPrimaryTerm) ? selectedPrimaryTerm : candidates[0]?.term ?? "";

  // Build the secondary keyword option pool: same candidates as primary + suggested supporting
  // keywords (deduped). Gives the user a relevant set to pick from without extra API calls.
  const secondaryOptions: { term: string; volume: number | null }[] = [];
  const seenSecondary = new Set<string>();
  for (const c of candidates) {
    const key = c.term.toLowerCase();
    if (!seenSecondary.has(key)) { seenSecondary.add(key); secondaryOptions.push({ term: c.term, volume: c.volume }); }
  }
  for (const kw of suggestedKeywords) {
    const key = kw.term.toLowerCase();
    if (!seenSecondary.has(key)) { seenSecondary.add(key); secondaryOptions.push({ term: kw.term, volume: kw.volume }); }
  }

  return (
    <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 12 }}>
      {/* On-page instructions: the two-keyword target process */}
      <div style={{ ...cardStyle, padding: "11px 13px", background: "rgba(0,93,172,0.05)", boxShadow: "inset 0 0 0 1px rgba(0,93,172,0.12)" }}>
        <div style={{ fontSize: 11.5, color: "#1f2937", lineHeight: 1.55 }}>
          <strong style={{ color: "#00468a" }}>Choose your target keywords.</strong> Pick one <strong>Primary</strong> keyword (required) and, optionally, one <strong>Secondary</strong> keyword. Copilot optimizes the whole article - title, meta, URL, headings, and images - toward both.
        </div>
      </div>

      {onSeedsChange && <SeedKeywordInput seeds={seedKeywords} onSeedsChange={onSeedsChange} />}

      <PrimaryKeywordSelector
        candidates={candidates} selectedTerm={activeTerm}
        onSelect={(term: string) => { setSelectedPrimaryTerm(term); onSelectPrimary?.(term); }}
      />

      {/* Secondary Keyword Selector (optional) */}
      {onSelectSecondary && secondaryOptions.length > 0 && (
        <SecondaryKeywordSelector
          options={secondaryOptions}
          selectedTerm={secondaryKeyword || ""}
          onSelect={(term: string) => onSelectSecondary(term)}
        />
      )}

      {suggestedKeywords.length > 0 && (
        <SuggestedKeywordsCard
          keywords={suggestedKeywords} text={text} apiUrl={apiUrl}
          publication={publication} documentFields={documentFields}
          refreshVolumes={refreshVolumes} isVolumesLoading={isVolumesLoading}
        />
      )}

      {/* AEO insights moved to dedicated AEO/GEO tab in V3 - this panel is keywords only */}

      {isVolumesLoading && (
        <div style={{ display: "flex", alignItems: "center", gap: 6, justifyContent: "center", padding: "4px 0" }}>
          <LoadingBars size="xs" color={MJH_GOLD} />
          <span style={{ fontSize: 10, color: "#4b5563" }}>Checking search volumes...</span>
        </div>
      )}

      {isLoading && analysis && (
        <div style={{ display: "flex", alignItems: "center", gap: 6, justifyContent: "center" }}>
          <LoadingBars size="xs" color="#9ca3af" />
          <span style={{ fontSize: 10, color: "#4b5563" }}>Updating insights...</span>
        </div>
      )}
    </div>
  );
}
