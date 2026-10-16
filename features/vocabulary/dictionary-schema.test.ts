import { describe, expect, test } from "bun:test";
import { toGeminiJsonSchema } from "@/lib/ai/json-schema";
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

  test("rejects invented grammar keys", () => {
    expect(() =>
      generatedWordsSchema.parse({
        suggestions: [
          {
            ...suggestion,
            grammarFacts: [{ key: "somethingGeminiInvented", value: "x" }],
          },
        ],
      }),
    ).toThrow();
  });

  test("keeps the Gemini response schema provider-compatible", () => {
    const jsonSchema = JSON.stringify(toGeminiJsonSchema(generatedWordsSchema));

    expect(jsonSchema).toContain('"pattern":"^[a-z][a-zA-Z0-9]*$"');
    expect(jsonSchema).not.toContain('"enum":["article","singular"');
  });

  test("rejects grammar facts that belong to another word type", () => {
    expect(() =>
      generatedWordsSchema.parse({
        suggestions: [
          {
            ...suggestion,
            type: "noun",
            grammarFacts: [{ key: "partizipII", value: "erinnert" }],
          },
        ],
      }),
    ).toThrow("partizipII is not valid for noun entries");
  });

  test("rejects duplicate grammar facts", () => {
    expect(() =>
      generatedWordsSchema.parse({
        suggestions: [
          {
            ...suggestion,
            grammarFacts: [
              { key: "synonyms", value: "gedenken" },
              { key: "synonyms", value: "sich entsinnen" },
            ],
          },
        ],
      }),
    ).toThrow("Duplicate grammar fact: synonyms");
  });
});
