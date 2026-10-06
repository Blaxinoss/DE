import { LearningResult, Review, ReviewType, VocabularyState, vocabularyStates } from "./types";

const intervals: Record<VocabularyState, number> = { new: 0.2, recognition: 1, passive: 2, slow_recall: 4, usable: 7, active: 14 };
const positive = new Set<LearningResult>(["instant", "slow", "easy", "effort"]);
const strong = new Set<LearningResult>(["instant", "easy"]);
const weak = new Set<LearningResult>(["hint", "wrong", "needed_help", "could_not_use"]);

export function nextState(current: VocabularyState, result: LearningResult, history: Review[], reviewType: ReviewType): VocabularyState {
  const index = vocabularyStates.indexOf(current);
  const previous = history.filter((review) => review.reviewType === reviewType)[0]?.result;
  if (strong.has(result) && previous && positive.has(previous)) return vocabularyStates[Math.min(index + 1, vocabularyStates.length - 1)];
  if (weak.has(result) && previous && weak.has(previous)) return vocabularyStates[Math.max(index - 1, 0)];
  return current;
}

export function scheduleNextReview(state: VocabularyState, result: LearningResult, now = new Date()): string {
  if (result === "wrong" || result === "could_not_use") return new Date(now.getTime() + 2 * 60 * 60 * 1000).toISOString();
  const factor = result === "instant" || result === "easy" ? 1.5 : result === "hint" || result === "needed_help" ? 0.35 : 1;
  return new Date(now.getTime() + Math.max(intervals[state] * factor, 0.2) * 86400000).toISOString();
}

export function latestReviewFor(vocabularyId: string, reviews: Review[]): Review | undefined {
  return reviews.find((review) => review.vocabularyId === vocabularyId);
}

export function isDue(vocabularyId: string, reviews: Review[], now = new Date()): boolean {
  const latest = latestReviewFor(vocabularyId, reviews);
  return !latest || new Date(latest.nextReviewAt) <= now;
}

export function progressPercent(states: VocabularyState[]): number {
  if (!states.length) return 0;
  const total = states.reduce((sum, state) => sum + vocabularyStates.indexOf(state), 0);
  return Math.round((total / (states.length * (vocabularyStates.length - 1))) * 100);
}
