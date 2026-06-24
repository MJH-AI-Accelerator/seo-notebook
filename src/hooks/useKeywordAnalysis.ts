"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { fetchAnalysis, lookupKeywords } from "../lib/api";
import type { SEOAnalysis, DeepAnalysis, DocumentFields } from "../lib/types";

function mergeVolumes(
  analysis: SEOAnalysis,
  volumeMap: Map<string, { volume: number; cpc: number; competition: number }>
): SEOAnalysis {
  if (volumeMap.size === 0) return analysis;
  const updated = { ...analysis };

  if (updated.primaryKeywordCandidates && updated.primaryKeywordCandidates.length > 0) {
    updated.primaryKeywordCandidates = updated.primaryKeywordCandidates.map((candidate) => {
      const data = volumeMap.get(candidate.term.toLowerCase());
      return data ? { ...candidate, volume: data.volume, cpc: data.cpc, competition: data.competition } : candidate;
    });
  }

  const primaryData = volumeMap.get(updated.primaryKeyword.term.toLowerCase());
  if (primaryData) {
    updated.primaryKeyword = {
      ...updated.primaryKeyword,
      volume: primaryData.volume,
      cpc: primaryData.cpc,
      competition: primaryData.competition,
    };
  }

  updated.supportingKeywords = updated.supportingKeywords.map((kw) => {
    const data = volumeMap.get(kw.term.toLowerCase());
    return data ? { ...kw, volume: data.volume } : kw;
  });

  updated.missingKeywords = updated.missingKeywords.map((kw) => {
    const data = volumeMap.get(kw.term.toLowerCase());
    return data ? { ...kw, volume: data.volume } : kw;
  });

  return updated;
}

