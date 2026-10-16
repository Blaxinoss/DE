import { describe, expect, test } from "bun:test";
import { toActivationResult } from "./map-result";
import type { TargetWordEvaluation } from "./schema";

function evaluation(
  overrides: Partial<TargetWordEvaluation> = {},
): TargetWordEvaluation {
  return {
    vocabularyId: "00000000-0000-4000-8000-000000000002",
    word: "lernen",
    used: true,
    meaningCorrect: true,
    grammarCorrect: true,
    naturalUsage: true,
    collocationCorrect: true,
    usageScore: 10,
    feedbackAr: null,
    ...overrides,
  };
}

describe("toActivationResult", () => {
  test("maps confident, natural use to easy", () => {
    expect(toActivationResult(evaluation({ usageScore: 8 }))).toBe("easy");
  });

  test("maps a usable but weaker answer to effort", () => {
    expect(toActivationResult(evaluation({ usageScore: 7 }))).toBe("effort");
    expect(toActivationResult(evaluation({ naturalUsage: false }))).toBe("effort");
  });

  test("maps low scores and grammar or collocation errors to needed_help", () => {
    expect(toActivationResult(evaluation({ usageScore: 4 }))).toBe("needed_help");
    expect(toActivationResult(evaluation({ grammarCorrect: false }))).toBe(
      "needed_help",
    );
    expect(toActivationResult(evaluation({ collocationCorrect: false }))).toBe(
      "needed_help",
    );
  });

  test("maps a missing word or wrong meaning to could_not_use", () => {
    expect(toActivationResult(evaluation({ used: false, usageScore: 10 }))).toBe(
      "could_not_use",
    );
    expect(toActivationResult(evaluation({ meaningCorrect: false }))).toBe(
      "could_not_use",
    );
  });
});
