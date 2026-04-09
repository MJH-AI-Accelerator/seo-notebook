import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useSEOChat } from "../hooks/useSEOChat";
import { useConfig } from "./ConfigContext";
import { LoadingBars } from "./LoadingBars";
import { MJH_GOLD, MJH_BLUE, USER_BLUE, USER_BLUE_BORDER } from "./styles";

interface KeywordPanelData {
  primaryKeyword?: { term: string; volume: number | null };
  supportingKeywords?: { term: string; volume: number | null }[];
  missingKeywords?: { term: string; volume: number | null }[];
  aeoData?: {
    questionHeadings: { suggestedHeading: string; rationale: string }[];
    faqSuggestions: { question: string; answer: string }[];
  };
}

interface ChatPanelProps {
  text: string;
  publication?: string;
  keywordPanelData?: KeywordPanelData;
  documentId?: string;
}

const SUGGESTIONS = [
  "What keywords am I missing?",
  "How do I optimize for AEO?",
  "Chat about primary and supporting keywords",
  "What semantically related terms should I include?",
];

function LogoIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <rect x="1" y="3" width="4" height="10" rx="1" fill={MJH_GOLD} opacity="1" />
      <rect x="6" y="1" width="4" height="14" rx="1" fill={MJH_GOLD} opacity="0.85" />
      <rect x="11" y="5" width="4" height="8" rx="1" fill={MJH_GOLD} opacity="0.6" />
    </svg>
  );
}

