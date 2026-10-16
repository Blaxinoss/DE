import { describe, expect, test } from "bun:test";
import {
  isActivationReady,
  isReviewReady,
  nextState,
  scheduleNextReview,
} from "./rules";
import { makeVocabulary } from "@/tests/factories/vocabulary";

describe("nextState", () => {
  test("moves a new word to learning after a positive review", () => {
    expect(nextState("new", "slow", "review")).toBe("learning");
  });

  test("moves learning to recall after an instant review", () => {
    expect(nextState("learning", "instant", "review")).toBe("recall");
  });

  test("keeps learning after a slow review", () => {
    // Arrange
    const currentState = "learning";

    // Act
    const state = nextState(currentState, "slow", "review");

    // Assert
    expect(state).toBe("learning");
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

  test("keeps the state after using a hint", () => {
    expect(nextState("learning", "hint", "review")).toBe("learning");
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
    expect(scheduleNextReview("recall", "could_not_use", now)).toBe(
      "2026-10-10T02:00:00.000Z",
    );
  });

  test("brings a hinted new word back after the minimum interval", () => {
    expect(scheduleNextReview("new", "hint", now)).toBe("2026-10-10T04:48:00.000Z");
  });

  test("reduces a recall interval after activation needed help", () => {
    expect(scheduleNextReview("recall", "needed_help", now)).toBe(
      "2026-10-11T09:36:00.000Z",
    );
  });

  test("only makes due recall words with an active target ready to activate", () => {
    const recallWord = makeVocabulary({
      state: "recall",
      nextReviewAt: "2026-10-09T00:00:00.000Z",
    });

    expect(isActivationReady(recallWord, now)).toBe(true);
    expect(
      isActivationReady(
        { ...recallWord, nextReviewAt: "2026-10-11T00:00:00.000Z" },
        now,
      ),
    ).toBe(false);
  });

  test("routes due active-target recall words to Activate instead of Review", () => {
    const recallWord = makeVocabulary({
      state: "recall",
      nextReviewAt: "2026-10-09T00:00:00.000Z",
    });

    expect(isActivationReady(recallWord, now)).toBe(true);
    expect(isReviewReady(recallWord, now)).toBe(false);
    expect(isReviewReady({ ...recallWord, target: "passive" }, now)).toBe(true);
  });
});
