// VPN restriction page shown when a request comes from a non-allowlisted IP.
// Self-contained (no external UI deps) so it renders even if the rest of the
// app's providers are unavailable. Server component — no client hooks.

export const dynamic = "force-static";

export default function Blocked() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        fontFamily:
          "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
        background: "#0b0b0f",
        color: "#e5e7eb",
      }}
    >
      <div style={{ maxWidth: 460, textAlign: "center" }}>
        <div style={{ fontSize: 40, marginBottom: 16 }} aria-hidden>
          🔒
        </div>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: "0 0 12px" }}>
          Connect to the MJH VPN
        </h1>
        <p style={{ fontSize: 15, lineHeight: 1.6, color: "#9ca3af", margin: "0 0 24px" }}>
          This tool is restricted to the MJH corporate network. Connect to the
          VPN (or an approved office location) and try again.
        </p>
        <a
          href="/"
          style={{
            display: "inline-block",
            padding: "10px 18px",
            borderRadius: 8,
            background: "#6366f1",
            color: "#fff",
            fontWeight: 600,
            textDecoration: "none",
          }}
        >
          Try again
        </a>
      </div>
    </main>
  );
}
