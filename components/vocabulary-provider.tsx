"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { nextState, scheduleNextReview } from "@/lib/learning";
import { normalizeWord } from "@/lib/import-export";
import { isSupabaseConfigured, repository } from "@/lib/repository";
import { LearningResult, Review, ReviewType, Vocabulary, VocabularyDraft } from "@/lib/types";

type ContextValue = {
  words: Vocabulary[]; reviews: Review[]; loading: boolean; error: string | null; demoMode: boolean;
  createWord(draft: VocabularyDraft): Promise<Vocabulary>; updateWord(id: string, draft: VocabularyDraft): Promise<Vocabulary>;
  deleteWord(id: string): Promise<void>; recordResult(id: string, result: LearningResult, reviewType: ReviewType): Promise<void>;
  importWords(drafts: VocabularyDraft[]): Promise<{ created: number; updated: number }>;
};
const VocabularyContext = createContext<ContextValue | null>(null);

export function VocabularyProvider({ children }: { children: React.ReactNode }) {
  const [words, setWords] = useState<Vocabulary[]>([]); const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true); const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => {
    try { const data = await repository.load(); setWords(data.words); setReviews(data.reviews); setError(null); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Could not load vocabulary."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  const createWord = async (draft: VocabularyDraft) => { const word = await repository.create(draft); setWords((all) => [word, ...all]); return word; };
  const updateWord = async (id: string, draft: VocabularyDraft) => { const word = await repository.update(id, draft); setWords((all) => all.map((item) => item.id === id ? word : item)); return word; };
  const deleteWord = async (id: string) => { await repository.remove(id); setWords((all) => all.filter((word) => word.id !== id)); setReviews((all) => all.filter((review) => review.vocabularyId !== id)); };
  const recordResult = async (id: string, result: LearningResult, reviewType: ReviewType) => {
    const word = words.find((item) => item.id === id); if (!word) return;
    const history = reviews.filter((review) => review.vocabularyId === id);
    const state = nextState(word.state, result, history, reviewType); const reviewedAt = new Date().toISOString();
    const review = await repository.addReview({ vocabularyId: id, result, reviewType, reviewedAt, nextReviewAt: scheduleNextReview(state, result) });
    await updateWord(id, { ...word, state }); setReviews((all) => [review, ...all]);
  };
  const importWords = async (drafts: VocabularyDraft[]) => {
    let created = 0, updated = 0;
    const known = new Map(words.map((word) => [normalizeWord(word.word), word]));
    for (const draft of drafts) {
      const key = normalizeWord(draft.word);
      const existing = known.get(key);
      if (existing) {
        const merged = await updateWord(existing.id, { ...existing, ...draft });
        known.set(key, merged); updated += 1;
      } else {
        const added = await createWord(draft);
        known.set(key, added); created += 1;
      }
    }
    return { created, updated };
  };
  const value = useMemo(() => ({ words, reviews, loading, error, demoMode: !isSupabaseConfigured, createWord, updateWord, deleteWord, recordResult, importWords }), [words, reviews, loading, error]);
  return <VocabularyContext.Provider value={value}>{children}</VocabularyContext.Provider>;
}

export function useVocabulary() {
  const value = useContext(VocabularyContext); if (!value) throw new Error("useVocabulary must be used inside VocabularyProvider"); return value;
}
