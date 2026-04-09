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
  faqSuggestions: {
    question: string;
    answer: string;
    volume?: number | null;
  }[];
  faqItems?: {
    question: string;
    answer: string;
    volume: number | null;
    highlightedKeywords?: { term: string; volume: number }[];
  }[];
  highVolumeQuestions?: {
    question: string;
    answer: string;
    volume: number | null;
    highlightedKeywords?: { term: string; volume: number }[];
  }[];
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
