import { describe, expect, test } from "bun:test";
import type { CERF, LearningLanguage } from "@/features/learning/types";
import { allSeedEntries } from "@/features/seedPack/packs";

type PackState = "new" | "learning" | "recall";

type PackEntry = {
  language: LearningLanguage;
  level_cerf: CERF;
  starter_state: PackState;
  sense_key: string;
  word: string;
  normalized_word: string;
};

const entries = allSeedEntries as PackEntry[];

const expectedLevels = ["A1", "A2", "B1", "B2"] as const;
const expectedLanguages = ["de", "en"] as const;

function pack(language: LearningLanguage, level: CERF) {
  return entries.filter(
    (entry) => entry.language === language && entry.level_cerf === level,
  );
}

describe("starter-pack data", () => {
  for (const language of expectedLanguages) {
    for (const level of expectedLevels) {
      test(`${language.toUpperCase()} ${level} contains exactly 30 words`, () => {
        const entriesForPack = pack(language, level);

        expect(entriesForPack).toHaveLength(30);
        expect(
          entriesForPack.every((entry) =>
            ["new", "learning", "recall"].includes(entry.starter_state),
          ),
        ).toBe(true);
      });
    }
  }

  test("every language and sense key identify only one pack entry", () => {
    const identities = entries.map((entry) => `${entry.language}:${entry.sense_key}`);

    expect(new Set(identities).size).toBe(identities.length);
  });

  test("packs in the same language do not overlap across CEFR levels", () => {
    for (const language of expectedLanguages) {
      const levels = [...expectedLevels];

      for (const [index, level] of levels.entries()) {
        const currentKeys = new Set(
          pack(language, level).map((entry) => entry.sense_key),
        );

        for (const otherLevel of levels.slice(index + 1)) {
          const overlap = pack(language, otherLevel)
            .map((entry) => entry.sense_key)
            .filter((senseKey) => currentKeys.has(senseKey));

          expect(overlap).toEqual([]);
        }
      }
    }
  });

  test("normalized words are lowercase and contain no surrounding whitespace", () => {
    for (const entry of entries) {
      expect(entry.normalized_word).toBe(entry.normalized_word.trim());
      expect(entry.normalized_word).toBe(
        entry.normalized_word.toLocaleLowerCase(
          entry.language === "de" ? "de-DE" : "en-US",
        ),
      );
    }
  });
});
