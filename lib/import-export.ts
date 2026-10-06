import { Review, Vocabulary, VocabularyDraft, vocabularyStates, wordTypes } from "./types";

export function normalizeWord(value: string): string {
  return value.normalize("NFKC").trim().toLocaleLowerCase("de-DE").replace(/\s+/g, " ");
}

function asDraft(raw: Record<string, unknown>): VocabularyDraft {
  const word = String(raw.word ?? "").trim();
  if (!word) throw new Error("Every imported item needs a German word.");
  const grammar = raw.grammar ?? raw.grammar_json;
  return {
    word,
    meaningAr: String(raw.meaningAr ?? raw.meaning_ar ?? "").trim(),
    type: wordTypes.includes(raw.type as never) ? raw.type as VocabularyDraft["type"] : "other",
    target: raw.target === "passive" ? "passive" : "active",
    state: vocabularyStates.includes(raw.state as never) ? raw.state as VocabularyDraft["state"] : "new",
    grammar: typeof grammar === "object" && grammar !== null ? grammar as Record<string, unknown> : {},
    commonness: raw.commonness ? String(raw.commonness) : null,
    chunk: raw.chunk ? String(raw.chunk) : null,
    example: raw.example ? String(raw.example) : null,
  };
}

export function parseImport(text: string): VocabularyDraft[] {
  const parsed = JSON.parse(text) as unknown;
  const records = Array.isArray(parsed) ? parsed : typeof parsed === "object" && parsed && Array.isArray((parsed as { words?: unknown[] }).words) ? (parsed as { words: unknown[] }).words : null;
  if (!records) throw new Error('Expected a JSON object with a "words" array.');
  return records.map((item) => asDraft(item as Record<string, unknown>));
}

export function buildExport(words: Vocabulary[], reviews: Review[]) {
  return { exportedAt: new Date().toISOString(), words: words.map((word) => {
    const history = reviews.filter((review) => review.vocabularyId === word.id).slice(0, 5);
    return { word: word.word, meaningAr: word.meaningAr, type: word.type, target: word.target, state: word.state, grammar: word.grammar, chunk: word.chunk, example: word.example,
      recentFailures: history.filter((item) => ["wrong", "hint", "needed_help", "could_not_use"].includes(item.result)).length,
      recentReviewStatus: history[0]?.result ?? "not_reviewed", nextReviewAt: history[0]?.nextReviewAt ?? null };
  }) };
}
