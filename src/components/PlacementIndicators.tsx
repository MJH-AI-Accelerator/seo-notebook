"use client";

import { useState } from "react";
import type { KeywordPlacement } from "../lib/types";

interface PlacementIndicatorsProps {
  placement?: KeywordPlacement;
}

const indicators = [
  { key: "inBody" as const, letter: "B", tooltip: "Keyword in body" },
  { key: "inTitle" as const, letter: "T", tooltip: "Keyword in title" },
  { key: "inMetaDescription" as const, letter: "D", tooltip: "Keyword in meta description" },
  { key: "inImages" as const, letter: "I", tooltip: "Keyword in image names" },
  { key: "inUrl" as const, letter: "U", tooltip: "Keyword in URL" },
];

function IndicatorDot({ letter, active, tooltip }: { letter: string; active: boolean; tooltip: string }) {
  const [hovered, setHovered] = useState(false);

  return (
    <span
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: "relative",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: 16,
        height: 16,
        borderRadius: "50%",
        fontSize: 8,
        fontWeight: 700,
        lineHeight: 1,
        cursor: "default",
        flexShrink: 0,
        // Inactive = a solid WHITE disc (was a near-invisible faint-grey ring on
        // transparent) so each indicator reads clearly on the warm panel; a light
        // edge + soft lift keep it defined even on a white card. Active = green.
        background: active ? "#16a34a" : "#ffffff",
        color: active ? "#ffffff" : "#94a3b8",
        border: active ? "none" : "1.5px solid #cbd5e1",
        boxShadow: active ? "none" : "0 1px 2px rgba(0,0,0,0.07)",
        transition: "all 150ms",
      }}
    >
      {letter}
      {hovered && (
        <span style={{
          position: "absolute",
          bottom: "100%",
          left: "50%",
          transform: "translateX(-50%)",
          marginBottom: 4,
          padding: "2px 6px",
          borderRadius: 4,
          background: "#1f2937",
          color: "#ffffff",
          fontSize: 10,
          whiteSpace: "nowrap",
          pointerEvents: "none",
          zIndex: 10,
        }}>
          {tooltip}
        </span>
      )}
    </span>
  );
}

export function PlacementIndicators({ placement }: PlacementIndicatorsProps) {
  if (!placement) return null;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
      {indicators.map(({ key, letter, tooltip }) => (
        <IndicatorDot key={key} letter={letter} active={placement[key]} tooltip={tooltip} />
      ))}
    </div>
  );
}
