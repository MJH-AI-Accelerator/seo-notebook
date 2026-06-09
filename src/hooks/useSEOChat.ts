"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { fetchChatStream, loadChatHistory, saveChatHistory } from "../lib/api";
import type { ChatMessage } from "../lib/types";

interface KeywordPanelData {
  primaryKeyword?: { term: string; volume: number | null };
  supportingKeywords?: { term: string; volume: number | null }[];
  missingKeywords?: { term: string; volume: number | null }[];
  aeoData?: {
    questionHeadings: { suggestedHeading: string; rationale: string }[];
  };
}

function getUserId(): string {
  const key = "seo-notebook-user-id";
  try {
    let id = localStorage.getItem(key);
    if (!id) {
      id = `user-${Math.random().toString(36).slice(2)}-${Date.now()}`;
      localStorage.setItem(key, id);
    }
    return id;
  } catch {
    return "anonymous";
  }
}

export function useSEOChat(
  apiUrl: string,
  documentText: string,
  publication?: string,
  keywordPanelData?: KeywordPanelData,
  documentId?: string
) {
  const chatCacheKey = documentId ? `seo-notebook-chat-${documentId}` : "seo-notebook-chat-default";
  const [messages, setMessagesRaw] = useState<ChatMessage[]>(() => {
    try {
      const cached = typeof window !== "undefined" ? localStorage.getItem(chatCacheKey) : null;
      return cached ? JSON.parse(cached) : [];
    } catch { return []; }
  });
  const setMessages = useCallback((msgs: ChatMessage[] | ((prev: ChatMessage[]) => ChatMessage[])) => {
    setMessagesRaw((prev) => {
      const next = typeof msgs === "function" ? msgs(prev) : msgs;
      try { localStorage.setItem(chatCacheKey, JSON.stringify(next)); } catch {}
      return next;
    });
  }, [chatCacheKey]);

  const [isStreaming, setIsStreaming] = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const userId = useRef(getUserId());
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Bumps on every document switch. An in-flight stream captures the version it
  // started under and stops writing if the document changed underneath it, so a
  // slow response from a previous doc can't inject messages into the new one.
  const docVersionRef = useRef(0);
  useEffect(() => {
    docVersionRef.current += 1;
  }, [documentId]);

  useEffect(() => {
    if (!documentId || historyLoaded) return;
    let cancelled = false;
    loadChatHistory(apiUrl, userId.current, documentId).then((loaded) => {
      if (cancelled) return;
      if (loaded.length > 0) {
        // Functional update so user-typed messages during load aren't clobbered
        setMessages((current) => (current.length === 0 ? loaded : current));
      }
      setHistoryLoaded(true);
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiUrl, documentId, historyLoaded]);

  const scheduleSave = useCallback((msgs: ChatMessage[]) => {
    if (!documentId) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      saveChatHistory(apiUrl, userId.current, documentId, msgs, publication);
    }, 800);
  }, [apiUrl, documentId, publication]);

  const sendMessage = useCallback(
    async (text: string) => {
      const userMessage: ChatMessage = { role: "user", content: text };
      const updatedMessages = [...messages, userMessage];
      setMessages(updatedMessages);
      setIsStreaming(true);
      const myVersion = docVersionRef.current;

      try {
        const stream = await fetchChatStream(
          apiUrl,
          updatedMessages,
          documentText,
          publication,
          keywordPanelData
        );

        if (!stream) {
          setIsStreaming(false);
          return;
        }

        const reader = stream.getReader();
        const decoder = new TextDecoder();
        let assistantContent = "";

        if (docVersionRef.current === myVersion) {
          setMessages((prev) => [...prev, { role: "assistant", content: "" }]);
        }

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          // Document switched mid-stream - stop writing into the new doc's chat.
          if (docVersionRef.current !== myVersion) { try { await reader.cancel(); } catch { /* noop */ } break; }

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n");

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const data = line.slice(6);
              if (data === "[DONE]") continue;

              try {
                const parsed = JSON.parse(data);
                if (parsed.text) {
                  assistantContent += parsed.text;
                  setMessages((prev) => {
                    const updated = [...prev];
                    updated[updated.length - 1] = {
                      role: "assistant",
                      content: assistantContent,
                    };
                    return updated;
                  });
                }
              } catch {
                // Skip malformed JSON chunks
              }
            }
          }
        }

        if (docVersionRef.current === myVersion) {
          const finalMessages: ChatMessage[] = [
            ...updatedMessages,
            { role: "assistant", content: assistantContent },
          ];
          scheduleSave(finalMessages);
        }
      } catch (err) {
        if (docVersionRef.current === myVersion) {
          const errorMsg = err instanceof Error ? err.message : "Chat failed";
          setMessages((prev) => [
            ...prev,
            { role: "assistant", content: `Error: ${errorMsg}` },
          ]);
        }
      }

      setIsStreaming(false);
    },
    [messages, apiUrl, documentText, publication, keywordPanelData, scheduleSave]
  );

  const clearChat = useCallback(() => {
    setMessages([]);
    if (documentId) {
      saveChatHistory(apiUrl, userId.current, documentId, [], publication);
    }
  }, [apiUrl, documentId, publication]);

  return { messages, isStreaming, sendMessage, clearChat };
}
