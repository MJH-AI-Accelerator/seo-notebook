"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { ConfigProvider } from "./components/ConfigContext";
import { WordEditor } from "./components/WordEditor";
import { SEONotebookPanel } from "./components/SEONotebookPanel";
import { MJH_GOLD } from "./components/styles";
import type { DocumentFields } from "./lib/types";

const API_URL = process.env.NODE_ENV === "development" ? "http://localhost:3000" : "https://ecaruso.vercel.app";
const DOCUMENT_ID = "seo-notebook-local";

const MJH_PUBLICATIONS = [
  "Pharmacy Times",
  "Dermatology Times",
  "Cardiology Times",
  "Ophthalmology Times",
  "Optometry Times",
  "Urology Times",
  "Medical Economics",
  "Psychiatric Times",
  "Contemporary Aesthetics",
];

function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia(query).matches : false
  );
  useEffect(() => {
    const mq = window.matchMedia(query);
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [query]);
  return matches;
}

function InstallBanner({ onInstall, onDismiss }: { onInstall: () => void; onDismiss: () => void }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 10, padding: "8px 16px",
      background: "linear-gradient(135deg, #FEF9E7 0%, #FFF8E1 100%)",
      borderBottom: "1px solid #FDE68A", fontSize: 13,
    }}>
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
        <rect x="1" y="3" width="4" height="10" rx="1" fill={MJH_GOLD} opacity="1" />
        <rect x="6" y="1" width="4" height="14" rx="1" fill={MJH_GOLD} opacity="0.85" />
        <rect x="11" y="5" width="4" height="8" rx="1" fill={MJH_GOLD} opacity="0.6" />
      </svg>
      <span style={{ flex: 1, color: "#92400E" }}>
        Install SEO Notebook for quick access from your home screen
      </span>
      <button
        onClick={onInstall}
        style={{
          padding: "4px 12px", fontSize: 12, fontWeight: 600, borderRadius: 6,
          background: MJH_GOLD, color: "#fff", border: "none", cursor: "pointer",
        }}
      >
        Install
      </button>
      <button
        onClick={onDismiss}
        style={{ background: "none", border: "none", cursor: "pointer", color: "#9ca3af", fontSize: 16, padding: 2 }}
      >
        x
      </button>
    </div>
  );
}

