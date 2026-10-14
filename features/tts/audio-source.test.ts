import { describe, expect, test } from "bun:test";
import { buildAudioSourceText } from "./audio-source";

describe("buildAudioSourceText", () => {
  test("adds the article to a German noun and follows it with the example", () => {
    expect(
      buildAudioSourceText({
        language: "de",
        word: "Sorge",
        type: "noun",
        grammar: { article: "die", plural: "Sorgen" },
        example: "Ich mache mir Sorgen",
      }),
    ).toBe("die Sorge\nIch mache mir Sorgen");
  });

  test("does not repeat an article already included in the word", () => {
    expect(
      buildAudioSourceText({
        language: "de",
        word: "die Sorge",
        type: "noun",
        grammar: { article: "die" },
        example: null,
      }),
    ).toBe("die Sorge");
  });

  test("does not use an article for verbs", () => {
    expect(
      buildAudioSourceText({
        language: "de",
        word: "sich sorgen",
        type: "verb",
        grammar: { article: "die" },
        example: "Ich sorge mich um ihn.",
      }),
    ).toBe("sich sorgen\nIch sorge mich um ihn.");
  });

  test("normalizes whitespace before generating stable cache text", () => {
    expect(
      buildAudioSourceText({
        language: "en",
        word: "  take   care ",
        type: "expression",
        grammar: {},
        example: "  Take care   of yourself. ",
      }),
    ).toBe("take care\nTake care of yourself.");
  });
});
