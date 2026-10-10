import { describe, expect, test } from "bun:test";
import { generatedWordsSchema, wordQuerySchema } from "./dictionary-schema";

const suggestion = {
  senseKey: "sich-erinnern-verb-remember",
  word: "sich erinnern",
  meaningAr: "يتذكّر",
  type: "verb" as const,
  grammarFacts: [
    { key: "reflexive", value: "sich" },
    { key: "preposition", value: "an + Akkusativ" },
  ],
  commonness: "very_common" as const,
  chunk: "sich an etwas erinnern",
  example: "Ich erinnere mich an diesen Tag.",
  searchTerms: ["sich erinnern", "erinnern"],
};

describe("lexicon schemas", () => {
  test("trims a valid lookup query", () => {
    expect(wordQuerySchema.parse({ language: "de", query: "  erinnern  " })).toEqual({
      language: "de",
      query: "erinnern",
    });
  });

  test("accepts distinct word suggestions", () => {
    expect(
      generatedWordsSchema.parse({ suggestions: [suggestion] }).suggestions,
    ).toHaveLength(1);
  });

  test("rejects duplicate suggestion keys", () => {
    expect(() =>
      generatedWordsSchema.parse({ suggestions: [suggestion, suggestion] }),
    ).toThrow();
  });
});
