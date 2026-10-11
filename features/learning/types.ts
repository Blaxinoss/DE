export const vocabularyStates = ["new", "learning", "recall", "active"] as const;
export const wordTypes = [
  "noun",
  "verb",
  "adjective",
  "adverb",
  "expression",
  "other",
] as const;
export const targets = ["passive", "active"] as const;
export const learningLanguages = ["de", "en"] as const;

export type VocabularyState = (typeof vocabularyStates)[number];
export type WordType = (typeof wordTypes)[number];
export type Target = (typeof targets)[number];
export type LearningLanguage = (typeof learningLanguages)[number];
export type ReviewResult = "instant" | "slow" | "hint" | "wrong";
export type ActivationResult = "easy" | "effort" | "needed_help" | "could_not_use";
export type LearningResult = ReviewResult | ActivationResult;
export type ReviewType = "review" | "activate";

export interface Vocabulary {
  id: string;
  language: LearningLanguage;
  lexiconId: string | null;
  word: string;
  meaningAr: string;
  type: WordType;
  target: Target;
  state: VocabularyState;
  grammar: Record<string, unknown>;
  commonness: string | null;
  chunk: string | null;
  example: string | null;
  nextReviewAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Review {
  id: string;
  vocabularyId: string;
  result: LearningResult;
  reviewType: ReviewType;
  reviewedAt: string;
}

export type VocabularyLearningUpdate = Pick<
  Vocabulary,
  "id" | "state" | "nextReviewAt" | "updatedAt"
>;

export type VocabularyDraft = Omit<
  Vocabulary,
  "id" | "language" | "lexiconId" | "nextReviewAt" | "createdAt" | "updatedAt"
> & { lexiconId?: string | null };
