"use client";

import { PANEL_BG } from "./styles";
import type { TabId } from "../lib/types";

interface TabDef {
  id: TabId;
  label: string;
  loading?: boolean;
  badge?: number;
  /** When true, the tab is styled as a "hub" landmark (not the regular flow). */
  isHub?: boolean;
}

interface TabBarProps {
  tabs: TabDef[];
  activeTab: TabId;
  onTabChange: (id: TabId) => void;
}

// Tab-bar text colors are tuned for the PANEL_BG gold surface - translucent black
// reads as "ink on the gold" and stays legible where a light gray would wash out.
const ACTIVE_INK = "#1f2937";
const HUB_INK = "rgba(0,0,0,0.7)";
const INACTIVE_INK = "rgba(0,0,0,0.52)";

function HubGlyph({ active }: { active: boolean }) {
  // 4-cell grid icon - reads as "overview / dashboard" without being heavy-handed
  const fill = active ? ACTIVE_INK : HUB_INK;
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

export function TabBar({ tabs, activeTab, onTabChange }: TabBarProps) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "stretch",
        background: PANEL_BG,
        borderBottom: "1px solid rgba(0,0,0,0.14)",
        overflowX: "auto",
        overflowY: "hidden",
        flexShrink: 0,
      }}
      role="tablist"
    >
      {tabs.map((tab, index) => {
        const isActive = tab.id === activeTab;
        const nextTab = tabs[index + 1];
        // Visual separator: after a hub tab, before a non-hub tab
        const showDivider = tab.isHub && nextTab && !nextTab.isHub;
        return (
          <div key={tab.id} style={{ display: "flex", alignItems: "stretch" }}>
            <button
              role="tab"
              aria-selected={isActive}
              onClick={() => onTabChange(tab.id)}
              style={{
                position: "relative",
                padding: "8px 12px",
                background: tab.isHub && !isActive ? "rgba(255,255,255,0.22)" : "transparent",
                border: "none",
                cursor: "pointer",
                fontSize: 11,
                fontWeight: isActive ? 700 : tab.isHub ? 600 : 500,
                color: isActive ? ACTIVE_INK : tab.isHub ? HUB_INK : INACTIVE_INK,
                letterSpacing: "0.01em",
                whiteSpace: "nowrap",
                transition: "color 150ms, background 150ms",
                fontFamily: "inherit",
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              {tab.isHub && <HubGlyph active={isActive} />}
              <span>{tab.label}</span>
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
              {isActive && (
                <span
                  style={{
                    position: "absolute",
                    bottom: 0,
                    left: 8,
                    right: 8,
                    height: 2,
                    borderRadius: 1,
                    background: "#ffffff",
                  }}
                />
              )}
            </button>
            {showDivider && (
              <div
                aria-hidden="true"
                style={{
                  width: 1,
                  alignSelf: "center",
                  height: 18,
                  margin: "0 4px",
                  background: "rgba(0,0,0,0.2)",
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
