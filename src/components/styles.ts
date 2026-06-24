export const INJECTED_CSS = `
@keyframes bar-shift-1 {
  0%, 100% { height: 8px; }
  25% { height: 14px; }
  50% { height: 6px; }
  75% { height: 12px; }
}
@keyframes bar-shift-2 {
  0%, 100% { height: 12px; }
  25% { height: 6px; }
  50% { height: 14px; }
  75% { height: 8px; }
}
@keyframes bar-shift-3 {
  0%, 100% { height: 6px; }
  25% { height: 10px; }
  50% { height: 12px; }
  75% { height: 5px; }
}
@keyframes fade-up {
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
@keyframes content-pulse {
  0%, 100% { opacity: 0.5; }
  50% { opacity: 1; }
}
@keyframes onboard-in {
  from { opacity: 0; transform: translateY(-6px) scale(0.97); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}
@keyframes onboard-out {
  from { opacity: 1; transform: translateY(0) scale(1); }
  to { opacity: 0; transform: translateY(-6px) scale(0.97); }
}
@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}
@keyframes scale-in {
  from { opacity: 0; transform: scale(0.95); }
  to { opacity: 1; transform: scale(1); }
}
@keyframes seo-copilot-sec-float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-1.5px); }
}
@media (prefers-reduced-motion: reduce) {
  .seo-copilot-sec-circle { animation: none !important; }
}
.prose-chat { font-size: 12.5px; line-height: 1.65; color: #475569; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif; }
.prose-chat h1 { font-size: 14px; font-weight: 700; color: #1e293b; margin: 10px 0 5px 0; line-height: 1.35; }
.prose-chat h2, .prose-chat h3 { font-size: 13px; font-weight: 700; color: #1e293b; margin: 10px 0 5px 0; line-height: 1.35; }
.prose-chat p { margin: 5px 0; }
.prose-chat ul, .prose-chat ol { margin: 5px 0; padding-left: 18px; }
.prose-chat li { margin: 3px 0; }
.prose-chat strong { font-weight: 600; color: #1e293b; }
.prose-chat hr { border: none; border-top: 1px solid #f1f5f9; margin: 10px 0; }
.prose-chat code { background: #f8fafc; padding: 2px 5px; border-radius: 4px; font-size: 11px; border: 1px solid #f1f5f9; }
.prose-chat a { color: #005DAC; text-decoration: none; border-bottom: 1px solid rgba(0,93,172,0.3); }
.prose-chat a:hover { border-bottom-color: #005DAC; }
.prose-chat table { width: 100%; border-collapse: separate; border-spacing: 0; margin: 8px 0; font-size: 11px; border-radius: 8px; overflow: hidden; border: 1px solid #f1f5f9; }
.prose-chat th { text-align: left; padding: 6px 10px; font-weight: 600; color: #475569; border-bottom: 1px solid #f1f5f9; background: #fafbfc; }
.prose-chat td { padding: 6px 10px; border-bottom: 1px solid #f8fafc; color: #64748b; }
.prose-chat tr:last-child td { border-bottom: none; }

/* Panel surface - a pale warm-gold base (PANEL_BG, set inline) lifted with a premium
   sheen: a soft top-down light pool, a faint warm radial bloom near the top edge, and
   a whisper of fine grain so the surface reads as a polished material, not a flat fill.
   The solid color is set inline (backgroundColor) so this image layer is never reset. */
.seo-copilot-panel {
  background-image:
    linear-gradient(180deg, rgba(255,255,255,0.78) 0%, rgba(255,255,255,0.22) 150px, rgba(255,255,255,0) 340px),
    radial-gradient(ellipse 130% 48% at 50% -6%, rgba(255,253,244,0.9) 0%, rgba(255,253,244,0) 62%),
    url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='nz' x='0' y='0'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='160' height='160' filter='url(%23nz)' opacity='0.025'/%3E%3C/svg%3E");
  background-size: 100% 100%, 100% 100%, 140px 140px;
  background-repeat: no-repeat, no-repeat, repeat;
  background-position: center top, center top, center;
}

.seo-copilot-panel { scrollbar-width: thin; scrollbar-color: #e5e7eb transparent; }
.seo-copilot-panel ::-webkit-scrollbar { width: 4px; }
.seo-copilot-panel ::-webkit-scrollbar-track { background: transparent; }
.seo-copilot-panel ::-webkit-scrollbar-thumb { background: #e5e7eb; border-radius: 4px; }
.seo-copilot-panel *  { scrollbar-width: thin; scrollbar-color: #e5e7eb transparent; }

/* Touch-friendly tap targets */
@media (max-width: 768px) {
  .seo-copilot-panel button { min-height: 36px; }
  .seo-copilot-panel input, .seo-copilot-panel textarea { font-size: 16px !important; }
}

/* Smooth transitions globally */
.seo-copilot-panel * { -webkit-tap-highlight-color: transparent; }

/* Deep-link highlight flash - triggered when jumping from the Summary tab to a card */
@keyframes seo-copilot-flash {
  0%   { box-shadow: 0 0 0 2px rgba(230,192,27,0), 0 0 0 6px rgba(230,192,27,0); }
  15%  { box-shadow: 0 0 0 2px rgba(230,192,27,0.9), 0 0 0 6px rgba(230,192,27,0.22); }
  100% { box-shadow: 0 0 0 2px rgba(230,192,27,0), 0 0 0 6px rgba(230,192,27,0); }
}
.seo-copilot-flash { animation: seo-copilot-flash 1.3s ease-out; border-radius: 14px; }

/* Visible focus ring for keyboard nav - browser defaults wash out on this background */
.seo-copilot-panel button:focus-visible,
.seo-copilot-panel [role="tab"]:focus-visible,
.seo-copilot-panel a:focus-visible,
.seo-copilot-panel input:focus-visible,
.seo-copilot-panel textarea:focus-visible {
  outline: 2px solid #005DAC;
  outline-offset: 2px;
  border-radius: 4px;
}

/* Respect reduced-motion preferences */
@media (prefers-reduced-motion: reduce) {
  .seo-copilot-panel *, .seo-copilot-flash {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
  .seo-copilot-flash {
    animation: none !important;
    box-shadow: 0 0 0 2px rgba(230,192,27,0.9) !important;
  }
}
`;

