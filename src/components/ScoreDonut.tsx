// Hand-rolled SVG donut showing how topic / freshness / section-fit each contributed
// to a Linking suggestion's composite score. Inline-styled - works inside Sanity Studio sandbox.
// Hover the donut for the raw sub-scores (the surest way to read tiny segments).

import { useState } from "react";
import { MJH_BLUE, MJH_GOLD } from "./styles";

interface ScoreDonutProps {
  size?: number;
  strokeWidth?: number;
  topic: number;
  freshness: number;
  sectionFit: number;
  /** Pre-computed composite (0-100). If omitted, computed from defaults 60/25/15. */
  composite?: number;
}

const W = { topic: 0.6, freshness: 0.25, sectionFit: 0.15 } as const;
// Colorblind-safe trio: blue + gold + purple. Green was dropped - blue+green fails
// for deuteranopia (~5% of men). Purple is distinct from both blue and gold under
// every common colorblindness simulation.
const COLORS = { topic: MJH_BLUE, freshness: MJH_GOLD, sectionFit: "#9B59B6" };
const TRACK = "#eef2f7";

export function ScoreDonut({
  size = 64,
  strokeWidth = 9,
  topic,
  freshness,
  sectionFit,
  composite,
}: ScoreDonutProps) {
  const [hovered, setHovered] = useState(false);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  // Weighted contributions (points the segment actually contributed to composite).
  const cTopic = topic * W.topic;
  const cFresh = freshness * W.freshness;
  const cSection = sectionFit * W.sectionFit;
  const compositeValue = composite != null ? composite : Math.round(cTopic + cFresh + cSection);

  // Each segment renders as a fraction of the full ring (weighted maxes sum to 100,
  // so a perfect 100 fills the donut).
  const seg = (contribution: number) => (contribution / 100) * circumference;
  // A small transparent gap between segments so adjacent colors don't bleed together.
  const GAP = Math.min(2.5, circumference * 0.02);
  const drawn = (fullLen: number) => (fullLen > 0 ? Math.max(0.75, fullLen - GAP) : 0);

  const topicLen = seg(cTopic);
  const freshLen = seg(cFresh);
  const sectionLen = seg(cSection);

  const Slice = ({ color, fullLen, offset }: { color: string; fullLen: number; offset: number }) => (
    <circle
      cx={size / 2}
      cy={size / 2}
      r={radius}
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="butt"
      strokeDasharray={`${drawn(fullLen)} ${circumference}`}
      strokeDashoffset={-offset}
    />
  );

  return (
    <div
      style={{ position: "relative", width: size, height: size, flexShrink: 0 }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={TRACK} strokeWidth={strokeWidth} />
        <Slice color={COLORS.topic} fullLen={topicLen} offset={0} />
        <Slice color={COLORS.freshness} fullLen={freshLen} offset={topicLen} />
        <Slice color={COLORS.sectionFit} fullLen={sectionLen} offset={topicLen + freshLen} />
      </svg>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: Math.max(11, size / 5.5),
          fontWeight: 700,
          color: "#1f2937",
          fontVariantNumeric: "tabular-nums",
          lineHeight: 1,
        }}
      >
        {compositeValue}
      </div>

      {hovered && (
        <div
          role="tooltip"
          style={{
            position: "absolute",
            left: "50%",
            top: -6,
            transform: "translate(-50%, -100%)",
            background: "#1f2937",
            color: "#ffffff",
            borderRadius: 8,
            padding: "7px 9px",
            fontSize: 10.5,
            lineHeight: 1.5,
            whiteSpace: "nowrap",
            boxShadow: "0 4px 14px rgba(0,0,0,0.25)",
            zIndex: 20,
            pointerEvents: "none",
          }}
        >
          <SubScoreRow color={COLORS.topic} label="Topic" value={topic} />
          <SubScoreRow color={COLORS.freshness} label="Freshness" value={freshness} />
          <SubScoreRow color={COLORS.sectionFit} label="Section fit" value={sectionFit} />
        </div>
      )}
    </div>
  );
}

function SubScoreRow({ color, label, value }: { color: string; label: string; value: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <span style={{ width: 7, height: 7, borderRadius: "50%", background: color, display: "inline-block", flexShrink: 0 }} />
      <span style={{ flex: 1 }}>{label}</span>
      <span style={{ fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{Math.round(value)}/100</span>
    </div>
  );
}

export function ScoreDonutLegend() {
  return (
    <div style={{ display: "flex", gap: 10, fontSize: 9, color: "rgba(0,0,0,0.55)", alignItems: "center", flexWrap: "wrap" }}>
      <LegendDot color={COLORS.topic} label="Topic 60%" />
      <LegendDot color={COLORS.freshness} label="Freshness 25%" />
      <LegendDot color={COLORS.sectionFit} label="Fit 15%" />
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
      <span style={{ width: 7, height: 7, borderRadius: "50%", background: color, display: "inline-block" }} />
      {label}
    </span>
  );
}
