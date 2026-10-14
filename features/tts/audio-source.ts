import type { LearningLanguage, WordType } from "@/features/learning/types";

export type AudioSourceEntry = {
  language: LearningLanguage;
  word: string;
  type: WordType;
  grammar: Record<string, unknown>;
  example: string | null;
};

function normalizeSpeechText(value: string): string {
  return value.normalize("NFC").trim().replace(/\s+/g, " ");
}

function germanNounWithArticle(entry: AudioSourceEntry, word: string): string {
  if (entry.language !== "de" || entry.type !== "noun") return word;

  const rawArticle = entry.grammar.article;
  if (typeof rawArticle !== "string") return word;

  const article = normalizeSpeechText(rawArticle);
  if (!article) return word;

  const normalizedWord = word.toLocaleLowerCase("de-DE");
  const normalizedPrefix = `${article.toLocaleLowerCase("de-DE")} `;

  return normalizedWord.startsWith(normalizedPrefix) ? word : `${article} ${word}`;
}

/** Builds the exact visible word and example that should be spoken. */
export function buildAudioSourceText(entry: AudioSourceEntry): string {
  const word = normalizeSpeechText(entry.word);
  const headword = germanNounWithArticle(entry, word);
  const example = entry.example ? normalizeSpeechText(entry.example) : "";

  return example ? `${headword}\n${example}` : headword;
}
