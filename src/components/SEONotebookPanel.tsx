"use client";

import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { useKeywordAnalysis } from "../hooks/useKeywordAnalysis";
import { useConfig } from "./ConfigContext";
import { KeywordPanel } from "./KeywordPanel";
import { ChatPanel } from "./ChatPanel";
import { ErrorBoundary } from "./ErrorBoundary";
import { LoadingBars } from "./LoadingBars";
import { INJECTED_CSS, MJH_GOLD, MJH_SLATE } from "./styles";
import type { DocumentFields } from "../lib/types";

interface SEONotebookPanelProps {
  text: string;
  documentFields: DocumentFields;
  documentId: string;
}

function LogoIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <rect x="1" y="3" width="4" height="10" rx="1" fill={MJH_GOLD} opacity="1" />
      <rect x="6" y="1" width="4" height="14" rx="1" fill={MJH_GOLD} opacity="0.85" />
      <rect x="11" y="5" width="4" height="8" rx="1" fill={MJH_GOLD} opacity="0.6" />
    </svg>
  );
}

export function SEONotebookPanel({ text, documentFields, documentId }: SEONotebookPanelProps) {
  const { apiUrl, publication } = useConfig();

  // Lifted state
  const seedCacheKey = `seo-notebook-cache-${documentId}`;
  const [seedKeywords, setSeedKeywordsRaw] = useState<string[]>(() => {
    try { const c = localStorage.getItem(seedCacheKey); if (c) return JSON.parse(c).seeds || []; } catch {} return [];
  });
  const setSeedKeywords = useCallback((seeds: string[]) => {
    setSeedKeywordsRaw(seeds);
    try { const c = JSON.parse(localStorage.getItem(seedCacheKey) || "{}"); localStorage.setItem(seedCacheKey, JSON.stringify({ ...c, seeds })); } catch {}
  }, [seedCacheKey]);
  const [selectedPrimary, setSelectedPrimary] = useState<string | undefined>();
  const keywordAnalysisState = useKeywordAnalysis(text, apiUrl, publication, seedKeywords, documentFields, selectedPrimary, documentId);

  const [keywordsOpen, setKeywordsOpen] = useState(true);
  const [chatOpen, setChatOpen] = useState(true);
  const isLoading = keywordAnalysisState.isLoading;

  const keywordPanelData = useMemo(() => {
    const { analysis } = keywordAnalysisState;
    if (!analysis) return undefined;
    return {
      primaryKeyword: { term: analysis.primaryKeyword.term, volume: analysis.primaryKeyword.volume },
      supportingKeywords: (analysis.supportingKeywords || []).map((kw) => ({ term: kw.term, volume: kw.volume })),
      missingKeywords: analysis.missingKeywords.map((kw) => ({ term: kw.term, volume: kw.volume })),
      aeoData: keywordAnalysisState.deepAnalysis?.aeo ? {
        questionHeadings: (keywordAnalysisState.deepAnalysis.aeo.questionHeadings || []).map((h) => ({
          suggestedHeading: h.suggestedHeading, rationale: h.rationale,
        })),
        faqSuggestions: (keywordAnalysisState.deepAnalysis.aeo.faqSuggestions || []).map((f) => ({
          question: f.question, answer: f.answer,
        })),
      } : undefined,
    };
  }, [keywordAnalysisState.analysis, keywordAnalysisState.deepAnalysis]);

  // Draggable divider
  const [splitPercent, setSplitPercent] = useState(70);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const onMouseDown = useCallback(() => {
    dragging.current = true;
    document.body.style.cursor = "row-resize";
    document.body.style.userSelect = "none";
  }, []);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!dragging.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const pct = ((e.clientY - rect.top) / rect.height) * 100;
      setSplitPercent(Math.min(85, Math.max(15, pct)));
    };
    const onMouseUp = () => {
      dragging.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, []);

  // Touch support for mobile divider dragging
  const onTouchStart = useCallback(() => {
    dragging.current = true;
  }, []);

  useEffect(() => {
    const onTouchMove = (e: TouchEvent) => {
      if (!dragging.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const pct = ((e.touches[0].clientY - rect.top) / rect.height) * 100;
      setSplitPercent(Math.min(85, Math.max(15, pct)));
    };
    const onTouchEnd = () => {
      dragging.current = false;
    };
    window.addEventListener("touchmove", onTouchMove);
    window.addEventListener("touchend", onTouchEnd);
    return () => {
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, []);

  return (
    <div className="seo-copilot-panel" style={{ height: "100%", display: "flex", flexDirection: "column", background: "#FBFAF7", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif" }}>
      <style dangerouslySetInnerHTML={{ __html: INJECTED_CSS }} />

      {/* Header */}
      <div style={{
        position: "relative", display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "12px 16px",
        background: "linear-gradient(180deg, #FFFFFF 0%, #FBFAF7 100%)",
        boxShadow: "0 1px 0 rgba(0,0,0,0.04)", zIndex: 10, flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <LogoIcon />
          <span style={{ fontWeight: 700, fontSize: 15, letterSpacing: "-0.01em" }}>
            <span style={{ color: MJH_GOLD }}>SEO</span>
            <span style={{ color: MJH_SLATE }}> notebook</span>
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {isLoading && (
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: MJH_GOLD, animation: "content-pulse 2s ease-in-out infinite" }} />
          )}
        </div>
        <div style={{
          position: "absolute", bottom: 2, left: 38,
          fontSize: 9, color: "#b0b8c4", fontWeight: 400, fontStyle: "italic", letterSpacing: "0.02em",
        }}>
          More eyes on your expertise
        </div>
      </div>

      {/* Split View */}
      <div ref={containerRef} style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* Keywords Section */}
        <div style={{ height: keywordsOpen ? (chatOpen ? `${splitPercent}%` : "100%") : "auto", overflow: keywordsOpen ? "auto" : "hidden", flexShrink: keywordsOpen ? undefined : 0 }}>
          <button
            onClick={() => setKeywordsOpen(!keywordsOpen)}
            style={{ width: "100%", padding: "6px 12px", display: "flex", alignItems: "center", justifyContent: "space-between", background: "transparent", border: "none", borderBottom: "1px solid rgba(0,0,0,0.06)", cursor: "pointer" }}
          >
            <span style={{ display: "flex", alignItems: "center", gap: 6, flex: 1 }}>
              <span style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "#9ca3af" }}>Keywords & AEO Insights</span>
              {(keywordAnalysisState.isLoading || keywordAnalysisState.isVolumesLoading || keywordAnalysisState.isDeepLoading) && (
                <LoadingBars size="xs" color="#9ca3af" />
              )}
            </span>
            <svg width="12" height="12" viewBox="0 0 20 20" fill="#9ca3af" style={{ transform: keywordsOpen ? "rotate(0deg)" : "rotate(-90deg)", transition: "transform 200ms" }}>
              <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
            </svg>
          </button>
          <div style={{ display: keywordsOpen ? "block" : "none" }}>
            <ErrorBoundary fallbackMessage="Keyword panel encountered an error">
              <KeywordPanel
                text={text} publication={publication} seedKeywords={seedKeywords}
                onSeedsChange={setSeedKeywords} onSelectPrimary={setSelectedPrimary} documentFields={documentFields}
                externalAnalysis={{
                  analysis: keywordAnalysisState.analysis,
                  isLoading: keywordAnalysisState.isLoading,
                  isVolumesLoading: keywordAnalysisState.isVolumesLoading,
                  error: keywordAnalysisState.error,
                  deepAnalysis: keywordAnalysisState.deepAnalysis,
                  isDeepLoading: keywordAnalysisState.isDeepLoading,
                  runDeepAnalysis: keywordAnalysisState.runDeepAnalysis,
                  refreshVolumes: keywordAnalysisState.refreshVolumes,
                  aeoContentChanged: keywordAnalysisState.aeoContentChanged,
                }}
              />
            </ErrorBoundary>
          </div>
        </div>

        {/* Draggable Divider */}
        {keywordsOpen && chatOpen && (
          <div
            onMouseDown={onMouseDown}
            onTouchStart={onTouchStart}
            style={{
              height: 6, cursor: "row-resize",
              background: "linear-gradient(180deg, rgba(0,0,0,0.04) 0%, rgba(0,0,0,0.08) 50%, rgba(0,0,0,0.04) 100%)",
              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            }}
          >
            <div style={{ width: 32, height: 2, borderRadius: 1, background: "#d1d5db" }} />
          </div>
        )}

        {/* Chat Section */}
        <div style={{
          flex: chatOpen && !keywordsOpen ? 1 : undefined,
          height: chatOpen ? (keywordsOpen ? `${100 - splitPercent}%` : undefined) : "auto",
          overflow: "hidden", display: "flex", flexDirection: "column", flexShrink: chatOpen ? undefined : 0, minHeight: 0,
        }}>
          <button
            onClick={() => setChatOpen(!chatOpen)}
            style={{ width: "100%", padding: "6px 12px", display: "flex", alignItems: "center", justifyContent: "space-between", background: "transparent", border: "none", borderBottom: "1px solid rgba(0,0,0,0.06)", cursor: "pointer" }}
          >
            <span style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "#9ca3af" }}>Chat</span>
            <svg width="12" height="12" viewBox="0 0 20 20" fill="#9ca3af" style={{ transform: chatOpen ? "rotate(0deg)" : "rotate(-90deg)", transition: "transform 200ms" }}>
              <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
            </svg>
          </button>
          <div style={{ flex: chatOpen ? 1 : 0, overflow: "hidden", display: chatOpen ? "flex" : "none", flexDirection: "column", minHeight: 0 }}>
            <ErrorBoundary fallbackMessage="Chat encountered an error">
              <ChatPanel text={text} publication={publication} keywordPanelData={keywordPanelData} documentId={documentId} />
            </ErrorBoundary>
          </div>
        </div>
      </div>
    </div>
  );
}
