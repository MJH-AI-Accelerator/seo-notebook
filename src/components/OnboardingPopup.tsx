import { MJH_BLUE } from "./styles";

// Small (i) button that lives in the panel header next to the pop-out control. The
// first-run popup collapses into this; clicking it re-opens the popup.
export function OnboardingInfoButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      onMouseDown={(e) => e.stopPropagation()}
      style={{
        background: "rgba(0,93,172,0.08)",
        border: "none",
        borderRadius: "50%",
        width: 20,
        height: 20,
        cursor: "pointer",
        padding: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: MJH_BLUE,
        flexShrink: 0,
      }}
      title="How SEO Copilot works"
      aria-label="How SEO Copilot works"
    >
      <svg width="13" height="13" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z" clipRule="evenodd" />
      </svg>
    </button>
  );
}

// First-run onboarding popup. Amorphous MJH-blue glass. Clicking anywhere on the
// dimmed backdrop, the X, or "Got it" dismisses it (fades out to the info icon).
export function OnboardingCard({ onDismiss, closing }: { onDismiss: () => void; closing: boolean }) {
  return (
    <>
      {/* Click-anywhere backdrop - very light so it doesn't feel like a hard modal. */}
      <div
        onClick={onDismiss}
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 60,
          background: "transparent",
          cursor: "pointer",
        }}
      />
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: "absolute",
          top: 50,
          right: 10,
          left: 10,
          maxWidth: 320,
          marginLeft: "auto",
          zIndex: 61,
          borderRadius: 18,
          padding: "14px 16px 16px",
          // Amorphous blue glass
          background: "linear-gradient(155deg, rgba(0,93,172,0.16), rgba(0,93,172,0.08))",
          backdropFilter: "blur(20px) saturate(170%)",
          WebkitBackdropFilter: "blur(20px) saturate(170%)",
          boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.55), inset 1.5px 2px 1px -1px rgba(255,255,255,0.9), 0 10px 30px rgba(0,93,172,0.22), 0 2px 8px rgba(0,0,0,0.12)",
          animation: `${closing ? "onboard-out" : "onboard-in"} ${closing ? 180 : 240}ms ease-out forwards`,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 6 }}>
          <span style={{ fontSize: 13, fontWeight: 800, color: "#00468a", letterSpacing: "-0.01em" }}>
            Welcome to SEO Copilot
          </span>
          <button
            onClick={onDismiss}
            style={{ background: "none", border: "none", cursor: "pointer", padding: 2, display: "flex", color: "#00468a", opacity: 0.7 }}
            title="Dismiss"
            aria-label="Dismiss"
          >
            <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor">
              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
            </svg>
          </button>
        </div>
        <div style={{ fontSize: 11.5, color: "#13335a", lineHeight: 1.6 }}>
          Start on the <strong>Keywords</strong> tab. Choose one <strong>Primary</strong> keyword (required) and, optionally, one <strong>Secondary</strong> keyword. Copilot then optimizes the whole article - title, meta, URL, headings, and images - toward both.
        </div>
        <button
          onClick={onDismiss}
          style={{
            marginTop: 12,
            width: "100%",
            padding: "7px 12px",
            fontSize: 11.5,
            fontWeight: 700,
            color: "#ffffff",
            background: MJH_BLUE,
            border: "none",
            borderRadius: 8,
            cursor: "pointer",
          }}
        >
          Got it
        </button>
      </div>
    </>
  );
}
