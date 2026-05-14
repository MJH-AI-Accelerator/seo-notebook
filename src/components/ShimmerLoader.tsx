// ShimmerLoader - animated SVG path loader + rotating shimmer text.
// Adapted from 21st.dev's animated-loading-svg-text-shimmer. Stripped:
//   - default "Cooking" text (replaced with rotating professional messages)
//   - trailing ChevronRight icon
//   - Tailwind `cn` utility + dark-mode variants (plugin is light-mode)
// Inline styles + a scoped <style> for keyframes. Works inside the Sanity Studio sandbox.

import { useEffect, useRef, useState } from "react";

let cachedPathLength = 0;
let keyframesInjected = false;

const KEYFRAMES = `
@keyframes seo-copilot-draw-stroke {
  0%   { stroke-dashoffset: var(--path-length); animation-timing-function: ease-in-out; }
  50%  { stroke-dashoffset: 0; animation-timing-function: ease-in-out; }
  100% { stroke-dashoffset: calc(var(--path-length) * -1); }
}
@keyframes seo-copilot-text-shimmer {
  0%   { background-position: -100% center; }
  100% { background-position: 100% center; }
}
`;

interface LoaderIconProps {
  size?: number;
  strokeWidth?: number;
  color?: string;
}

function LoaderIcon({ size = 18, strokeWidth = 2.5, color = "#4D596A" }: LoaderIconProps) {
  const pathRef = useRef<SVGPathElement>(null);
  const [pathLength, setPathLength] = useState<number>(cachedPathLength);

  useEffect(() => {
    if (typeof window !== "undefined" && !keyframesInjected) {
      keyframesInjected = true;
      const style = document.createElement("style");
      style.dataset.seoCopilotKeyframes = "1";
      style.innerHTML = KEYFRAMES;
      document.head.appendChild(style);
    }
    if (!cachedPathLength && pathRef.current) {
      cachedPathLength = pathRef.current.getTotalLength();
      setPathLength(cachedPathLength);
    }
  }, []);

  const ready = pathLength > 0;
  return (
    <svg
      role="status"
      aria-label="Loading"
      viewBox="0 0 19 19"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      style={{ color, flexShrink: 0 }}
    >
      <path
        ref={pathRef}
        d="M4.43431 2.42415C-0.789139 6.90104 1.21472 15.2022 8.434 15.9242C15.5762 16.6384 18.8649 9.23035 15.9332 4.5183C14.1316 1.62255 8.43695 0.0528911 7.51841 3.33733C6.48107 7.04659 15.2699 15.0195 17.4343 16.9241"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        style={
          ready
            ? {
                strokeDasharray: pathLength,
                ["--path-length" as string]: pathLength,
                opacity: 1,
                animation: "seo-copilot-draw-stroke 2.5s infinite",
                transition: "opacity 300ms",
              } as React.CSSProperties
            : { opacity: 0, transition: "opacity 300ms" }
        }
      />
    </svg>
  );
}

interface ShimmerLoaderProps {
  messages: string[];
  intervalMs?: number;
  size?: number;
  textSize?: number;
  iconColor?: string;
}

export function ShimmerLoader({
  messages,
  intervalMs = 1500,
  size = 18,
  textSize = 14,
  iconColor = "#4D596A",
}: ShimmerLoaderProps) {
  const [idx, setIdx] = useState(0);

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
      <LoaderIcon size={size} color={iconColor} />
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
