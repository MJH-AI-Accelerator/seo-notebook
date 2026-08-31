"use client";

import { useState, useRef, useEffect } from "react";
import { useConfig } from "./ConfigContext";
import { submitFeedback } from "../lib/api";
import { MJH_BLUE } from "./styles";

interface ReportProblemButtonProps {
  activeTab?: string;
  documentId?: string;
  primaryKeyword?: string;
}

// Header "Report a problem" affordance. Opens a small message box AND captures
// structured context (which surface + tab was open, the doc + keyword, the URL, the
// user agent) so we can debug issues, not just read the written note. Posts to the
// shared /feedback endpoint as suggestion_type "bug_report". Never throws into the UI.
export function ReportProblemButton({ activeTab, documentId, primaryKeyword }: ReportProblemButtonProps) {
  const { apiUrl, publication } = useConfig();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [failed, setFailed] = useState(false);
  const popRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mounted = useRef(true);

  useEffect(() => () => { mounted.current = false; if (closeTimer.current) clearTimeout(closeTimer.current); }, []);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (popRef.current && !popRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  useEffect(() => {
    if (open) setTimeout(() => textareaRef.current?.focus(), 50);
  }, [open]);

  const handleSubmit = async () => {
    const trimmed = text.trim();
    if (!trimmed || submitting) return;
    setFailed(false);
    setSubmitting(true);
    try {
      await submitFeedback(apiUrl, {
        suggestion_type: "bug_report",
        suggestion_text: trimmed.slice(0, 10000),
        vote: "down",
        document_id: documentId,
        publication,
        context: {
          surface: "seo-notebook",
          activeTab,
          primaryKeyword: primaryKeyword || undefined,
          url: typeof window !== "undefined" && /^https?:\/\//i.test(window.location.href) ? window.location.href.slice(0, 500) : undefined,
          userAgent: typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 500) : undefined,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (e) {
      // Show a real error + keep the box open so the report isn't silently lost. Log it too.
      console.error("[SEO Copilot] failed to send problem report:", e);
      if (mounted.current) { setSubmitting(false); setFailed(true); }
      return;
    }
    if (!mounted.current) return;
    setSubmitting(false);
    setSubmitted(true);
    closeTimer.current = setTimeout(() => {
      if (!mounted.current) return;
      setOpen(false);
      setSubmitted(false);
      setText("");
    }, 1500);
  };

  return (
    <div style={{ position: "relative", display: "flex" }}>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); if (closeTimer.current) { clearTimeout(closeTimer.current); closeTimer.current = null; } setOpen((o) => !o); }}
        aria-label="Report a problem"
        title="Report a problem"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
          padding: "3px 8px",
          borderRadius: 99,
          border: `1px solid ${open ? MJH_BLUE : "#d1d5db"}`,
          background: open ? "rgba(0,93,172,0.08)" : "rgba(255,255,255,0.6)",
          cursor: "pointer",
          fontSize: 10,
          fontWeight: 600,
          color: open ? MJH_BLUE : "#6b7280",
          whiteSpace: "nowrap",
          transition: "all 150ms",
        }}
      >
        <svg width="11" height="11" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path d="M3 2.75a.75.75 0 00-1.5 0v14.5a.75.75 0 001.5 0v-4.392l1.657-.348a6.449 6.449 0 014.271.572 7.948 7.948 0 005.965.524l2.078-.64A.75.75 0 0017.5 12.25v-8.5a.75.75 0 00-.904-.734l-1.74.348a7.948 7.948 0 01-5.965-.524 6.449 6.449 0 00-4.271-.572L3 2.842V2.75z" />
        </svg>
        Report a problem
      </button>

      {open && (
        <div
          ref={popRef}
          style={{
            position: "absolute",
            top: "100%",
            right: 0,
            marginTop: 6,
            width: 260,
            padding: 12,
            borderRadius: 10,
            background: "#ffffff",
            boxShadow: "0 6px 22px rgba(0,0,0,0.16), 0 1px 4px rgba(0,0,0,0.1)",
            border: "1px solid #e5e7eb",
            zIndex: 100,
          }}
        >
          {submitted ? (
            <div style={{ fontSize: 12, color: "#16a34a", textAlign: "center", padding: "6px 0", fontWeight: 600 }}>
              Thanks - we got it.
            </div>
          ) : (
            <>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#1f2937", marginBottom: 3 }}>
                Report a problem
              </div>
              <div style={{ fontSize: 10.5, color: "#6b7280", marginBottom: 8, lineHeight: 1.45 }}>
                Beta - tell us what went wrong. We also note which tab you&apos;re on to help us track it down.
              </div>
              {failed && (
                <div style={{ fontSize: 10.5, color: "#dc2626", marginBottom: 8, lineHeight: 1.45, fontWeight: 600 }}>
                  Couldn&apos;t send - please try again.
                </div>
              )}
              <textarea
                ref={textareaRef}
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); handleSubmit(); }
                }}
                placeholder="What happened? The more detail, the better."
                rows={4}
                maxLength={4000}
                style={{
                  width: "100%",
                  padding: "6px 8px",
                  fontSize: 11,
                  borderRadius: 6,
                  border: "1px solid #e5e7eb",
                  outline: "none",
                  fontFamily: "inherit",
                  resize: "vertical",
                  boxSizing: "border-box",
                  lineHeight: 1.5,
                }}
              />
              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8, gap: 6 }}>
                <button
                  type="button"
                  onClick={() => { setOpen(false); setText(""); }}
                  style={{
                    padding: "4px 10px", fontSize: 10.5, borderRadius: 5,
                    border: "1px solid #e5e7eb", background: "#ffffff", color: "#4b5563",
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={!text.trim() || submitting}
                  style={{
                    padding: "4px 12px", fontSize: 10.5, borderRadius: 5,
                    border: "none",
                    background: !text.trim() || submitting ? "#cbd5e1" : MJH_BLUE,
                    color: "#ffffff",
                    cursor: !text.trim() || submitting ? "default" : "pointer",
                    fontWeight: 700,
                  }}
                >
                  {submitting ? "Sending..." : "Send"}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
