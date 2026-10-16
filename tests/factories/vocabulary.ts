import type { Vocabulary } from "@/features/learning/types";

export function makeVocabulary(overrides: Partial<Vocabulary> = {}): Vocabulary {
  return {
    id: crypto.randomUUID(),
    language: "de",
    lexiconId: null,
    word: "lernen",
    meaningAr: "يتعلم",
    type: "verb",
    target: "active",
    state: "new",
    grammar: {},
    commonness: "common",
    chunk: null,
    example: null,
    nextReviewAt: null,
    createdAt: "2026-10-10T00:00:00.000Z",
    updatedAt: "2026-10-10T00:00:00.000Z",
    ...overrides,
  };
}
