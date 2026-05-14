// SEO Notebook - Types (ported from SEO Copilot plugin)

export interface KeywordPlacement {
  inBody: boolean;
  inTitle: boolean;
  inMetaDescription: boolean;
  inImages: boolean;
  inUrl: boolean;
}

export interface PrimaryKeywordCandidate {
  term: string;
  volume: number | null;
  cpc: number | null;
  competition: number | null;
  confidence: number;
  placement?: KeywordPlacement;
}

export interface SEOAnalysis {
  primaryKeywordCandidates: PrimaryKeywordCandidate[];
  primaryKeyword: PrimaryKeywordCandidate;
  supportingKeywords: {
    term: string;
    volume: number | null;
    relevance: number;
    inContent: boolean;
    placement?: KeywordPlacement;
  }[];
  missingKeywords: {
    term: string;
    volume: number | null;
    reason: string;
    placement?: KeywordPlacement;
  }[];
  keywordDensity?: {
    term: string;
    count: number;
    density: number;
  }[];
  suggestions?: string[];
}

export interface AEOQuestion {
  question: string;
  volume: number;
  cpc: number;
  competition: number;
}

export interface AEORecommendations {
  questions: AEOQuestion[];
  questionHeadings: {
    originalHeading?: string;
    suggestedHeading: string;
    rationale: string;
  }[];
  // Legacy field for backward compat with persisted client state. FAQ output removed
  // 2026-05 after Google sunset FAQ rich results.
  headingSuggestions?: {
    heading: string;
    answer: string;
    rationale: string;
  }[];
}

export interface DeepAnalysis extends SEOAnalysis {
  keywordDensity: {
    term: string;
    count: number;
    density: number;
  }[];
  readabilityNotes: string[];
  competitiveGaps: string[];
  structureRecommendations: string[];
  aeo?: AEORecommendations;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface DocumentFields {
  title?: string;
  metaDescription?: string;
  slug?: string;
  imageNames?: string[];
  headings?: string[];
  contentCategory?: string;
  contentPlacement?: string[];
}

// V3 - Tabbed UI additions

export interface ContentSuggestions {
  keyTakeaways: string[];
  infographicOpportunities: { concept: string; description: string }[];
  bulletListItems: string[];
}

export interface InternalLink {
  _id?: string;
  title: string;
  slug: string;
  publishedAt?: string;
  relevanceReason: string;
}

// V3.5 - Smart Linking
export interface LinkingSuggestion {
  _id: string;
  title: string;
  slug: string;
  publishedAt: string;
  compositeScore: number;
  topicScore: number;
  freshnessScore: number;
  sectionFitScore: number;
  anchorParagraph: number;
  anchorQuote: string;
  anchorReason: string;
  relevanceReason: string;
  freshnessLabel: "fresh" | "recent" | "older" | "very-old";
}

export interface TechnicalAuditItem {
  label: string;
  value: string;
  status: "good" | "warning" | "error";
  recommendation?: string;
}

export type TabId = "summary" | "keywords" | "aeo" | "linking" | "meta";

export type SummaryCategory =
  | "meta"
  | "headings"
  | "content"
  | "images"
  | "keywords"
  | "aeo"
  | "geo"
  | "internal-linking";

export type SummarySeverity = "error" | "warning" | "opportunity";

export interface SummaryItem {
  id: string;
  category: SummaryCategory;
  severity: SummarySeverity;
  label: string;
  description: string;
  howToFix: string;
  jumpTo: { tab: TabId; anchorId?: string };
}
