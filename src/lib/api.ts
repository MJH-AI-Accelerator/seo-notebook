import type { SEOAnalysis, DeepAnalysis, ChatMessage, DocumentFields } from "./types";

function safeParseJson<T>(text: string): T {
  try {
    return JSON.parse(text) as T;
  } catch {
    for (let i = text.length - 1; i >= 0; i--) {
      if (text[i] === "}" || text[i] === "]") {
        try {
          return JSON.parse(text.substring(0, i + 1)) as T;
        } catch {
          continue;
        }
      }
    }
    throw new Error("Invalid JSON response from server");
  }
}

export async function fetchAnalysis(
  apiUrl: string,
  content: string,
  mode: "realtime" | "deep",
  publication?: string,
  seedKeywords?: string[],
  documentFields?: DocumentFields,
  focusKeyword?: string
): Promise<SEOAnalysis | DeepAnalysis> {
  const response = await fetch(`${apiUrl}/api/seo-copilot/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content, mode, publication, seedKeywords, documentFields, focusKeyword }),
  });

  const text = await response.text();

  if (!response.ok) {
    const err = safeParseJson<{ error?: string }>(text);
    throw new Error(err.error || `HTTP ${response.status}`);
  }

  return safeParseJson<SEOAnalysis | DeepAnalysis>(text);
}

export async function fetchChatStream(
  apiUrl: string,
  messages: ChatMessage[],
  documentContext: string,
  publication?: string,
  keywordPanelData?: {
    primaryKeyword?: { term: string; volume: number | null };
    supportingKeywords?: { term: string; volume: number | null }[];
    missingKeywords?: { term: string; volume: number | null }[];
    aeoData?: {
      questionHeadings: { suggestedHeading: string; rationale: string }[];
      faqSuggestions: { question: string; answer: string }[];
    };
  }
): Promise<ReadableStream<Uint8Array> | null> {
  const response = await fetch(`${apiUrl}/api/seo-copilot/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages, documentContext, publication, keywordPanelData }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: "Request failed" }));
    throw new Error(err.error || `HTTP ${response.status}`);
  }

  return response.body;
}

export async function submitFeedback(
  apiUrl: string,
  data: { suggestion_type: string; suggestion_text: string; vote: "up" | "down"; document_id?: string; publication?: string; user_id?: string }
): Promise<void> {
  await fetch(`${apiUrl}/api/seo-copilot/feedback`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

export async function lookupKeywords(
  apiUrl: string,
  keywords: string[]
): Promise<{ results: { keyword: string; volume: number; cpc: number; competition: number }[]; apiUnitsUsed: number }> {
  const response = await fetch(`${apiUrl}/api/seo-copilot/keywords`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ keywords }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: "Request failed" }));
    throw new Error(err.error || `HTTP ${response.status}`);
  }

  return response.json();
}

export async function fetchQuestions(
  apiUrl: string,
  keyword: string
): Promise<{ questions: { question: string; volume: number; cpc: number; competition: number }[]; apiUnitsUsed: number }> {
  const response = await fetch(`${apiUrl}/api/seo-copilot/questions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ keyword }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: "Request failed" }));
    throw new Error(err.error || `HTTP ${response.status}`);
  }

  return response.json();
}

export async function fetchMoreFAQs(
  apiUrl: string,
  content: string,
  existingQuestions: string[],
  publication?: string
): Promise<{ question: string; answer: string }[]> {
  const res = await fetch(`${apiUrl}/api/seo-copilot/more-faqs`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content, existingQuestions, publication }),
  });
  if (!res.ok) return [];
  const data = await res.json();
  return data.faqSuggestions || [];
}

export async function loadChatHistory(
  apiUrl: string,
  userId: string,
  documentId: string
): Promise<ChatMessage[]> {
  try {
    const res = await fetch(
      `${apiUrl}/api/seo-copilot/chat-history?userId=${encodeURIComponent(userId)}&documentId=${encodeURIComponent(documentId)}`
    );
    if (!res.ok) return [];
    const data = await res.json();
    return (data.messages as ChatMessage[]) || [];
  } catch {
    return [];
  }
}

export async function saveChatHistory(
  apiUrl: string,
  userId: string,
  documentId: string,
  messages: ChatMessage[],
  publication?: string
): Promise<void> {
  try {
    await fetch(`${apiUrl}/api/seo-copilot/chat-history`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, documentId, messages, publication }),
    });
  } catch {
    // Silent
  }
}
