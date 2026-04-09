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
        background: active ? "#16a34a" : "transparent",
        color: active ? "#ffffff" : "#d1d5db",
        border: active ? "none" : "1.5px solid #d1d5db",
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
