import { describe, expect, test } from "bun:test";
import { activationSubmissionSchema, targetWordEvaluationSchema } from "./schema";

const firstId = "11111111-1111-4111-8111-111111111111";
const secondId = "22222222-2222-4222-8222-222222222222";

describe("activation submission", () => {
  test("accepts compact browser input", () => {
    expect(
      activationSubmissionSchema.parse({
        attempts: [
          {
            attemptId: firstId,
            answer: "Ich kann dazu beitragen.",
            vocabularyIds: [secondId],
          },
        ],
      }),
    ).toEqual({
      attempts: [
        {
          attemptId: firstId,
          answer: "Ich kann dazu beitragen.",
          vocabularyIds: [secondId],
        },
      ],
    });
  });

  test("rejects a word repeated across attempts", () => {
    expect(() =>
      activationSubmissionSchema.parse({
        attempts: [
          {
            attemptId: firstId,
            answer: "Erster Versuch.",
            vocabularyIds: [secondId],
          },
          {
            attemptId: "33333333-3333-4333-8333-333333333333",
            answer: "Zweiter Versuch.",
            vocabularyIds: [secondId],
          },
        ],
      }),
    ).toThrow();
  });
});

describe("target-word evaluation", () => {
  test("accepts null feedback for a correct use", () => {
    expect(
      targetWordEvaluationSchema.parse({
        vocabularyId: firstId,
        word: "beitragen",
        used: true,
        meaningCorrect: true,
        grammarCorrect: true,
        naturalUsage: true,
        collocationCorrect: true,
        usageScore: 9,
        feedbackAr: null,
      }).feedbackAr,
    ).toBeNull();
  });
});
