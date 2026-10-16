import { describe, expect, test } from "bun:test";
import { makeVocabulary } from "@/tests/factories/vocabulary";
import { buildExport, parseImport } from "./import-export";
import type { Review } from "@/features/learning/types";

describe("parseImport", () => {
  test.each([
    ["recognition", "learning"],
    ["passive", "learning"],
    ["slow_recall", "recall"],
    ["usable", "recall"],
  ] as const)("maps the legacy %s state to %s", (legacyState, expectedState) => {
    const [word] = parseImport(
      JSON.stringify({ words: [{ word: "lernen", state: legacyState }] }),
    );

    expect(word?.state).toBe(expectedState);
  });

  test("rejects malformed JSON and invalid top-level shapes", () => {
    expect(() => parseImport("{broken-json")).toThrow();
    expect(() => parseImport(JSON.stringify({ vocabulary: [] }))).toThrow(
      'Expected a JSON object with a "words" array.',
    );
  });

  test("rejects imported items without a word", () => {
    expect(() =>
      parseImport(JSON.stringify({ words: [{ meaningAr: "يتعلم" }] })),
    ).toThrow("Every imported item needs a word in German.");
  });

  test("rejects null items instead of importing an empty record", () => {
    expect(() => parseImport(JSON.stringify({ words: [null] }))).toThrow();
  });
});

describe("buildExport", () => {
  test("exports only the selected course language", () => {
    const german = makeVocabulary({ language: "de", word: "lernen" });
    const english = makeVocabulary({ language: "en", word: "learn" });

    expect(
      buildExport([german, english], [], "de").words.map((word) => word.word),
    ).toEqual(["lernen"]);
    expect(
      buildExport([german, english], [], "en").words.map((word) => word.word),
    ).toEqual(["learn"]);
  });

  test("preserves learning fields through an export-import round trip", () => {
    const original = makeVocabulary({
      word: "sich erinnern",
      meaningAr: "يتذكر",
      type: "verb",
      target: "passive",
      state: "recall",
      grammar: { reflexive: true, preposition: "an + Akk." },
      chunk: "sich an etwas erinnern",
      example: "Ich erinnere mich daran.",
    });
    const review: Review = {
      id: crypto.randomUUID(),
      vocabularyId: original.id,
      result: "instant",
      reviewType: "review",
      reviewedAt: "2026-10-10T00:00:00.000Z",
    };

    const exported = buildExport([original], [review], "de");
    const [imported] = parseImport(JSON.stringify(exported), "de");

    expect(imported).toMatchObject({
      word: original.word,
      meaningAr: original.meaningAr,
      type: original.type,
      target: original.target,
      state: original.state,
      grammar: original.grammar,
      chunk: original.chunk,
      example: original.example,
    });
  });
});
