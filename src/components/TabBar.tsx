"use client";

import { useState, useRef, useLayoutEffect, useEffect } from "react";
import { PANEL_BG, MJH_BLUE } from "./styles";
import type { TabId } from "../lib/types";

interface TabDef {
  id: TabId;
  label: string;
  loading?: boolean;
  badge?: number;
  /** When true, the tab is styled as a "hub" landmark (not the regular flow). */
  isHub?: boolean;
  /** When true, a small beta marker is shown next to the label. */
  beta?: boolean;
}

// Small BETA pill shown next to the label. Tabs are equal-width and wrap
// vertically when the panel is narrow (see button styles), so all six stay
// visible and the pill never pushes a tab off-screen.
function BetaPill({ active }: { active?: boolean }) {
  return (
    <span
      title="Beta - this tab references Sanity fields and related articles that may need configuration in your live environment, so it needs more testing"
      style={{
        display: "inline-block",
        fontSize: 7.5,
        fontWeight: 700,
        letterSpacing: "0.03em",
        padding: "1px 3px",
        borderRadius: 3,
        // On the active tab the blue glider sits behind, so flip to a white chip
        // (blue text) to stay legible; off the glider it's a blue-tint chip.
        background: active ? "rgba(255,255,255,0.92)" : "rgba(0,93,172,0.14)",
        color: MJH_BLUE,
        textTransform: "uppercase",
        lineHeight: 1.1,
        verticalAlign: "middle",
        marginLeft: 3,
        whiteSpace: "nowrap",
      }}
    >
      Beta
    </span>
  );
}

// Renders a tab label so it only ever wraps between whole segments, never inside
// a word. A single word ("Summary", "Keywords") never splits. "AEO/GEO" wraps as
// "AEO/" / "GEO" - the slash STAYS on the first line with the preceding text (a
// line never begins with a slash; see brand kit "Label line-breaking"). The Beta
// pill drops onto its own line (below the label) before any word would break.
function TabLabel({ label, beta, active }: { label: string; beta?: boolean; active?: boolean }) {
  let body: React.ReactNode;
  const slash = label.indexOf("/");
  if (slash > 0) {
    const head = label.slice(0, slash + 1); // "AEO/" - slash stays on the first line
    const tail = label.slice(slash + 1); // "GEO"
    body = (
      <>
        <span style={{ whiteSpace: "nowrap" }}>{head}</span>
        <wbr />
        <span style={{ whiteSpace: "nowrap" }}>{tail}</span>
      </>
    );
  } else {
    // Single word stays whole (no break point inside it); a two-word label like
    // "Other Recs" wraps at its space naturally.
    body = label;
  }
  return (
    <span>
      {body}
      {beta && (
        <>
          <wbr />
          <BetaPill active={active} />
        </>
      )}
    </span>
  );
}

interface TabBarProps {
  tabs: TabDef[];
  activeTab: TabId;
  onTabChange: (id: TabId) => void;
}

// Tab-bar text colors are tuned for the pale-gold PANEL_BG surface - translucent
// black reads as "ink" and stays legible where a light gray would wash out.
const ACTIVE_INK = "#1f2937";
const HUB_INK = "rgba(0,0,0,0.7)";
const INACTIVE_INK = "rgba(0,0,0,0.52)";

function HubGlyph({ active }: { active: boolean }) {
  // 4-cell grid icon - reads as "overview / dashboard" without being heavy-handed
  // White when active (it sits on the blue glider), muted ink otherwise.
  const fill = active ? "#ffffff" : HUB_INK;
  return (
    <svg
      width="11"
      height="11"
      viewBox="0 0 12 12"
      fill="none"
      style={{ flexShrink: 0 }}
      aria-hidden="true"
    >
      <rect x="1" y="1" width="4" height="4" rx="0.8" fill={fill} />
      <rect x="7" y="1" width="4" height="4" rx="0.8" fill={fill} opacity="0.55" />
      <rect x="1" y="7" width="4" height="4" rx="0.8" fill={fill} opacity="0.55" />
      <rect x="7" y="7" width="4" height="4" rx="0.8" fill={fill} />
    </svg>
  );
}

interface IndicatorBox {
  left: number;
  top: number;
  width: number;
  height: number;
  ready: boolean;
  // Slide duration in ms, scaled by how far the indicator travels: a long
  // Summary->Meta jump takes LONGER so it glides smoothly instead of whipping
  // across; a short neighbour hop stays snappy.
  duration: number;
}

