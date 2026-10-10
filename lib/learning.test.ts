import { describe, expect, test } from "bun:test";
import {
  isActivationReady,
  isReviewReady,
  nextState,
  scheduleNextReview,
} from "./learning";
import { Vocabulary } from "./types";

const baseWord: Vocabulary = {
  id: "word-id",
  language: "de",
  word: "lernen",
  meaningAr: "يتعلم",
  type: "verb",
  target: "active",
  state: "new",
  grammar: {},
  commonness: "common",
  chunk: null,
  example: null,
  nextReviewAt: null,
  createdAt: "2026-10-10T00:00:00.000Z",
  updatedAt: "2026-10-10T00:00:00.000Z",
};

describe("nextState", () => {
  test("moves a new word to learning after a positive review", () => {
    expect(nextState("new", "slow", "review")).toBe("learning");
  });

  test("moves learning to recall after an instant review", () => {
    expect(nextState("learning", "instant", "review")).toBe("recall");
  });

  test("does not promote recall through an ordinary review", () => {
    expect(nextState("recall", "instant", "review")).toBe("recall");
  });

  test("moves recall to active after an easy activation", () => {
    expect(nextState("recall", "easy", "activate")).toBe("active");
  });

  test("keeps the state after a result that needed help", () => {
    expect(nextState("recall", "needed_help", "activate")).toBe("recall");
  });

  test("demotes immediately after a complete failure", () => {
    expect(nextState("active", "wrong", "review")).toBe("recall");
    expect(nextState("recall", "could_not_use", "activate")).toBe("learning");
  });
});

describe("review scheduling", () => {
  const now = new Date("2026-10-10T00:00:00.000Z");

  test("schedules strong recall after six days", () => {
    expect(scheduleNextReview("recall", "instant", now)).toBe(
      "2026-10-16T00:00:00.000Z",
    );
  });

  test("schedules complete failures after two hours", () => {
    expect(scheduleNextReview("active", "wrong", now)).toBe("2026-10-10T02:00:00.000Z");
  });

  test("only makes due recall words with an active target ready to activate", () => {
    const recallWord = {
      ...baseWord,
      state: "recall" as const,
      nextReviewAt: "2026-10-09T00:00:00.000Z",
    };

    expect(isActivationReady(recallWord, now)).toBe(true);
    expect(
      isActivationReady(
        { ...recallWord, nextReviewAt: "2026-10-11T00:00:00.000Z" },
        now,
      ),
    ).toBe(false);
  });

  test("routes due active-target recall words to Activate instead of Review", () => {
    const recallWord = {
      ...baseWord,
      state: "recall" as const,
      nextReviewAt: "2026-10-09T00:00:00.000Z",
    };

    expect(isActivationReady(recallWord, now)).toBe(true);
    expect(isReviewReady(recallWord, now)).toBe(false);
    expect(isReviewReady({ ...recallWord, target: "passive" }, now)).toBe(true);
  });
});
