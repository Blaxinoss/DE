import {
  LearningResult,
  ReviewType,
  Vocabulary,
  VocabularyState,
  vocabularyStates,
} from "./types";

const intervals: Record<VocabularyState, number> = {
  new: 0.25,
  learning: 1,
  recall: 4,
  active: 14,
};

const demotedState: Record<VocabularyState, VocabularyState> = {
  new: "new",
  learning: "learning",
  recall: "learning",
  active: "recall",
};

export function nextState(
  current: VocabularyState,
  result: LearningResult,
  reviewType: ReviewType,
): VocabularyState {
  if (result === "wrong" || result === "could_not_use") {
    return demotedState[current];
  }

  if (
    current === "new" &&
    reviewType === "review" &&
    (result === "instant" || result === "slow")
  ) {
    return "learning";
  }

  if (current === "learning" && reviewType === "review" && result === "instant") {
    return "recall";
  }

  if (current === "recall" && reviewType === "activate" && result === "easy") {
    return "active";
  }

  return current;
}

export function scheduleNextReview(
  state: VocabularyState,
  result: LearningResult,
  now = new Date(),
): string {
  if (result === "wrong" || result === "could_not_use") {
    return new Date(now.getTime() + 2 * 60 * 60 * 1000).toISOString();
  }

  let factor = 1;

  if (result === "instant" || result === "easy") {
    factor = 1.5;
  }

  if (result === "hint" || result === "needed_help") {
    factor = 0.35;
  }

  return new Date(
    now.getTime() + Math.max(intervals[state] * factor, 0.2) * 86400000,
  ).toISOString();
}

export function isDue(word: Vocabulary, now = new Date()): boolean {
  return !word.nextReviewAt || new Date(word.nextReviewAt) <= now;
}

function followsActivationPath(word: Vocabulary): boolean {
  return word.target === "active" &&
    (word.state === "recall" || word.state === "active");
}

export function isActivationReady(word: Vocabulary, now = new Date()): boolean {
  return followsActivationPath(word) && isDue(word, now);
}

export function isReviewReady(word: Vocabulary, now = new Date()): boolean {
  return !followsActivationPath(word) && isDue(word, now);
}

export function nearestReviewDelay(
  words: Vocabulary[],
  now = new Date(),
): string | null {
  const nowMs = now.getTime();
  const target = words
    .filter(
      (word) =>
        !followsActivationPath(word) &&
        word.nextReviewAt &&
        new Date(word.nextReviewAt).getTime() > nowMs,
    )
    .sort(
      (a, b) =>
        new Date(a.nextReviewAt ?? 0).getTime() -
        new Date(b.nextReviewAt ?? 0).getTime(),
    )[0];

  if (!target?.nextReviewAt) {
    return null;
  }

  const diffMs = new Date(target.nextReviewAt).getTime() - nowMs;
  const totalMinutes = Math.ceil(diffMs / 1000 / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return `${hours}h ${minutes}m`;
}

export function progressPercent(states: VocabularyState[]): number {
  if (!states.length) {
    return 0;
  }

  const total = states.reduce((sum, state) => sum + vocabularyStates.indexOf(state), 0);
  return Math.round((total / (states.length * (vocabularyStates.length - 1))) * 100);
}
