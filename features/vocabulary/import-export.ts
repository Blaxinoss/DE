import {
  LearningLanguage,
  Review,
  Vocabulary,
  VocabularyDraft,
  VocabularyState,
  wordTypes,
} from "@/features/learning/types";
import { languageDetails } from "@/features/learning/language-config";

const legacyStateMap: Record<string, VocabularyState> = {
  new: "new",
  recognition: "learning",
  passive: "learning",
  learning: "learning",
  slow_recall: "recall",
  usable: "recall",
  recall: "recall",
  active: "active",
};

function parseVocabularyState(value: unknown): VocabularyState {
  if (typeof value !== "string") {
    return "new";
  }

  return legacyStateMap[value] ?? "new";
}

export function normalizeWord(
  value: string,
  language: LearningLanguage = "de",
): string {
  return value
    .normalize("NFKC")
    .trim()
    .toLocaleLowerCase(languageDetails[language].locale)
    .replace(/\s+/g, " ");
}

function asDraft(
  raw: Record<string, unknown>,
  language: LearningLanguage,
): VocabularyDraft {
  const word = String(raw.word ?? "").trim();
  if (!word) {
    throw new Error(
      `Every imported item needs an ${languageDetails[language].name} word.`,
    );
  }
  const grammar = raw.grammar ?? raw.grammar_json;
  return {
    word,
    meaningAr: String(raw.meaningAr ?? raw.meaning_ar ?? "").trim(),
    type: wordTypes.includes(raw.type as never)
      ? (raw.type as VocabularyDraft["type"])
      : "other",
    target: raw.target === "passive" ? "passive" : "active",
    state: parseVocabularyState(raw.state),
    grammar:
      typeof grammar === "object" && grammar !== null
        ? (grammar as Record<string, unknown>)
        : {},
    commonness: raw.commonness ? String(raw.commonness) : null,
    chunk: raw.chunk ? String(raw.chunk) : null,
    example: raw.example ? String(raw.example) : null,
  };
}

export function parseImport(
  text: string,
  language: LearningLanguage = "de",
): VocabularyDraft[] {
  const parsed = JSON.parse(text) as unknown;
  const records = Array.isArray(parsed)
    ? parsed
    : typeof parsed === "object" &&
        parsed &&
        Array.isArray((parsed as { words?: unknown[] }).words)
      ? (parsed as { words: unknown[] }).words
      : null;
  if (!records) throw new Error('Expected a JSON object with a "words" array.');
  return records.map((item) => asDraft(item as Record<string, unknown>, language));
}

export function buildExport(
  words: Vocabulary[],
  reviews: Review[],
  language: LearningLanguage,
) {
  return {
    language,
    exportedAt: new Date().toISOString(),
    words: words.map((word) => {
      const history = reviews
        .filter((review) => review.vocabularyId === word.id)
        .slice(0, 5);
      return {
        word: word.word,
        meaningAr: word.meaningAr,
        type: word.type,
        target: word.target,
        state: word.state,
        grammar: word.grammar,
        chunk: word.chunk,
        example: word.example,
        recentFailures: history.filter((item) =>
          ["wrong", "hint", "needed_help", "could_not_use"].includes(item.result),
        ).length,
        recentReviewStatus: history[0]?.result ?? "not_reviewed",
        nextReviewAt: word.nextReviewAt,
      };
    }),
  };
}