function App() {
  const [text, setText] = useState("");
  const [documentFields, setDocumentFields] = useState<DocumentFields>({});
  const [publication, setPublication] = useState<string | undefined>(undefined);
  const isMobile = useMediaQuery("(max-width: 768px)");
  const [mobileTab, setMobileTab] = useState<"editor" | "seo">("editor");

  // PWA install prompt
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const deferredPrompt = useRef<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      deferredPrompt.current = e as BeforeInstallPromptEvent;
      const dismissed = localStorage.getItem("seo-notebook-install-dismissed");
      if (!dismissed) setShowInstallBanner(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = useCallback(() => {
    if (deferredPrompt.current) {
      deferredPrompt.current.prompt();
      deferredPrompt.current.userChoice.then(() => {
        deferredPrompt.current = null;
        setShowInstallBanner(false);
      });
    }
  }, []);

  // Draggable divider for left/right split (desktop only)
  const [panelWidth, setPanelWidth] = useState(400);
  const dragging = useRef(false);
  const dragStartX = useRef(0);
  const dragStartWidth = useRef(0);

  const onDividerMouseDown = useCallback((e: React.MouseEvent) => {
    dragging.current = true;
    dragStartX.current = e.clientX;
    dragStartWidth.current = panelWidth;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    const onMouseMove = (ev: MouseEvent) => {
      if (!dragging.current) return;
      const delta = dragStartX.current - ev.clientX;
      setPanelWidth(Math.min(600, Math.max(320, dragStartWidth.current + delta)));
    };
    const onMouseUp = () => {
      dragging.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  }, [panelWidth]);

  const handleContentChange = useCallback((newText: string, fields: DocumentFields) => {
    setText(newText);
    setDocumentFields(fields);
  }, []);

  const dismissInstall = useCallback(() => {
    setShowInstallBanner(false);
    localStorage.setItem("seo-notebook-install-dismissed", "1");
  }, []);

  // Mobile layout
  if (isMobile) {
    return (
      <ConfigProvider config={{ apiUrl: API_URL, publication }}>
        <div style={{ display: "flex", flexDirection: "column", height: "100dvh", overflow: "hidden" }}>
          {showInstallBanner && <InstallBanner onInstall={handleInstall} onDismiss={dismissInstall} />}

          {/* Mobile tab bar */}
          <div style={{
            display: "flex", background: "#ffffff", borderBottom: "1px solid #e5e7eb",
            flexShrink: 0, position: "relative", zIndex: 10,
          }}>
            <button
              onClick={() => setMobileTab("editor")}
              style={{
                flex: 1, padding: "10px 0", fontSize: 13, fontWeight: 600, border: "none",
                cursor: "pointer", transition: "all 150ms",
                background: mobileTab === "editor" ? "#ffffff" : "#f9fafb",
                color: mobileTab === "editor" ? "#1f2937" : "#9ca3af",
                borderBottom: mobileTab === "editor" ? `2px solid ${MJH_GOLD}` : "2px solid transparent",
              }}
            >
              <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.5 2A1.5 1.5 0 003 3.5v13A1.5 1.5 0 004.5 18h11a1.5 1.5 0 001.5-1.5V7.621a1.5 1.5 0 00-.44-1.06l-4.12-4.122A1.5 1.5 0 0011.378 2H4.5z" clipRule="evenodd" />
                </svg>
                Editor
              </span>
            </button>
            <button
              onClick={() => setMobileTab("seo")}
              style={{
                flex: 1, padding: "10px 0", fontSize: 13, fontWeight: 600, border: "none",
                cursor: "pointer", transition: "all 150ms",
                background: mobileTab === "seo" ? "#ffffff" : "#f9fafb",
                color: mobileTab === "seo" ? "#1f2937" : "#9ca3af",
                borderBottom: mobileTab === "seo" ? `2px solid ${MJH_GOLD}` : "2px solid transparent",
              }}
            >
              <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                  <rect x="1" y="3" width="4" height="10" rx="1" fill={mobileTab === "seo" ? MJH_GOLD : "currentColor"} opacity={mobileTab === "seo" ? "1" : "0.5"} />
                  <rect x="6" y="1" width="4" height="14" rx="1" fill={mobileTab === "seo" ? MJH_GOLD : "currentColor"} opacity={mobileTab === "seo" ? "0.85" : "0.4"} />
                  <rect x="11" y="5" width="4" height="8" rx="1" fill={mobileTab === "seo" ? MJH_GOLD : "currentColor"} opacity={mobileTab === "seo" ? "0.6" : "0.3"} />
                </svg>
                SEO Panel
              </span>
            </button>
          </div>

          {/* Publication selector - mobile */}
          <div style={{
            display: "flex", alignItems: "center", gap: 8, padding: "6px 12px",
            background: "#fafbfc", borderBottom: "1px solid #f3f4f6", flexShrink: 0,
          }}>
            <span style={{ fontSize: 10, color: "#9ca3af", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>Publication:</span>
            <select
              value={publication || ""}
              onChange={(e) => setPublication(e.target.value || undefined)}
              style={{
                flex: 1, fontSize: 12, padding: "4px 8px", border: "1px solid #e5e7eb",
                borderRadius: 6, background: "#ffffff", color: "#374151", outline: "none",
              }}
            >
              <option value="">All / General</option>
              {MJH_PUBLICATIONS.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>

          {/* Content */}
          <div style={{ flex: 1, overflow: "hidden" }}>
            <div style={{ display: mobileTab === "editor" ? "flex" : "none", flexDirection: "column", height: "100%" }}>
              <WordEditor onContentChange={handleContentChange} />
            </div>
            <div style={{ display: mobileTab === "seo" ? "flex" : "none", flexDirection: "column", height: "100%" }}>
              <SEONotebookPanel text={text} documentFields={documentFields} documentId={DOCUMENT_ID} />
            </div>
          </div>
        </div>
      </ConfigProvider>
    );
  }

  // Desktop layout
  return (
    <ConfigProvider config={{ apiUrl: API_URL, publication }}>
      <div style={{ display: "flex", flexDirection: "column", height: "100vh", overflow: "hidden" }}>
        {showInstallBanner && <InstallBanner onInstall={handleInstall} onDismiss={dismissInstall} />}

        {/* Publication selector bar - desktop */}
        <div style={{
          display: "flex", alignItems: "center", gap: 12, padding: "5px 16px",
          background: "#ffffff", borderBottom: "1px solid #f0f0f0", flexShrink: 0,
        }}>
          <span style={{ fontSize: 10, color: "#9ca3af", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>Publication:</span>
          <select
            value={publication || ""}
            onChange={(e) => setPublication(e.target.value || undefined)}
            style={{
              fontSize: 12, padding: "3px 8px", border: "1px solid #e5e7eb",
              borderRadius: 6, background: "#ffffff", color: "#374151", outline: "none",
              cursor: "pointer",
            }}
          >
            <option value="">All / General</option>
            {MJH_PUBLICATIONS.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>

        {/* Main content */}
        <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
          {/* Left: Word-like Editor */}
          <div style={{ flex: 1, minWidth: 0, overflow: "hidden" }}>
            <WordEditor onContentChange={handleContentChange} />
          </div>

          {/* Draggable Divider */}
          <div
            onMouseDown={onDividerMouseDown}
            style={{
              width: 6, cursor: "col-resize", background: "#e5e7eb", flexShrink: 0,
              display: "flex", alignItems: "center", justifyContent: "center",
              transition: "background 150ms",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#d1d5db")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "#e5e7eb")}
          >
            <div style={{ width: 2, height: 32, borderRadius: 1, background: "#9ca3af" }} />
          </div>

          {/* Right: SEO Notebook Panel */}
          <div style={{ width: panelWidth, flexShrink: 0, overflow: "hidden", borderLeft: "1px solid #e5e7eb" }}>
            <SEONotebookPanel text={text} documentFields={documentFields} documentId={DOCUMENT_ID} />
          </div>
        </div>
      </div>
    </ConfigProvider>
  );
}

// Type for BeforeInstallPromptEvent
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default App;