export const MJH_GOLD = "#E6C01B";
export const MJH_GOLD_DARK = "#C9A716";
export const MJH_BLUE = "#005DAC";
export const MJH_SLATE = "#4D596A";
export const USER_BLUE = "#DFF4FD";
export const USER_BLUE_BORDER = "#B8E3F9";
export const AEO_PURPLE = "#005DAC"; // MJH_BLUE - AEO/GEO folded into the brand palette for cohesion
// Panel surface fill - a pale warm-gold base behind the white content cards.
// Light enough that the white cards read as raised; the sheen/grain is layered
// on via the .seo-copilot-panel rule in INJECTED_CSS.
export const PANEL_BG = "#F3EAD2";

// Chat zone backdrop - the AI conversation zone. A cool, subtly multi-shaded
// MJH-blue wash with a soft glow rising from the composer; sets the chat apart
// from the gold analysis zone and reads "AI". ONE token so the collapse/expand
// toggle bar, the messages, and the composer all share a single continuous
// gradient (the toggle is part of the chat zone, not the gold panel).
export const CHAT_ZONE_BG =
  "radial-gradient(120% 90% at 50% 106%, rgba(0,93,172,0.22), rgba(0,93,172,0) 62%), linear-gradient(180deg, #EAF2FA 0%, #DCEAF7 50%, #CFE2F4 100%)";

// Recommendations zone backdrop - mirrors the chat gradient's STRUCTURE in the
// warm GOLD family (analysis / copilot identity). A soft gold bloom near the top
// echoes the chat's bottom glow, giving the recommendations the same gradient
// depth without crossing into the blue chat zone. Gold above, blue below; the
// toggle bar is the seam between the two zones.
export const RECS_ZONE_BG =
  "radial-gradient(120% 90% at 50% -8%, rgba(230,192,27,0.26), rgba(230,192,27,0) 60%), linear-gradient(180deg, #FBF4DD 0%, #F0E1B4 52%, #E5D096 100%)";