export function useKeywordAnalysis(
  text: string,
  apiUrl: string,
  publication?: string,
  seedKeywords?: string[],
  documentFields?: DocumentFields,
  focusPrimary?: string,
  documentId?: string,
  focusSecondary?: string
) {
  const cacheKey = documentId ? `seo-notebook-cache-${documentId}` : "seo-notebook-cache-v2";
  const loadCached = (): { analysis: SEOAnalysis | null; deepAnalysis: DeepAnalysis | null; seeds: string[] } => {
    try {
      const raw = typeof window !== "undefined" ? localStorage.getItem(cacheKey) : null;
      if (raw) return JSON.parse(raw);
    } catch { /* ignore */ }
    return { analysis: null, deepAnalysis: null, seeds: [] };
  };
  const cached = useRef(loadCached());

  const [analysis, setAnalysisRaw] = useState<SEOAnalysis | null>(cached.current.analysis);
  const [isLoading, setIsLoading] = useState(false);
  const [isVolumesLoading, setIsVolumesLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [deepAnalysis, setDeepAnalysisRaw] = useState<DeepAnalysis | null>(cached.current.deepAnalysis);
  const [isDeepLoading, setIsDeepLoading] = useState(false);
  const [aeoTextSnapshot, setAeoTextSnapshot] = useState<string>("");
  const [aeoContentChanged, setAeoContentChanged] = useState(false);

  // Persistent volume cache - survives analysis re-runs
  const volumeMapRef = useRef(new Map<string, { volume: number; cpc: number; competition: number }>());

  const setAnalysis = useCallback((val: SEOAnalysis | null) => {
    // Always re-apply cached volumes to any new analysis
    const withVolumes = val ? mergeVolumes(val, volumeMapRef.current) : null;
    setAnalysisRaw(withVolumes);
    try {
      const prev = loadCached();
      localStorage.setItem(cacheKey, JSON.stringify({ ...prev, analysis: withVolumes }));
    } catch { /* ignore */ }
  }, [cacheKey]);
  const setDeepAnalysis = useCallback((val: DeepAnalysis | null) => {
    setDeepAnalysisRaw(val);
    try {
      const prev = loadCached();
      localStorage.setItem(cacheKey, JSON.stringify({ ...prev, deepAnalysis: val }));
    } catch { /* ignore */ }
  }, [cacheKey]);

  const effectiveSeeds = seedKeywords;

  useEffect(() => {
    if (deepAnalysis && aeoTextSnapshot && text !== aeoTextSnapshot) {
      setAeoContentChanged(true);
    }
  }, [text, deepAnalysis, aeoTextSnapshot]);

  const lastAnalysisRef = useRef<SEOAnalysis | null>(null);
  // AbortControllers so stale async results can't overwrite fresh state and we stop
  // wasteful network round-trips when the input changes or the hook unmounts.
  const volumeAbortRef = useRef<AbortController | null>(null);
  const deepAbortRef = useRef<AbortController | null>(null);
  // Holds the latest doVolumeLookup so the analysis effect calls the current version
  // (avoids a stale-closure call after apiUrl/cacheKey change).
  const doVolumeLookupRef = useRef<(a: SEOAnalysis, terms?: string[]) => void>(() => {});

  useEffect(() => {
    if ((!text || text.trim().length < 20) && (!effectiveSeeds || effectiveSeeds.length === 0)) {
      setAnalysis(null);
      return;
    }

    let cancelled = false;
    const controller = new AbortController();
    setIsLoading(true);
    setError(null);

    fetchAnalysis(apiUrl, text, "realtime", publication, effectiveSeeds, documentFields, focusPrimary, focusSecondary, controller.signal)
      .then((result) => {
        if (cancelled) return;
        const analysisResult = result as SEOAnalysis;
        lastAnalysisRef.current = analysisResult;
        setAnalysis(analysisResult); // volumes auto-applied via setAnalysis wrapper
        setIsLoading(false);

        // Look up volumes for any NEW terms not already in the cache
        const candidateTerms = (analysisResult.primaryKeywordCandidates || []).map((c) => c.term);
        const allTerms = [
          ...new Set([
            ...candidateTerms,
            analysisResult.primaryKeyword.term,
            ...(analysisResult.supportingKeywords || []).map((kw) => kw.term),
            ...analysisResult.missingKeywords.map((kw) => kw.term),
          ]),
        ];
        const uncachedTerms = allTerms.filter((t) => !volumeMapRef.current.has(t.toLowerCase()));

        if (uncachedTerms.length > 0) {
          doVolumeLookupRef.current(analysisResult, uncachedTerms);
        }
      })
      .catch((err) => {
        // Aborted (input changed or unmounted) is not a real error.
        if (cancelled || controller.signal.aborted || err?.name === "AbortError") return;
        setError(err.message);
        setIsLoading(false);
      });

    return () => {
      cancelled = true;
      controller.abort();
      // Also cancel any volume lookup kicked off from this analysis's resolution, so a
      // stale lookup from the previous input can't write volumes after the input changed.
      // Reset the volumes spinner too: the aborted lookup skips its own reset, and the
      // next analysis may have all-cached terms (no new lookup) which would leave it stuck.
      volumeAbortRef.current?.abort();
      setIsVolumesLoading(false);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, apiUrl, publication, effectiveSeeds?.join(","), focusPrimary, focusSecondary, JSON.stringify(documentFields)]);

  const doVolumeLookup = useCallback((analysisResult: SEOAnalysis, terms?: string[]) => {
    setIsVolumesLoading(true);

    const lookupTerms = terms || (() => {
      const candidateTerms = (analysisResult.primaryKeywordCandidates || []).map((c) => c.term);
      return [
        ...new Set([
          ...candidateTerms,
          analysisResult.primaryKeyword.term,
          ...(analysisResult.supportingKeywords || []).map((kw) => kw.term),
          ...analysisResult.missingKeywords.map((kw) => kw.term),
        ]),
      ];
    })();

    if (lookupTerms.length === 0) {
      setIsVolumesLoading(false);
      return;
    }

    volumeAbortRef.current?.abort();
    const vc = new AbortController();
    volumeAbortRef.current = vc;

    lookupKeywords(apiUrl, lookupTerms, vc.signal)
      .then(({ results }) => {
        if (vc.signal.aborted) return;
        // Add new results to persistent cache
        results.forEach((r) => volumeMapRef.current.set(r.keyword.toLowerCase(), r));
        // Re-apply all cached volumes to current analysis
        const current = lastAnalysisRef.current || analysisResult;
        const merged = mergeVolumes(current, volumeMapRef.current);
        lastAnalysisRef.current = merged;
        setAnalysisRaw(merged);
        try {
          const prev = loadCached();
          localStorage.setItem(cacheKey, JSON.stringify({ ...prev, analysis: merged }));
        } catch { /* ignore */ }
        setIsVolumesLoading(false);
      })
      .catch((err) => {
        // Aborted (superseded lookup or unmount) is not a real error.
        if (vc.signal.aborted || err?.name === "AbortError") return;
        setIsVolumesLoading(false);
      });
  }, [apiUrl, cacheKey]);

  // Keep the ref pointed at the latest doVolumeLookup so the analysis effect (which
  // does not depend on it) always calls the current version.
  useEffect(() => {
    doVolumeLookupRef.current = doVolumeLookup;
  }, [doVolumeLookup]);

  // Abort any in-flight volume lookup or deep analysis on unmount.
  useEffect(() => () => {
    volumeAbortRef.current?.abort();
    deepAbortRef.current?.abort();
  }, []);

  const refreshVolumes = useCallback(() => {
    const current = lastAnalysisRef.current || analysis;
    if (!current) return;
    // Force refresh all - clear cache for these terms so they re-fetch
    doVolumeLookup(current);
  }, [analysis, doVolumeLookup]);

  const runDeepAnalysis = useCallback(() => {
    if ((!text || text.trim().length < 20) && (!effectiveSeeds || effectiveSeeds.length === 0)) return;

    setIsDeepLoading(true);
    setError(null);
    setAeoContentChanged(false);
    setAeoTextSnapshot(text);

    deepAbortRef.current?.abort();
    const dc = new AbortController();
    deepAbortRef.current = dc;

    fetchAnalysis(apiUrl, text, "deep", publication, effectiveSeeds, documentFields, focusPrimary, focusSecondary, dc.signal)
      .then((result) => {
        if (dc.signal.aborted) return;
        setDeepAnalysis(result as DeepAnalysis);
        setIsDeepLoading(false);
      })
      .catch((err) => {
        // Aborted (superseded run or unmount) is not a real error.
        if (dc.signal.aborted || err?.name === "AbortError") return;
        setError(err.message);
        setIsDeepLoading(false);
      });
  }, [text, apiUrl, publication, effectiveSeeds?.join(","), documentFields, focusPrimary, focusSecondary]);

  return {
    analysis,
    isLoading,
    isVolumesLoading,
    error,
    deepAnalysis,
    isDeepLoading,
    runDeepAnalysis,
    refreshVolumes,
    aeoContentChanged,
  };
}
