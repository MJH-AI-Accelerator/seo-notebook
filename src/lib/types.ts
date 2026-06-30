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

export interface HeadingItem {
  text: string;
  level: number; // 1-6
}

export interface DocumentFields {
  title?: string;
  metaDescription?: string;
  slug?: string;
  imageNames?: string[];
  // Title attributes found on images (hover tooltip). imageCount is the total
  // number of images, so the title audit can report "X of N images have a title".
  imageTitles?: string[];
  imageCount?: number;
  headings?: string[];
  headingsDetailed?: HeadingItem[];
  // Body paragraphs that look like section headings but were typed as plain text. Populated
  // only where the body is Portable Text (the Sanity plugin); the Notebook leaves it unset.
  unstyledHeadings?: string[];
  bodyLinks?: string[];
  contentCategory?: string;
  contentPlacement?: string[];
  // E-E-A-T fields - 2026 healthcare content scrutiny
  authorName?: string;
  authorCredentials?: string;
  authorBioUrl?: string;
  authorIsReference?: boolean;
  // Fact-checker / reviewer (mirrors the plugin type). Not populated by the Notebook's
  // plain-text editor, but kept here so the shared DocumentFields shape stays in sync.
  factCheckerName?: string;
  factCheckerIsReference?: boolean;
  publishedAt?: string;
  updatedAt?: string;
  lastReviewedAt?: string;
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

export type TabId = "summary" | "keywords" | "aeo" | "linking" | "meta" | "technical";

export type SummaryCategory =
  | "meta"
  | "headings"
  | "content"
  | "images"
  | "keywords"
  | "aeo"
  | "geo"
  | "internal-linking"
  | "technical";

export interface LinkCheckResult {
  url: string;
  status: number;
  finalUrl?: string;
  redirected: boolean;
  category: "ok" | "redirect" | "broken" | "unverified" | "error";
  error?: string;
}

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