export function TabBar({ tabs, activeTab, onTabChange }: TabBarProps) {
  const [hoveredId, setHoveredId] = useState<TabId | null>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<Map<TabId, HTMLButtonElement>>(new Map());
  const prevActiveRef = useRef<TabId>(activeTab);
  // The sliding "liquid glass" indicator that marks the active tab. We measure
  // the active button's box relative to the bar and animate to it - this works
  // with the responsive wrapping because we read the real rendered box (which
  // may sit on a second row on a narrow panel) rather than assuming a layout.
  const [ind, setInd] = useState<IndicatorBox>({ left: 0, top: 0, width: 0, height: 0, ready: false, duration: 360 });
  // While the panel is actively being resized we track the active tab INSTANTLY
  // (no slide/bounce) so the indicator doesn't wobble during a drag. A click sets
  // this false, so selecting a tab always slides + bounces. Crucially the
  // transition is NEVER "none" (it only swaps bounce <-> instant) - that is what
  // keeps every click animating; the old "none" gate was getting reset by a
  // reflow on tab-switch, which is why clicks were snapping with zero slide.
  const [resizing, setResizing] = useState(false);
  // True for a beat right after a click, so a click-induced reflow (a scrollbar
  // appearing as tab content changes) isn't mistaken for a resize and doesn't
  // cancel the slide that's mid-flight.
  const justClickedRef = useRef(false);
  const clickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resizeSettleRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const signature = tabs.map((t) => `${t.id}:${t.label}:${t.loading ? 1 : 0}:${t.beta ? 1 : 0}`).join("|");

  useLayoutEffect(() => {
    const bar = barRef.current;
    const el = tabRefs.current.get(activeTab);
    if (!bar || !el) return;
    const br = bar.getBoundingClientRect();
    const er = el.getBoundingClientRect();
    const next = {
      left: er.left - br.left + bar.scrollLeft,
      top: er.top - br.top + bar.scrollTop,
      width: er.width,
      height: er.height,
    };
    const changed = prevActiveRef.current !== activeTab;
    prevActiveRef.current = activeTab;
    if (changed) {
      // A real selection: drop out of resize mode so this move slides + bounces,
      // and shield the next beat so a reflow can't cancel the slide.
      setResizing(false);
      justClickedRef.current = true;
      if (clickTimerRef.current) clearTimeout(clickTimerRef.current);
      clickTimerRef.current = setTimeout(() => { justClickedRef.current = false; }, 650);
    }
    setInd((prev) => {
      if (prev.left === next.left && prev.top === next.top && prev.width === next.width && prev.height === next.height && prev.ready) {
        return prev;
      }
      // Scale the slide time to the travel distance: ~constant perceived speed,
      // clamped so a neighbour hop is snappy (~280ms) and the longest jump glides
      // (~560ms) rather than darting across. Fixes "slides way too fast" on long jumps.
      const dist = Math.hypot(next.left - prev.left, next.top - prev.top);
      const duration = Math.min(560, Math.max(280, Math.round(250 + dist * 0.6)));
      return { ...next, ready: true, duration };
    });
  }, [activeTab, signature]);

  useEffect(() => {
    const bar = barRef.current;
    if (!bar || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => {
      // A reflow caused by a just-happened click isn't a resize - let the slide
      // that's already in flight finish instead of snapping it.
      if (justClickedRef.current) return;
      const el = tabRefs.current.get(activeTab);
      if (!el) return;
      const br = bar.getBoundingClientRect();
      const er = el.getBoundingClientRect();
      // Track instantly while resizing, then settle back to sliding so the next
      // click bounces again.
      setResizing(true);
      if (resizeSettleRef.current) clearTimeout(resizeSettleRef.current);
      resizeSettleRef.current = setTimeout(() => setResizing(false), 160);
      setInd((prev) => ({
        left: er.left - br.left + bar.scrollLeft,
        top: er.top - br.top + bar.scrollTop,
        width: er.width,
        height: er.height,
        ready: true,
        duration: prev.duration,
      }));
    });
    ro.observe(bar);
    return () => {
      ro.disconnect();
      if (resizeSettleRef.current) clearTimeout(resizeSettleRef.current);
    };
  }, [activeTab]);

  return (
    <div
      ref={barRef}
      style={{
        position: "relative",
        display: "flex",
        alignItems: "stretch",
        background: PANEL_BG,
        borderBottom: "1px solid rgba(0,0,0,0.14)",
        overflowX: "auto",
        overflowY: "hidden",
        flexShrink: 0,
      }}
      role="tablist"
      onMouseLeave={() => setHoveredId(null)}
    >
      {/* Sliding liquid-glass active indicator (behind the tab labels). */}
      {ind.ready && (
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            left: ind.left,
            top: ind.top,
            width: ind.width,
            height: ind.height,
            borderRadius: 9,
            background: "linear-gradient(135deg, rgba(0,93,172,0.62), rgba(0,93,172,0.95))",
            backdropFilter: "blur(16px) saturate(170%)",
            WebkitBackdropFilter: "blur(16px) saturate(170%)",
            // Beveled glass: top-left light edge + bottom-right inner shadow + a soft blue glow.
            boxShadow:
              "inset 1px 1px 3px rgba(255,255,255,0.4), inset -1px -1px 5px rgba(0,0,0,0.28), 0 0 14px rgba(0,93,172,0.40), 0 2px 8px rgba(0,0,0,0.15)",
            // Always a DEFINED transition (never "none") - that's what keeps every
            // click animating. Normally: a real slide with a gentle bounce that lands
            // on arrival (ease-out-back), for the distance-scaled duration so long
            // jumps glide instead of darting. While resizing: 0ms = track instantly
            // so the indicator doesn't wobble during a drag.
            transition: resizing
              ? "left 0ms linear, top 0ms linear, width 0ms linear, height 0ms linear"
              : `left ${ind.duration}ms cubic-bezier(0.34,1.5,0.64,1), top ${ind.duration}ms cubic-bezier(0.34,1.5,0.64,1), width ${Math.round(ind.duration * 0.82)}ms cubic-bezier(0.22,1,0.36,1), height ${Math.round(ind.duration * 0.82)}ms cubic-bezier(0.22,1,0.36,1)`,
            pointerEvents: "none",
            zIndex: 0,
          }}
        />
      )}
      {tabs.map((tab, index) => {
        const isActive = tab.id === activeTab;
        const nextTab = tabs[index + 1];
        const showDivider = tab.isHub && nextTab && !nextTab.isHub;
        return (
          <div key={tab.id} style={{ display: "flex", alignItems: "stretch", flex: "1 1 auto" }}>
            <button
              ref={(el) => {
                if (el) tabRefs.current.set(tab.id, el);
                else tabRefs.current.delete(tab.id);
              }}
              role="tab"
              aria-selected={isActive}
              onClick={() => onTabChange(tab.id)}
              onMouseEnter={() => setHoveredId(tab.id)}
              style={{
                position: "relative",
                zIndex: 1,
                flex: 1,
                margin: 3,
                padding: "5px 4px",
                borderRadius: 9,
                background:
                  !isActive && hoveredId === tab.id
                    ? "rgba(255,255,255,0.4)"
                    : !isActive && tab.isHub
                    ? "rgba(255,255,255,0.55)"
                    : "transparent",
                border: "none",
                cursor: "pointer",
                fontSize: 10.5,
                fontWeight: isActive ? 700 : tab.isHub ? 600 : 500,
                color: isActive ? "#ffffff" : tab.isHub ? HUB_INK : INACTIVE_INK,
                letterSpacing: "0.005em",
                whiteSpace: "normal",
                textAlign: "center",
                lineHeight: 1.25,
                transition: "color 150ms, background 150ms",
                fontFamily: "inherit",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 4,
              }}
            >
              {tab.isHub && <HubGlyph active={isActive} />}
              <TabLabel label={tab.label} beta={tab.beta} active={isActive} />
              {tab.loading && (
                <span
                  style={{
                    width: 5,
                    height: 5,
                    borderRadius: "50%",
                    background: "#ffffff",
                    boxShadow: "0 0 0 1px rgba(0,0,0,0.15)",
                    animation: "content-pulse 1.4s ease-in-out infinite",
                  }}
                />
              )}
              {typeof tab.badge === "number" && tab.badge > 0 && !tab.loading && (
                <span
                  style={{
                    fontSize: 9,
                    fontWeight: 700,
                    padding: "1px 5px",
                    borderRadius: 99,
                    background: isActive ? ACTIVE_INK : "rgba(0,0,0,0.16)",
                    color: isActive ? "#ffffff" : "rgba(0,0,0,0.7)",
                    minWidth: 16,
                    textAlign: "center",
                  }}
                >
                  {tab.badge}
                </span>
              )}
            </button>
            {showDivider && (
              <div
                aria-hidden="true"
                style={{
                  width: 1,
                  alignSelf: "center",
                  height: 16,
                  margin: "0 2px",
                  background: "rgba(0,0,0,0.18)",
                  zIndex: 1,
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
