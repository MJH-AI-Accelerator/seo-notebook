// ShimmerLoader - pulsating MJH-bar loader + rotating shimmer text.
// The three bars echo the MJH logo (shifting heights) and animate via the
// bar-shift keyframes injected globally by SEONotebookPanel's INJECTED_CSS.
// The text uses a scoped shimmer keyframe injected once on first mount.

import { useEffect, useState } from "react";
import { MJH_GOLD } from "./styles";

let keyframesInjected = false;

const KEYFRAMES = `
@keyframes seo-copilot-text-shimmer {
  0%   { background-position: -100% center; }
  100% { background-position: 100% center; }
}
`;

interface LoaderBarsProps {
  color?: string;
}

// Three gold bars that shift height - the MJH "pulsating bars" loader.
function LoaderBars({ color = MJH_GOLD }: LoaderBarsProps) {
  return (
    <div
      role="status"
      aria-label="Loading"
      style={{ display: "inline-flex", alignItems: "flex-end", gap: 2, height: 14, flexShrink: 0 }}
    >
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          style={{
            width: 6,
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

interface ShimmerLoaderProps {
  messages: string[];
  intervalMs?: number;
  textSize?: number;
  iconColor?: string;
}

export function ShimmerLoader({
  messages,
  intervalMs = 1500,
  textSize = 14,
  iconColor = MJH_GOLD,
}: ShimmerLoaderProps) {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    if (typeof window !== "undefined" && !keyframesInjected) {
      keyframesInjected = true;
      const style = document.createElement("style");
      style.dataset.seoCopilotKeyframes = "1";
      style.innerHTML = KEYFRAMES;
      document.head.appendChild(style);
    }
  }, []);

  useEffect(() => {
    if (messages.length <= 1) return;
    const id = setInterval(() => {
      setIdx((i) => (i + 1) % messages.length);
    }, intervalMs);
    return () => clearInterval(id);
  }, [messages.length, intervalMs]);

  const text = messages[idx] || messages[0] || "";

  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        fontSize: textSize,
        fontWeight: 500,
        letterSpacing: "0.01em",
      }}
    >
      <LoaderBars color={iconColor} />
      <span
        style={{
          backgroundImage:
            "linear-gradient(90deg, rgb(113 113 122) 0%, rgb(113 113 122) 40%, rgb(24 24 27) 50%, rgb(113 113 122) 60%, rgb(113 113 122) 100%)",
          backgroundSize: "200% auto",
          backgroundClip: "text",
          WebkitBackgroundClip: "text",
          color: "transparent",
          animation: "seo-copilot-text-shimmer 2s ease-in-out infinite",
        }}
      >
        {text}
      </span>
    </div>
  );
}

export const DEFAULT_GENERATE_ALL_MESSAGES = [
  "Processing",
  "Gathering keyword data",
  "Running deep analysis",
  "Scanning for AEO opportunities",
  "Finding internal links",
  "Auditing meta and structure",
  "Cross-checking score components",
  "Compiling summary",
];
