import { describe, expect, test } from "bun:test";
import { toGeminiJsonSchema } from "@/lib/ai/json-schema";
import {
  generatedWordsSchema,
  parseGeneratedWords,
  wordQuerySchema,
} from "./dictionary-schema";

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
  verbFamilyPath: ["erinnern"],
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

  test("accepts a complete direct-parent path for a German verb", () => {
    expect(
      parseGeneratedWords(
        {
          suggestions: [
            {
              ...suggestion,
              word: "wiederaufnehmen",
              verbFamilyPath: ["nehmen", "aufnehmen", "wiederaufnehmen"],
            },
          ],
        },
        "de",
      ).suggestions[0]?.verbFamilyPath,
    ).toEqual(["nehmen", "aufnehmen", "wiederaufnehmen"]);
  });

  test("rejects a German verb without its family path", () => {
    expect(() =>
      parseGeneratedWords(
        {
          suggestions: [{ ...suggestion, verbFamilyPath: null }],
        },
        "de",
      ),
    ).toThrow("Verbs must describe their verb-family path");
  });

  test("accepts an English prefixed verb family", () => {
    expect(
      parseGeneratedWords(
        {
          suggestions: [
            {
              ...suggestion,
              senseKey: "overreact-verb-respond-excessively",
              word: "overreact",
              grammarFacts: [],
              searchTerms: ["overreact"],
              verbFamilyPath: ["act", "react", "overreact"],
            },
          ],
        },
        "en",
      ).suggestions[0]?.verbFamilyPath,
    ).toEqual(["act", "react", "overreact"]);
  });

  test("accepts an English phrasal verb under its base verb", () => {
    expect(
      parseGeneratedWords(
        {
          suggestions: [
            {
              ...suggestion,
              senseKey: "take-over-verb-assume-control",
              word: "take over",
              grammarFacts: [],
              searchTerms: ["take over"],
              verbFamilyPath: ["take", "take over"],
            },
          ],
        },
        "en",
      ).suggestions[0]?.verbFamilyPath,
    ).toEqual(["take", "take over"]);
  });

  test("rejects an English verb without its family path", () => {
    expect(() =>
      parseGeneratedWords(
        {
          suggestions: [
            {
              ...suggestion,
              senseKey: "take-over-verb-assume-control",
              word: "take over",
              grammarFacts: [],
              searchTerms: ["take over"],
              verbFamilyPath: null,
            },
          ],
        },
        "en",
      ),
    ).toThrow("Verbs must describe their verb-family path");
  });

  test("rejects a path that does not end with the current bare infinitive", () => {
    expect(() =>
      parseGeneratedWords(
        {
          suggestions: [
            {
              ...suggestion,
              verbFamilyPath: ["innern"],
            },
          ],
        },
        "de",
      ),
    ).toThrow("The verb-family path must end with the entry lemma");
  });

  test("rejects repeated nodes in a family path", () => {
    expect(() =>
      parseGeneratedWords(
        {
          suggestions: [
            {
              ...suggestion,
              verbFamilyPath: ["erinnern", "erinnern"],
            },
          ],
        },
        "de",
      ),
    ).toThrow("A verb-family path cannot repeat a lemma");
  });

  test("rejects conflicting family paths for two senses of one verb", () => {
    expect(() =>
      parseGeneratedWords(
        {
          suggestions: [
            suggestion,
            {
              ...suggestion,
              senseKey: "sich-erinnern-verb-remind",
              verbFamilyPath: ["innern", "erinnern"],
            },
          ],
        },
        "de",
      ),
    ).toThrow("Senses of the same verb must share one family path");
  });
});
