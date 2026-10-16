import { describe, expect, test } from "bun:test";
import { parseActivationEvaluation } from "./parse-evaluation";
import type { ActivationRequest, ActivationResponse } from "./schema";

const attemptId = "00000000-0000-4000-8000-000000000001";
const wordId = "00000000-0000-4000-8000-000000000002";
const otherWordId = "00000000-0000-4000-8000-000000000003";
const unknownId = "00000000-0000-4000-8000-000000000099";

function request(): ActivationRequest {
  return {
    language: "de",
    task: { title: "Use the words", instructions: "Write one sentence." },
    attempts: [
      {
        attemptId,
        answer: "Ich lerne Deutsch.",
        targetWords: [
          {
            id: wordId,
            word: "lernen",
            meaningAr: "يتعلم",
            type: "verb",
            grammar: {},
            chunk: null,
            example: null,
          },
        ],
      },
    ],
  };
}

function response(): ActivationResponse {
  return {
    attempts: [
      {
        attemptId,
        sentence: {
          correct: true,
          corrected: null,
          scores: { grammar: 10, naturalness: 10, meaning: 10 },
          feedbackAr: "صحيحة",
          suggestion: null,
        },
        errors: [],
        targetWords: [
          {
            vocabularyId: wordId,
            word: "lernen",
            used: true,
            meaningCorrect: true,
            grammarCorrect: true,
            naturalUsage: true,
            collocationCorrect: true,
            usageScore: 10,
            feedbackAr: null,
          },
        ],
      },
    ],
  };
}

function parse(output: unknown) {
  return parseActivationEvaluation(request(), JSON.stringify(output));
}

describe("activation AI response boundary", () => {
  test("rejects malformed JSON", () => {
    expect(() => parseActivationEvaluation(request(), "{not-json")).toThrow();
  });

  test("rejects a missing target-word result", () => {
    const output = response();
    output.attempts[0]!.targetWords = [];
    expect(() => parse(output)).toThrow("incomplete target-word coverage");
  });

  test("rejects an unexpected vocabulary id", () => {
    const output = response();
    output.attempts[0]!.targetWords[0]!.vocabularyId = unknownId;
    expect(() => parse(output)).toThrow("incomplete target-word coverage");
  });

  test("rejects duplicate vocabulary ids", () => {
    const input = request();
    input.attempts[0]!.targetWords.push({
      ...input.attempts[0]!.targetWords[0]!,
      id: otherWordId,
      word: "üben",
    });
    const output = response();
    output.attempts[0]!.targetWords.push({ ...output.attempts[0]!.targetWords[0]! });

    expect(() => parseActivationEvaluation(input, JSON.stringify(output))).toThrow(
      "incomplete target-word coverage",
    );
  });

  test.each([-1, 11])("rejects an out-of-range score: %d", (score) => {
    const output = response();
    output.attempts[0]!.targetWords[0]!.usageScore = score;
    expect(() => parse(output)).toThrow();
  });

  test.each([-1, 11])("rejects an out-of-range sentence score: %d", (score) => {
    const output = response();
    output.attempts[0]!.sentence.scores.grammar = score;
    expect(() => parse(output)).toThrow();
  });

  test("rejects duplicate attempt ids", () => {
    const output = response();
    output.attempts.push(structuredClone(output.attempts[0]!));
    expect(() => parse(output)).toThrow("incomplete attempt coverage");
  });

  test("rejects a changed target word even when its id is valid", () => {
    const output = response();
    output.attempts[0]!.targetWords[0]!.word = "arbeiten";
    expect(() => parse(output)).toThrow("changed a target word");
  });

  test("rejects error references to unknown target words", () => {
    const output = response();
    output.attempts[0]!.errors.push({
      type: "grammar",
      severity: "minor",
      original: "lerne",
      correction: "lerne",
      explanationAr: "اختبار",
      targetWordIds: [unknownId],
    });
    expect(() => parse(output)).toThrow("unknown target-word id");
  });

  test("accepts a complete valid response", () => {
    expect(parse(response())).toEqual(response());
  });

  test("removes an unnecessary natural rewrite from an already natural answer", () => {
    const output = response();
    output.attempts[0]!.sentence.suggestion =
      "Ich lerne heute mit großer Freude die deutsche Sprache.";

    expect(parse(output).attempts[0]?.sentence.suggestion).toBeNull();
  });

  test("removes corrected text that is identical to the learner answer", () => {
    const output = response();
    output.attempts[0]!.sentence.corrected = "  Ich lerne Deutsch. ";

    expect(parse(output).attempts[0]?.sentence.corrected).toBeNull();
  });

  test("rejects an incorrect answer whose correction is identical to the original", () => {
    const output = response();
    output.attempts[0]!.sentence.correct = false;
    output.attempts[0]!.sentence.corrected = " Ich lerne Deutsch. ";

    expect(() => parse(output)).toThrow(
      "An incorrect answer needs a correction that differs from the original",
    );
  });

  test("rejects contradictory scores for a target word that was not used", () => {
    const output = response();
    output.attempts[0]!.targetWords[0] = {
      ...output.attempts[0]!.targetWords[0]!,
      used: false,
      usageScore: 10,
    };

    expect(() => parse(output)).toThrow("Unused target words must have zero score");
  });

  test("rejects an incorrect answer without a corrected answer", () => {
    const output = response();
    output.attempts[0]!.sentence.correct = false;
    output.attempts[0]!.sentence.corrected = null;

    expect(() => parse(output)).toThrow(
      "Incorrect answers must include a corrected answer",
    );
  });

  test("rejects a blank correction for an incorrect answer", () => {
    const output = response();
    output.attempts[0]!.sentence.correct = false;
    output.attempts[0]!.sentence.corrected = "   ";

    expect(() => parse(output)).toThrow();
  });

  test("requires actionable feedback when a target word has a problem", () => {
    const output = response();
    output.attempts[0]!.targetWords[0]!.grammarCorrect = false;
    output.attempts[0]!.targetWords[0]!.feedbackAr = null;

    expect(() => parse(output)).toThrow(
      "A target word with problems must include feedback",
    );
  });

  test("rejects a correct answer containing a major error", () => {
    const output = response();
    output.attempts[0]!.errors.push({
      type: "meaning",
      severity: "major",
      original: "lernen",
      correction: "arbeiten",
      explanationAr: "خطأ كبير",
      targetWordIds: [wordId],
    });

    expect(() => parse(output)).toThrow("Correct answers cannot contain major errors");
  });
});