export function ChatPanel({ text, publication, keywordPanelData, documentId }: ChatPanelProps) {
  const { apiUrl } = useConfig();
  const { messages, isStreaming, sendMessage, clearChat } = useSEOChat(apiUrl, text, publication, keywordPanelData, documentId);
  const [input, setInput] = useState("");
  const [inputFocused, setInputFocused] = useState(false);
  const [hoveredSuggestion, setHoveredSuggestion] = useState<number | null>(null);
  const [clearHovered, setClearHovered] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed || isStreaming) return;
    setInput("");
    sendMessage(trimmed);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const showTypingBars = isStreaming && (
    messages.length === 0 ||
    messages[messages.length - 1].role === "user" ||
    (messages[messages.length - 1].role === "assistant" && !messages[messages.length - 1].content)
  );

  return (
    <div style={{ position: "relative", flex: 1, minHeight: 0 }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, display: "flex", flexDirection: "column" }}>
        <div style={{ flex: 1, overflowY: "auto", padding: 12, minHeight: 0 }}>
          {messages.length === 0 && !isStreaming ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <LogoIcon />
                <span style={{ fontSize: 12, fontWeight: 600, color: "#6b7280" }}>
                  Welcome to SEO Notebook! Ask anything about your content.
                </span>
              </div>
              {SUGGESTIONS.map((s, i) => (
                <button
                  key={i}
                  onClick={() => sendMessage(s)}
                  onMouseEnter={() => setHoveredSuggestion(i)}
                  onMouseLeave={() => setHoveredSuggestion(null)}
                  style={{
                    width: "100%", textAlign: "left", padding: "10px 14px", borderRadius: 12,
                    fontSize: 12.5, color: "#475569",
                    background: hoveredSuggestion === i ? USER_BLUE : "#ffffff",
                    border: `1px solid ${hoveredSuggestion === i ? USER_BLUE_BORDER : "#f1f5f9"}`,
                    boxShadow: "0 1px 2px rgba(0,0,0,0.03)", cursor: "pointer", transition: "all 200ms ease",
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {messages.map((msg, i) => {
                if (msg.role === "assistant" && !msg.content) return null;
                return (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
                      animation: "fade-up 0.2s ease-out forwards",
                    }}
                  >
                    <div
                      style={{
                        maxWidth: "88%", padding: "10px 14px", fontSize: 12.5, lineHeight: 1.65, borderRadius: 18,
                        ...(msg.role === "user"
                          ? {
                              background: USER_BLUE, border: `1px solid ${USER_BLUE_BORDER}`,
                              boxShadow: "0 1px 3px rgba(0,93,172,0.08)", borderBottomRightRadius: 6, color: "#1e293b",
                            }
                          : {
                              background: "#ffffff", boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
                              borderBottomLeftRadius: 6, color: "#475569",
                            }),
                      }}
                    >
                      {msg.role === "assistant" ? (
                        <div className="prose-chat">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                        </div>
                      ) : (
                        <span style={{ whiteSpace: "pre-wrap" }}>{msg.content}</span>
                      )}
                      {isStreaming && i === messages.length - 1 && msg.role === "assistant" && msg.content && (
                        <span style={{ display: "inline-flex", alignItems: "flex-end", gap: 2, height: 10, marginLeft: 4, verticalAlign: "middle" }}>
                          {[1, 2, 3].map((n) => (
                            <span
                              key={n}
                              style={{
                                width: 2, height: 6, borderRadius: 1, background: MJH_GOLD,
                                animation: `bar-shift-${n} 1.4s ease-in-out infinite`,
                              }}
                            />
                          ))}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}

              {showTypingBars && (
                <div style={{ display: "flex", justifyContent: "flex-start" }}>
                  <div style={{
                    padding: 12, borderRadius: 16, borderBottomLeftRadius: 4,
                    background: "#ffffff", boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
                  }}>
                    <LoadingBars size="xs" />
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        <div style={{
          display: "flex", gap: 8, padding: 12, borderTop: "1px solid #f3f4f6",
          background: "rgba(255,255,255,0.9)", backdropFilter: "blur(8px)", flexShrink: 0,
        }}>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setInputFocused(true)}
            onBlur={() => setInputFocused(false)}
            placeholder="Ask about SEO..."
            disabled={isStreaming}
            style={{
              flex: 1, padding: "8px 12px", fontSize: 12, borderRadius: 12,
              border: `1px solid ${inputFocused ? MJH_BLUE : "#e5e7eb"}`,
              background: "#ffffff",
              boxShadow: inputFocused ? "0 0 0 3px rgba(0,93,172,0.1)" : "0 1px 2px rgba(0,0,0,0.04)",
              outline: "none", opacity: isStreaming ? 0.4 : 1, transition: "border-color 150ms, box-shadow 150ms",
            }}
          />
          <button
            onClick={handleSend}
            disabled={isStreaming || !input.trim()}
            style={{
              padding: "8px 12px", borderRadius: 12, border: "none", color: "#ffffff",
              background: `linear-gradient(135deg, ${MJH_BLUE}, #004A8A)`,
              boxShadow: "0 2px 6px rgba(0,93,172,0.3)",
              cursor: isStreaming || !input.trim() ? "not-allowed" : "pointer",
              opacity: isStreaming || !input.trim() ? 0.4 : 1, transition: "all 150ms", display: "flex", alignItems: "center",
            }}
          >
            <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
              <path d="M3.105 2.289a.75.75 0 00-.826.95l1.414 4.925A1.5 1.5 0 005.135 9.25h6.115a.75.75 0 010 1.5H5.135a1.5 1.5 0 00-1.442 1.086l-1.414 4.926a.75.75 0 00.826.95 28.896 28.896 0 0015.293-7.154.75.75 0 000-1.115A28.897 28.897 0 003.105 2.289z" />
            </svg>
          </button>
        </div>

        {messages.length > 0 && (
          <div style={{ display: "flex", justifyContent: "flex-end", padding: "0 12px 8px", flexShrink: 0 }}>
            <button
              onClick={clearChat}
              onMouseEnter={() => setClearHovered(true)}
              onMouseLeave={() => setClearHovered(false)}
              style={{
                background: "none", border: "none", fontSize: 10,
                color: clearHovered ? "#ef4444" : "#d1d5db", cursor: "pointer",
                display: "flex", alignItems: "center", gap: 4, transition: "color 150ms",
              }}
            >
              <svg width="12" height="12" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.519.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z" clipRule="evenodd" />
              </svg>
              Clear
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
