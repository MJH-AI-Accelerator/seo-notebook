"use client";

import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { useKeywordAnalysis } from "../hooks/useKeywordAnalysis";
import { useConfig } from "./ConfigContext";
import { KeywordPanel } from "./KeywordPanel";
import { ChatPanel } from "./ChatPanel";
import { ErrorBoundary } from "./ErrorBoundary";
import { TabBar } from "./TabBar";
import { SummaryTab } from "./tabs/SummaryTab";
import { AEOTab } from "./tabs/AEOTab";
import { LinkingTab } from "./tabs/LinkingTab";
import { MetaTab } from "./tabs/MetaTab";
import { TechnicalTab } from "./tabs/TechnicalTab";
import { INJECTED_CSS, MJH_GOLD, MJH_SLATE, PANEL_BG, CHAT_ZONE_BG, RECS_ZONE_BG } from "./styles";
import { OnboardingInfoButton, OnboardingCard } from "./OnboardingPopup";
import { fetchLinkingSuggestions, fetchContentSuggestions, checkLinks } from "../lib/api";
import type { DocumentFields, TabId, LinkingSuggestion, SummaryItem, ContentSuggestions, LinkCheckResult } from "../lib/types";

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
    try {
      const c = localStorage.getItem(seedCacheKey);
      if (c) return JSON.parse(c).seeds || [];
    } catch {}
    return [];
  });
  const setSeedKeywords = useCallback(
    (seeds: string[]) => {
      setSeedKeywordsRaw(seeds);
      try {
        const c = JSON.parse(localStorage.getItem(seedCacheKey) || "{}");
        localStorage.setItem(seedCacheKey, JSON.stringify({ ...c, seeds }));
      } catch {}
    },
    [seedCacheKey]
  );
  const [selectedPrimary, setSelectedPrimary] = useState<string | undefined>();
  const [selectedSecondary, setSelectedSecondary] = useState<string>("");
  const keywordAnalysisState = useKeywordAnalysis(text, apiUrl, publication, seedKeywords, documentFields, selectedPrimary, documentId);

  // activeTab is intentionally NOT persisted - every fresh panel mount starts on
  // Keywords, the workflow entry point.
  const [activeTab, setActiveTab] = useState<TabId>("keywords");
  // Chat is a collapsible bottom drawer - collapsed by default so tab content gets the
  // full panel height.
  const [chatOpen, setChatOpen] = useState(false);
  const isLoading = keywordAnalysisState.isLoading;

  const effectivePrimary = selectedPrimary || keywordAnalysisState.analysis?.primaryKeyword?.term || "";

  // Smart Linking - lifted state, persisted per-doc.
  const linkingKey = `seo-notebook-linking-${documentId}`;
  const [linkingSuggestions, setLinkingSuggestions] = useState<LinkingSuggestion[]>(() => {
    try {
      const cached = typeof window !== "undefined" ? localStorage.getItem(linkingKey) : null;
      return cached ? JSON.parse(cached) : [];
    } catch { return []; }
  });
  const [isLinkingLoading, setIsLinkingLoading] = useState(false);
  const [linkingError, setLinkingError] = useState<string | null>(null);
  // The article text at the moment we last fetched - used to flag stale suggestions.
  const [linkingFetchedText, setLinkingFetchedText] = useState("");
  const linkingVersionRef = useRef(0);
  // Tracks the keyword signature we last fetched for. Declared here (not next to the
  // auto-fetch effect) so the doc-change reset below can clear it - otherwise switching
  // to a doc with cached suggestions triggers a wasted re-fetch.
  const lastLinkingFetchKey = useRef<string>("");

  const persistLinkingSuggestions = useCallback((sugs: LinkingSuggestion[]) => {
    setLinkingSuggestions(sugs);
    try { localStorage.setItem(linkingKey, JSON.stringify(sugs)); } catch {}
  }, [linkingKey]);

  // Reset linking state on document change
  const lastDocIdRef = useRef(documentId);
  useEffect(() => {
    if (lastDocIdRef.current !== documentId) {
      lastDocIdRef.current = documentId;
      linkingVersionRef.current += 1;
      setIsLinkingLoading(false);
      setLinkingError(null);
      lastLinkingFetchKey.current = "";
      try {
        const cached = localStorage.getItem(`seo-notebook-linking-${documentId}`);
        setLinkingSuggestions(cached ? JSON.parse(cached) : []);
      } catch { setLinkingSuggestions([]); }
    }
  }, [documentId]);

  const supportingKeywordsForLinking = useMemo(() => {
    const base = (keywordAnalysisState.analysis?.supportingKeywords || [])
      .map((kw) => kw.term)
      .filter(Boolean);
    // Prepend secondary keyword so the linking ranker scores it highly (deduped)
    const all = selectedSecondary
      ? [selectedSecondary, ...base.filter((t) => t.toLowerCase() !== selectedSecondary.toLowerCase())]
      : base;
    return all.slice(0, 5);
  }, [keywordAnalysisState.analysis, selectedSecondary]);

  const refreshLinkingSuggestions = useCallback(async () => {
    if (!text || text.trim().length < 50) return;
    if (!effectivePrimary) return;
    const myVersion = linkingVersionRef.current;
    setIsLinkingLoading(true);
    setLinkingError(null);
    try {
      const suggestions = await fetchLinkingSuggestions(
        apiUrl,
        text,
        effectivePrimary,
        supportingKeywordsForLinking,
        documentId,
        publication
      );
      if (linkingVersionRef.current !== myVersion) return;
      persistLinkingSuggestions(suggestions);
      setLinkingFetchedText(text);
    } catch {
      if (linkingVersionRef.current !== myVersion) return;
      setLinkingError("Could not fetch linking suggestions. Try again.");
    }
    if (linkingVersionRef.current !== myVersion) return;
    setIsLinkingLoading(false);
  }, [apiUrl, text, effectivePrimary, supportingKeywordsForLinking, documentId, publication, persistLinkingSuggestions]);

  // Stale = the article changed materially since we last fetched suggestions.
  const isLinkingStale = useMemo(() => {
    if (!linkingFetchedText || linkingSuggestions.length === 0) return false;
    if (Math.abs(text.length - linkingFetchedText.length) > 150) return true;
    return text.slice(0, 300) !== linkingFetchedText.slice(0, 300);
  }, [text, linkingFetchedText, linkingSuggestions.length]);

  useEffect(() => {
    if (!text || text.trim().length < 50 || !effectivePrimary) return;
    const fetchKey = `${documentId}|${effectivePrimary}|${supportingKeywordsForLinking.join(",")}`;
    if (fetchKey === lastLinkingFetchKey.current) return;
    if (linkingSuggestions.length > 0 && lastLinkingFetchKey.current === "") {
      lastLinkingFetchKey.current = fetchKey;
      return;
    }
    lastLinkingFetchKey.current = fetchKey;
    refreshLinkingSuggestions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectivePrimary, supportingKeywordsForLinking.join("|"), documentId]);

  // Content suggestions - lifted here so Generate All can trigger them
  const csKey = `seo-notebook-cs-${documentId}`;
  const [contentSuggestions, setContentSuggestions] = useState<ContentSuggestions | null>(() => {
    try {
      const cached = typeof window !== "undefined" ? localStorage.getItem(csKey) : null;
      return cached ? JSON.parse(cached) : null;
    } catch { return null; }
  });
  const [isCSLoading, setIsCSLoading] = useState(false);
  const [csError, setCsError] = useState<string | null>(null);
  const csVersionRef = useRef(0);

  useEffect(() => {
    csVersionRef.current += 1;
    setIsCSLoading(false);
    setCsError(null);
    try {
      const cached = localStorage.getItem(`seo-notebook-cs-${documentId}`);
      setContentSuggestions(cached ? JSON.parse(cached) : null);
    } catch { setContentSuggestions(null); }
  }, [documentId]);

  const loadContentSuggestions = useCallback(async () => {
    if (!text || text.trim().length < 100) return;
    const myVersion = csVersionRef.current;
    setIsCSLoading(true);
    setCsError(null);
    try {
      const data = await fetchContentSuggestions(apiUrl, text, effectivePrimary, publication);
      if (csVersionRef.current !== myVersion) return;
      if (
        data.keyTakeaways.length === 0 &&
        data.infographicOpportunities.length === 0 &&
        data.bulletListItems.length === 0
      ) {
        setCsError("No suggestions returned. Try again with more content.");
      } else {
        setContentSuggestions(data);
        try { localStorage.setItem(csKey, JSON.stringify(data)); } catch {}
      }
    } catch {
      if (csVersionRef.current !== myVersion) return;
      setCsError("Could not generate content suggestions. Try again.");
    }
    if (csVersionRef.current !== myVersion) return;
    setIsCSLoading(false);
  }, [apiUrl, text, effectivePrimary, publication, csKey]);

  // ---- Link-check state (Technical tab) ------------------------------------
  // Persisted per-document so opening the same article again shows the last run.
  const linkCheckKey = `seo-notebook-link-check-${documentId}`;
  const [linkCheckResults, setLinkCheckResults] = useState<LinkCheckResult[]>(() => {
    try {
      const cached = typeof window !== "undefined" ? localStorage.getItem(linkCheckKey) : null;
      return cached ? JSON.parse(cached) : [];
    } catch { return []; }
  });
  const [hasRunLinkCheck, setHasRunLinkCheck] = useState<boolean>(() => {
    try {
      return typeof window !== "undefined" ? localStorage.getItem(`${linkCheckKey}-ran`) === "1" : false;
    } catch { return false; }
  });
  const [isLinkCheckLoading, setIsLinkCheckLoading] = useState(false);
  const [linkCheckError, setLinkCheckError] = useState<string | null>(null);
  const linkCheckVersionRef = useRef(0);
  // Link-check needs its OWN doc-tracking ref. The linking-reset effect above also
  // gates on `lastDocIdRef !== documentId` and sets it first, so if we shared that
  // ref this reset would be skipped on every doc switch (stale link-check state).
  const lastLinkCheckDocIdRef = useRef(documentId);

  useEffect(() => {
    if (lastLinkCheckDocIdRef.current !== documentId) {
      lastLinkCheckDocIdRef.current = documentId;
      // Reset transient state on doc change; reload persisted state for the new doc.
      linkCheckVersionRef.current += 1;
      setIsLinkCheckLoading(false);
      setLinkCheckError(null);
      try {
        const cached = localStorage.getItem(`seo-notebook-link-check-${documentId}`);
        setLinkCheckResults(cached ? JSON.parse(cached) : []);
        setHasRunLinkCheck(localStorage.getItem(`seo-notebook-link-check-${documentId}-ran`) === "1");
      } catch {
        setLinkCheckResults([]);
        setHasRunLinkCheck(false);
      }
    }
  }, [documentId]);

  const runLinkCheck = useCallback(async () => {
    const urls = documentFields?.bodyLinks || [];
    if (urls.length === 0) {
      setHasRunLinkCheck(true);
      setLinkCheckResults([]);
      try {
        localStorage.setItem(linkCheckKey, "[]");
        localStorage.setItem(`${linkCheckKey}-ran`, "1");
      } catch {}
      return;
    }
    const myVersion = linkCheckVersionRef.current;
    setIsLinkCheckLoading(true);
    setLinkCheckError(null);
    try {
      const results = await checkLinks(apiUrl, urls);
      if (linkCheckVersionRef.current !== myVersion) return;
      if (results.length === 0) {
        setLinkCheckError("Could not reach the link checker. Try again.");
      } else {
        setLinkCheckResults(results);
        setHasRunLinkCheck(true);
        try {
          localStorage.setItem(linkCheckKey, JSON.stringify(results));
          localStorage.setItem(`${linkCheckKey}-ran`, "1");
        } catch {}
      }
    } catch {
      if (linkCheckVersionRef.current !== myVersion) return;
      setLinkCheckError("Link check failed. Try again.");
    }
    if (linkCheckVersionRef.current !== myVersion) return;
    setIsLinkCheckLoading(false);
  }, [apiUrl, documentFields?.bodyLinks, linkCheckKey]);

  // Generate All orchestrator
  const isAnyLoading =
    keywordAnalysisState.isLoading ||
    keywordAnalysisState.isVolumesLoading ||
    keywordAnalysisState.isDeepLoading ||
    isCSLoading ||
    isLinkingLoading ||
    isLinkCheckLoading;

  // Onboarding popup - shown once per publication, auto-dismisses after 5 s.
  // Clicking the (i) button re-opens it in "persistent" mode (no auto-dismiss timer).
  const onboardSite = publication || "default";
  const onboardKey = `seo-copilot-onboarded-${onboardSite}`;
  const onboardSessionKey = `seo-copilot-onboard-shown-${onboardSite}`;
  const [popupMode, setPopupMode] = useState<"hidden" | "auto" | "persistent">("hidden");
  const [popupClosing, setPopupClosing] = useState(false);
  const onboardTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let onboarded = false;
    let shownThisSession = false;
    try { onboarded = localStorage.getItem(onboardKey) === "1"; } catch {}
    try { shownThisSession = sessionStorage.getItem(onboardSessionKey) === "1"; } catch {}
    if (!onboarded && !shownThisSession) {
      setPopupMode("auto");
      try { sessionStorage.setItem(onboardSessionKey, "1"); } catch {}
      onboardTimerRef.current = setTimeout(() => {
        setPopupClosing(true);
        setTimeout(() => { setPopupMode("hidden"); setPopupClosing(false); }, 180);
      }, 5000);
    }
    return () => { if (onboardTimerRef.current) clearTimeout(onboardTimerRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onboardKey, onboardSessionKey]);

  const markOnboarded = useCallback(() => {
    try { localStorage.setItem(onboardKey, "1"); } catch {}
  }, [onboardKey]);

  const dismissPopup = useCallback(() => {
    if (onboardTimerRef.current) clearTimeout(onboardTimerRef.current);
    markOnboarded();
    setPopupClosing(true);
    setTimeout(() => { setPopupMode("hidden"); setPopupClosing(false); }, 180);
  }, [markOnboarded]);

  const openPopupPersistent = useCallback(() => {
    if (onboardTimerRef.current) clearTimeout(onboardTimerRef.current);
    markOnboarded();
    setPopupClosing(false);
    setPopupMode("persistent");
  }, [markOnboarded]);

  const handleTabChange = useCallback((id: TabId) => {
    markOnboarded();
    if (onboardTimerRef.current) clearTimeout(onboardTimerRef.current);
    setPopupMode((m) => (m === "hidden" ? m : "hidden"));
    setActiveTab(id);
  }, [markOnboarded]);

  const onGenerateAll = useCallback(() => {
    keywordAnalysisState.runDeepAnalysis();
    if (text && text.trim().length >= 100) loadContentSuggestions();
    if (text && text.trim().length >= 50 && effectivePrimary) refreshLinkingSuggestions();
    if ((documentFields?.bodyLinks || []).length > 0) runLinkCheck();
  }, [keywordAnalysisState, text, effectivePrimary, documentFields?.bodyLinks, loadContentSuggestions, refreshLinkingSuggestions, runLinkCheck]);

  const onSummaryItemClick = useCallback((item: SummaryItem) => {
    setActiveTab(item.jumpTo.tab);
    const id = item.jumpTo.anchorId;
    if (!id) return;
    // Give React a beat to swap the destination tab from display:none to block,
    // then scroll + flash the target card so the editor sees where they landed.
    setTimeout(() => {
      const el = typeof document !== "undefined" ? document.getElementById(id) : null;
      if (!el) return;
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      el.classList.add("seo-copilot-flash");
      setTimeout(() => el.classList.remove("seo-copilot-flash"), 1400);
    }, 80);
  }, []);

  const keywordPanelData = useMemo(() => {
    const { analysis } = keywordAnalysisState;
    if (!analysis) return undefined;
    return {
      primaryKeyword: { term: analysis.primaryKeyword.term, volume: analysis.primaryKeyword.volume },
      supportingKeywords: (analysis.supportingKeywords || []).map((kw) => ({ term: kw.term, volume: kw.volume })),
      missingKeywords: analysis.missingKeywords.map((kw) => ({ term: kw.term, volume: kw.volume })),
      aeoData: keywordAnalysisState.deepAnalysis?.aeo
        ? {
            questionHeadings: (keywordAnalysisState.deepAnalysis.aeo.questionHeadings || []).map((h) => ({
              suggestedHeading: h.suggestedHeading,
              rationale: h.rationale,
            })),
          }
        : undefined,
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

  const tabDefs = [
    { id: "summary" as TabId, label: "Summary", isHub: true, loading: isAnyLoading },
    { id: "keywords" as TabId, label: "Keywords", loading: keywordAnalysisState.isLoading || keywordAnalysisState.isVolumesLoading },
    { id: "aeo" as TabId, label: "AEO/GEO", loading: keywordAnalysisState.isDeepLoading },
    { id: "linking" as TabId, label: "Linking", beta: true, loading: isLinkingLoading },
    { id: "meta" as TabId, label: "Meta", beta: true },
    { id: "technical" as TabId, label: "Other Recs", beta: true, loading: isLinkCheckLoading },
  ];

  return (
    <div
      className="seo-copilot-panel"
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        // backgroundColor (longhand) so the sheen background-image in INJECTED_CSS isn't reset
        backgroundColor: PANEL_BG,
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif",
        position: "relative",
      }}
    >
      <style dangerouslySetInnerHTML={{ __html: INJECTED_CSS }} />

      {/* First-run onboarding popup. Auto-shown once per publication;
          clicking the (i) button in the header re-opens in persistent mode. */}
      {popupMode !== "hidden" && <OnboardingCard onDismiss={dismissPopup} closing={popupClosing} />}

      {/* Header */}
      <div
        style={{
          position: "relative",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 16px",
          background: `linear-gradient(180deg, #FFFFFF 0%, ${PANEL_BG} 100%)`,
          boxShadow: "0 1px 0 rgba(0,0,0,0.04)",
          zIndex: 10,
          flexShrink: 0,
        }}
      >
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
          <OnboardingInfoButton onClick={openPopupPersistent} />
        </div>
        <div
          style={{
            position: "absolute",
            bottom: 2,
            left: 38,
            fontSize: 9,
            color: "rgba(0,0,0,0.42)",
            fontWeight: 400,
            fontStyle: "italic",
            letterSpacing: "0.02em",
          }}
        >
          More eyes on your expertise
        </div>
      </div>

      {/* Tab Bar */}
      <TabBar tabs={tabDefs} activeTab={activeTab} onTabChange={handleTabChange} />

      {/* Universal AI disclaimer - one place, applies to every tab. */}
      <div
        style={{
          padding: "5px 12px",
          fontSize: 10,
          color: "#6b7280",
          lineHeight: 1.4,
          textAlign: "center",
          background: "rgba(255,255,255,0.45)",
          borderBottom: "1px solid rgba(0,0,0,0.06)",
          flexShrink: 0,
        }}
      >
        Recommendations are generated by AI. Verify details before publishing.
      </div>

      {/* Tab content + chat split */}
      <div ref={containerRef} style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* Tab content area (the "recommendations" zone) - carries the warm gold zone
            gradient that mirrors the chat's blue gradient below (gold = analysis,
            blue = chat). */}
        <div style={{
          height: chatOpen ? `${splitPercent}%` : undefined,
          flex: chatOpen ? undefined : 1,
          overflow: "auto",
          minHeight: 0,
          background: RECS_ZONE_BG,
        }}>
          <ErrorBoundary fallbackMessage="Tab encountered an error">
            <div style={{ display: activeTab === "keywords" ? "block" : "none" }}>
              <KeywordPanel
                text={text}
                publication={publication}
                seedKeywords={seedKeywords}
                onSeedsChange={setSeedKeywords}
                onSelectPrimary={setSelectedPrimary}
                secondaryKeyword={selectedSecondary}
                onSelectSecondary={setSelectedSecondary}
                documentFields={documentFields}
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
            </div>
            <div style={{ display: activeTab === "summary" ? "block" : "none" }}>
              <SummaryTab
                text={text}
                analysis={keywordAnalysisState.analysis}
                deepAnalysis={keywordAnalysisState.deepAnalysis}
                documentFields={documentFields}
                primaryKeyword={effectivePrimary}
                secondaryKeyword={selectedSecondary}
                linkingSuggestions={linkingSuggestions}
                linkCheckResults={linkCheckResults}
                isAnyLoading={isAnyLoading}
                onGenerateAll={onGenerateAll}
                onItemClick={onSummaryItemClick}
              />
            </div>
            <div style={{ display: activeTab === "aeo" ? "block" : "none" }}>
              <AEOTab
                text={text}
                deepAnalysis={keywordAnalysisState.deepAnalysis}
                isDeepLoading={keywordAnalysisState.isDeepLoading}
                publication={publication}
                runDeepAnalysis={keywordAnalysisState.runDeepAnalysis}
                aeoContentChanged={keywordAnalysisState.aeoContentChanged}
                documentId={documentId}
                contentSuggestions={contentSuggestions}
                isCSLoading={isCSLoading}
                csError={csError}
                loadContentSuggestions={loadContentSuggestions}
              />
            </div>
            <div style={{ display: activeTab === "linking" ? "block" : "none" }}>
              <LinkingTab
                analysis={keywordAnalysisState.analysis}
                suggestions={linkingSuggestions}
                isLoading={isLinkingLoading}
                error={linkingError}
                isStale={isLinkingStale}
                onRefresh={refreshLinkingSuggestions}
                documentId={documentId}
                publication={publication}
                text={text}
              />
            </div>
            <div style={{ display: activeTab === "meta" ? "block" : "none" }}>
              <MetaTab documentFields={documentFields} primaryKeyword={effectivePrimary} secondaryKeyword={selectedSecondary} />
            </div>
            <div style={{ display: activeTab === "technical" ? "block" : "none" }}>
              <TechnicalTab
                text={text}
                documentFields={documentFields}
                primaryKeyword={effectivePrimary}
                secondaryKeyword={selectedSecondary}
                linkCheckResults={linkCheckResults}
                isLinkCheckLoading={isLinkCheckLoading}
                linkCheckError={linkCheckError}
                hasRunLinkCheck={hasRunLinkCheck}
                onCheckLinks={runLinkCheck}
              />
            </div>
          </ErrorBoundary>
        </div>

        {/* Draggable Divider */}
        {chatOpen && (
          <div
            onMouseDown={onMouseDown}
            onTouchStart={onTouchStart}
            style={{
              height: 6,
              cursor: "row-resize",
              background: "linear-gradient(180deg, rgba(0,0,0,0.04) 0%, rgba(0,0,0,0.08) 50%, rgba(0,0,0,0.04) 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <div style={{ width: 32, height: 2, borderRadius: 1, background: "#d1d5db" }} />
          </div>
        )}

        {/* Persistent Chat zone - the blue zone gradient lives HERE (on the wrapper)
            so the collapse/expand toggle bar, the messages, and the composer all read
            as one continuous blue zone. (ChatPanel itself is transparent over this.) */}
        <div
          style={{
            height: chatOpen ? `${100 - splitPercent}%` : "auto",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            flexShrink: chatOpen ? undefined : 0,
            minHeight: 0,
            background: CHAT_ZONE_BG,
          }}
        >
          <button
            onClick={() => setChatOpen(!chatOpen)}
            style={{
              width: "100%",
              padding: "6px 12px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              background: "transparent",
              border: "none",
              // The toggle is the top edge of the blue glass chat zone: a soft white
              // rim reads as glass (not a hard black seam), and the inner divider when
              // open stays whisper-light so toggle->messages flows continuously.
              borderTop: "1px solid rgba(255,255,255,0.55)",
              borderBottom: chatOpen ? "1px solid rgba(255,255,255,0.45)" : "none",
              cursor: "pointer",
              flexShrink: 0,
            }}
          >
            <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "rgba(0,0,0,0.55)" }}>
              Chat
            </span>
            <svg width="12" height="12" viewBox="0 0 20 20" fill="rgba(0,0,0,0.55)" style={{ transform: chatOpen ? "rotate(0deg)" : "rotate(-90deg)", transition: "transform 200ms" }}>
              <path
                fillRule="evenodd"
                d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
                clipRule="evenodd"
              />
            </svg>
          </button>
          <div
            style={{
              flex: chatOpen ? 1 : 0,
              overflow: "hidden",
              display: chatOpen ? "flex" : "none",
              flexDirection: "column",
              minHeight: 0,
            }}
          >
            <ErrorBoundary fallbackMessage="Chat encountered an error">
              <ChatPanel text={text} publication={publication} keywordPanelData={keywordPanelData} documentId={documentId} />
            </ErrorBoundary>
          </div>
        </div>
      </div>
    </div>
  );
}
