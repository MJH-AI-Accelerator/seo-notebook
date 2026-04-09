"use client";

import { MJH_BLUE } from "./styles";
import { PlacementIndicators } from "./PlacementIndicators";
import type { KeywordPlacement } from "../lib/types";

interface KeywordBadgeProps {
  term: string;
  volume?: number | null;
  type: "primary" | "supporting" | "missing";
  inContent?: boolean;
  placement?: KeywordPlacement;
}

const colorMap = {
  primary: { bg: "rgba(220,252,231,0.8)", text: "#166534" },
  supporting: { bg: "rgba(0,93,172,0.1)", text: MJH_BLUE },
  missing: { bg: "rgba(230,192,27,0.15)", text: "#8B7310" },
};

function formatVolume(volume: number | null | undefined): string {
  if (volume === null || volume === undefined) return "";
  if (volume === 0) return "N/A";
  return volume.toLocaleString();
}

export function KeywordBadge({ term, volume, type, placement }: KeywordBadgeProps) {
  const colors = colorMap[type];
  const volumeStr = formatVolume(volume);

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "2px 0", flexWrap: "wrap" }}>
      <span
        style={{
          borderRadius: 99,
          padding: "2px 10px",
          fontSize: 12,
          fontWeight: 500,
          whiteSpace: "nowrap",
          background: colors.bg,
          color: colors.text,
        }}
      >
        {term}
      </span>
      {volumeStr && (
        <span style={{ fontSize: 12, color: "#9ca3af" }}>{volumeStr === "N/A" ? volumeStr : `${volumeStr}/mo`}</span>
      )}
      <PlacementIndicators placement={placement} />
    </div>
  );
}
