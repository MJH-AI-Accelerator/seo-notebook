import { useState, useRef, useEffect } from "react";
import { useConfig } from "./ConfigContext";
import { submitFeedback } from "../lib/api";

interface FeedbackButtonProps {
  suggestionType: string;
  suggestionText: string;
  documentId?: string;
  publication?: string;
}

export function FeedbackButton({ suggestionType, suggestionText, documentId, publication }: FeedbackButtonProps) {
  const { apiUrl } = useConfig();
  const [vote, setVote] = useState<"up" | "down" | null>(null);
  const [showReasonPopup, setShowReasonPopup] = useState(false);
  const [reason, setReason] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const popupRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!showReasonPopup) return;
    const handler = (e: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        setShowReasonPopup(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showReasonPopup]);

  useEffect(() => {
    if (showReasonPopup) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [showReasonPopup]);

  const handleVote = async (v: "up" | "down") => {
    if (v === "down" && vote !== "down") {
      setVote("down");
      setShowReasonPopup(true);
      setSubmitted(false);
      try {
        await submitFeedback(apiUrl, {
          suggestion_type: suggestionType,
          suggestion_text: suggestionText,
          vote: "down",
          document_id: documentId,
          publication,
        });
      } catch { /* silent */ }
      return;
    }

    const newVote = vote === v ? null : v;
    setVote(newVote);
    setShowReasonPopup(false);
    if (newVote) {
      try {
        await submitFeedback(apiUrl, {
          suggestion_type: suggestionType,
          suggestion_text: suggestionText,
          vote: newVote,
          document_id: documentId,
          publication,
        });
      } catch { /* silent */ }
    }
  };

  const handleSubmitReason = async () => {
    const trimmed = reason.trim();
    if (trimmed) {
      try {
        await submitFeedback(apiUrl, {
          suggestion_type: suggestionType + "_reason",
          suggestion_text: suggestionText + " | REASON: " + trimmed,
          vote: "down",
          document_id: documentId,
          publication,
        });
      } catch { /* silent */ }
    }
    setSubmitted(true);
    setTimeout(() => {
      setShowReasonPopup(false);
      setReason("");
    }, 1000);
  };

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 2, flexShrink: 0, position: "relative" }}>
      <button
        onClick={() => handleVote("up")}
        style={{
          background: "none", border: "none", cursor: "pointer", padding: 1, fontSize: 12,
          color: vote === "up" ? "#16a34a" : "#d1d5db", transition: "color 150ms", lineHeight: 1, display: "flex",
        }}
        title="Good suggestion"
      >
        <svg width="12" height="12" viewBox="0 0 20 20" fill="currentColor">
          <path d="M1 8.25a1.25 1.25 0 112.5 0v7.5a1.25 1.25 0 11-2.5 0v-7.5zM11 3V1.7c0-.268.14-.526.395-.607A2 2 0 0114 3c0 .995-.182 1.948-.514 2.826-.204.54.166 1.174.744 1.174h2.52c1.243 0 2.261 1.01 2.146 2.247a23.864 23.864 0 01-1.341 5.974 1.637 1.637 0 01-1.555 1.029H6.5V7.5L11 3z" />
        </svg>
      </button>
      <button
        onClick={() => handleVote("down")}
        style={{
          background: "none", border: "none", cursor: "pointer", padding: 1, fontSize: 12,
          color: vote === "down" ? "#dc2626" : "#d1d5db", transition: "color 150ms", lineHeight: 1, display: "flex",
        }}
        title="Not helpful"
      >
        <svg width="12" height="12" viewBox="0 0 20 20" fill="currentColor">
          <path d="M19 11.75a1.25 1.25 0 11-2.5 0v-7.5a1.25 1.25 0 112.5 0v7.5zM9 17v1.3c0 .268-.14.526-.395.607A2 2 0 016 17c0-.995.182-1.948.514-2.826.204-.54-.166-1.174-.744-1.174H3.25c-1.243 0-2.261-1.01-2.146-2.247a23.864 23.864 0 011.341-5.974A1.637 1.637 0 014 3.75h9.5V12.5L9 17z" />
        </svg>
      </button>

      {showReasonPopup && (
        <div
          ref={popupRef}
          style={{
            position: "absolute", top: "100%", right: 0, marginTop: 4, width: 220, padding: 10,
            borderRadius: 10, background: "#ffffff",
            boxShadow: "0 4px 16px rgba(0,0,0,0.15), 0 1px 4px rgba(0,0,0,0.1)",
            zIndex: 100, border: "1px solid #e5e7eb",
          }}
        >
          {submitted ? (
            <div style={{ fontSize: 11, color: "#16a34a", textAlign: "center", padding: "4px 0" }}>
              Thanks for the feedback!
            </div>
          ) : (
            <>
              <div style={{ fontSize: 11, fontWeight: 600, color: "#374151", marginBottom: 6 }}>
                Sorry! What went wrong?
              </div>
              <input
                ref={inputRef}
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleSubmitReason(); }}
                placeholder="Tell us what to improve..."
                style={{
                  width: "100%", padding: "5px 8px", fontSize: 11, borderRadius: 6,
                  border: "1px solid #e5e7eb", outline: "none", fontFamily: "inherit", boxSizing: "border-box",
                }}
              />
              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 6, gap: 4 }}>
                <button
                  onClick={() => { setShowReasonPopup(false); setReason(""); }}
                  style={{
                    padding: "3px 8px", fontSize: 10, borderRadius: 4,
                    border: "1px solid #e5e7eb", background: "#ffffff", color: "#6b7280", cursor: "pointer",
                  }}
                >
                  Skip
                </button>
                <button
                  onClick={handleSubmitReason}
                  style={{
                    padding: "3px 8px", fontSize: 10, borderRadius: 4,
                    border: "none", background: "#dc2626", color: "#ffffff", cursor: "pointer", fontWeight: 600,
                  }}
                >
                  Submit
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
