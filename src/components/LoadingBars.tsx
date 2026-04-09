"use client";

import { MJH_GOLD } from "./styles";

export function LoadingBars({ size = "sm", color = MJH_GOLD }: { size?: "xs" | "sm"; color?: string }) {
  const barWidth = size === "xs" ? 4 : 6;
  const containerHeight = size === "xs" ? 10 : 14;

  return (
    <div style={{ display: "inline-flex", alignItems: "flex-end", gap: 2, height: containerHeight }}>
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          style={{
            width: barWidth,
            height: 8,
            borderRadius: 2,
            background: color,
            animation: `bar-shift-${i} 1.4s ease-in-out infinite`,
          }}
        />
      ))}
    </div>
  );
}
