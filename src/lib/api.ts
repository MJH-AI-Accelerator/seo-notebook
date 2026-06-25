import type { SEOAnalysis, DeepAnalysis, ChatMessage, DocumentFields, ContentSuggestions, InternalLink, LinkingSuggestion, LinkCheckResult } from "./types";

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
  focusKeyword?: string,
  secondaryKeyword?: string,
  signal?: AbortSignal
): Promise<SEOAnalysis | DeepAnalysis> {
  const response = await fetch(`${apiUrl}/api/seo-copilot/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content, mode, publication, seedKeywords, documentFields, focusKeyword, secondaryKeyword }),
    signal,
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

// Telemetry attached to a "Report a problem" submission - which surface/tab the editor
// was on, etc. Keys must match the backend's strict schema in feedback/route.ts.
export interface FeedbackContext {
  surface?: string;
  activeTab?: string;
  primaryKeyword?: string;
  documentType?: string;
  url?: string;
  userAgent?: string;
  appVersion?: string;
  timestamp?: string;
}

export async function submitFeedback(
  apiUrl: string,
  data: { suggestion_type: string; suggestion_text: string; vote: "up" | "down"; document_id?: string; publication?: string; user_id?: string; context?: FeedbackContext }
): Promise<void> {
  await fetch(`${apiUrl}/api/seo-copilot/feedback`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

export async function lookupKeywords(
  apiUrl: string,
  keywords: string[],
  signal?: AbortSignal
): Promise<{ results: { keyword: string; volume: number; cpc: number; competition: number }[]; apiUnitsUsed: number }> {
  const response = await fetch(`${apiUrl}/api/seo-copilot/keywords`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ keywords }),
    signal,
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

export async function fetchContentSuggestions(
  apiUrl: string,
  content: string,
  primaryKeyword: string,
  publication?: string
): Promise<ContentSuggestions> {
  const empty: ContentSuggestions = { keyTakeaways: [], infographicOpportunities: [], bulletListItems: [] };
  try {
    const res = await fetch(`${apiUrl}/api/seo-copilot/content-suggestions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content, primaryKeyword, publication }),
    });
    if (!res.ok) return empty;
    const data = await res.json().catch(() => null);
    if (!data || typeof data !== "object") return empty;
    return {
      keyTakeaways: Array.isArray(data.keyTakeaways) ? data.keyTakeaways : [],
      infographicOpportunities: Array.isArray(data.infographicOpportunities) ? data.infographicOpportunities : [],
      bulletListItems: Array.isArray(data.bulletListItems) ? data.bulletListItems : [],
    };
  } catch {
    return empty;
  }
}

export async function fetchInternalLinks(
  apiUrl: string,
  keywords: string[],
  currentDocumentId?: string,
  publication?: string
): Promise<InternalLink[]> {
  if (!keywords || keywords.length === 0) return [];
  try {
    const res = await fetch(`${apiUrl}/api/seo-copilot/articles`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "related", keywords, publication }),
    });
    if (!res.ok) return [];
    const data = await res.json().catch(() => null);
    if (!data || typeof data !== "object") return [];
    type ArticleResult = { _id?: string; title?: string; slug?: string; publishedAt?: string };
    const articles: ArticleResult[] = Array.isArray(data.articles) ? data.articles : [];
    const filtered = currentDocumentId
      ? articles.filter((a) => a._id !== currentDocumentId)
      : articles;
    return filtered.map((a): InternalLink => ({
      _id: a._id,
      title: a.title || "Untitled",
      slug: a.slug || "",
      publishedAt: a.publishedAt,
      relevanceReason: matchedKeyword(a.title, keywords),
    }));
  } catch {
    return [];
  }
}

function matchedKeyword(title: string | undefined, keywords: string[]): string {
  const lower = (title || "").toLowerCase();
  if (!lower) return "Related to current topic";
  for (const kw of keywords) {
    if (kw && lower.includes(kw.toLowerCase())) {
      return `Matches "${kw}"`;
    }
  }
  return "Related to current topic";
}

export async function fetchLinkingSuggestions(
  apiUrl: string,
  content: string,
  primaryKeyword: string,
  supportingKeywords: string[],
  currentDocumentId?: string,
  publication?: string
): Promise<LinkingSuggestion[]> {
  if (!content || content.trim().length < 50) return [];
  try {
    const res = await fetch(`${apiUrl}/api/seo-copilot/linking-suggestions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content, primaryKeyword, supportingKeywords, currentDocumentId, publication }),
    });
    if (!res.ok) return [];
    const data = await res.json().catch(() => null);
    if (!data || !Array.isArray(data.suggestions)) return [];
    return data.suggestions as LinkingSuggestion[];
  } catch {
    return [];
  }
}

// Calls the backend broken-link scanner. Returns one result per unique URL,
// or an empty array on failure.
export async function checkLinks(apiUrl: string, urls: string[]): Promise<LinkCheckResult[]> {
  if (!urls || urls.length === 0) return [];
  try {
    const res = await fetch(`${apiUrl}/api/seo-copilot/check-links`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ urls }),
    });
    if (!res.ok) return [];
    const data = await res.json().catch(() => null);
    if (!data || !Array.isArray(data.results)) return [];
    return data.results as LinkCheckResult[];
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
