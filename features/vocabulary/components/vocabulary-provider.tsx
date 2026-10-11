"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { usePathname } from "next/navigation";
import { nextState, scheduleNextReview } from "@/features/learning/rules";
import { normalizeWord } from "@/features/vocabulary/import-export";
import { vocabularyRepository } from "@/features/vocabulary/vocabulary-repository";
import { isSupabaseConfigured } from "@/lib/supabase/browser";
import {
  LearningResult,
  LearningLanguage,
  Review,
  ReviewType,
  Vocabulary,
  VocabularyDraft,
  VocabularyLearningUpdate,
} from "@/features/learning/types";

type ContextValue = {
  language: LearningLanguage;
  switchingLanguage: boolean;
  words: Vocabulary[];
  reviews: Review[];
  loading: boolean;
  error: string | null;
  databaseConnected: boolean;
  setLearningLanguage(language: LearningLanguage): Promise<void>;
  createWord(draft: VocabularyDraft): Promise<Vocabulary>;
  createWords(drafts: VocabularyDraft[]): Promise<Vocabulary[]>;
  updateWord(id: string, draft: VocabularyDraft): Promise<Vocabulary>;
  deleteWord(id: string): Promise<void>;
  recordResult(
    id: string,
    result: LearningResult,
    reviewType: ReviewType,
  ): Promise<void>;
  recordResults(
    results: Array<{
      id: string;
      result: LearningResult;
      reviewType: ReviewType;
    }>,
  ): Promise<void>;
  applyLearningResults(
    updatedWords: VocabularyLearningUpdate[],
    savedReviews: Review[],
  ): void;
  importWords(drafts: VocabularyDraft[]): Promise<{ created: number; updated: number }>;
};
const VocabularyContext = createContext<ContextValue | null>(null);

export function VocabularyProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuthPage = pathname === "/" || pathname === "/signup";
  const [words, setWords] = useState<Vocabulary[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [language, setLanguage] = useState<LearningLanguage>("de");
  const [switchingLanguage, setSwitchingLanguage] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => {
    try {
      const data = await vocabularyRepository.loadCourseData();
      setLanguage(data.language);
      setWords(data.words);
      setReviews(data.reviews);
      setError(null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not load vocabulary.");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    if (isAuthPage) {
      setLoading(false);
      return;
    }

    setLoading(true);
    void load();
  }, [isAuthPage, load]);
  const changeLearningLanguage = async (nextLanguage: LearningLanguage) => {
    if (nextLanguage === language || switchingLanguage) return;

    setSwitchingLanguage(true);
    setLoading(true);
    try {
      await vocabularyRepository.setLearningLanguage(nextLanguage);
      const data = await vocabularyRepository.loadCourseData(nextLanguage);
      setLanguage(data.language);
      setWords(data.words);
      setReviews(data.reviews);
      setError(null);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Could not change the learning language.",
      );
    } finally {
      setLoading(false);
      setSwitchingLanguage(false);
    }
  };
  const createWords = async (drafts: VocabularyDraft[]) => {
    const createdWords = await vocabularyRepository.createWords(drafts, language);
    setWords((all) => [...createdWords, ...all]);
    return createdWords;
  };
  const createWord = async (draft: VocabularyDraft) => {
    const [word] = await createWords([draft]);
    if (!word) throw new Error("Could not create the word.");
    return word;
  };
  const updateWord = async (id: string, draft: VocabularyDraft) => {
    const word = await vocabularyRepository.updateWord(id, draft);
    setWords((all) => all.map((item) => (item.id === id ? word : item)));
    return word;
  };
  const deleteWord = async (id: string) => {
    await vocabularyRepository.deleteWord(id);
    setWords((all) => all.filter((word) => word.id !== id));
    setReviews((all) => all.filter((review) => review.vocabularyId !== id));
  };
  const recordResults = async (
    results: Array<{
      id: string;
      result: LearningResult;
      reviewType: ReviewType;
    }>,
  ) => {
    const uniqueIds = new Set(results.map((result) => result.id));
    if (uniqueIds.size !== results.length) {
      throw new Error("A learning batch cannot contain the same word twice.");
    }

    const reviewedAt = new Date().toISOString();
    const updates = results.map(({ id, result, reviewType }) => {
      const word = words.find((item) => item.id === id);
      if (!word) {
        throw new Error("A word in this learning batch is no longer available.");
      }

      const state = nextState(word.state, result, reviewType);
      return {
        review: {
          vocabularyId: id,
          result,
          reviewType,
          reviewedAt,
        },
        state,
        nextReviewAt: scheduleNextReview(state, result),
      };
    });

    const saved = await vocabularyRepository.recordLearningResults(updates);
    const savedWords = new Map(saved.map((item) => [item.word.id, item.word]));

    setWords((all) => all.map((word) => savedWords.get(word.id) ?? word));
    setReviews((all) => [...saved.map((item) => item.review), ...all]);
  };
  const recordResult = async (
    id: string,
    result: LearningResult,
    reviewType: ReviewType,
  ) => {
    await recordResults([{ id, result, reviewType }]);
  };
  const applyLearningResults = (
    updatedWords: VocabularyLearningUpdate[],
    savedReviews: Review[],
  ) => {
    const updates = new Map(updatedWords.map((word) => [word.id, word]));
    setWords((all) =>
      all.map((word) => {
        const update = updates.get(word.id);
        return update ? { ...word, ...update } : word;
      }),
    );
    setReviews((all) => [...savedReviews, ...all]);
  };
  const importWords = async (drafts: VocabularyDraft[]) => {
    let created = 0,
      updated = 0;
    const known = new Map(
      words.map((word) => [normalizeWord(word.word, language), word]),
    );
    for (const draft of drafts) {
      const key = normalizeWord(draft.word, language);
      const existing = known.get(key);
      if (existing) {
        const merged = await updateWord(existing.id, { ...existing, ...draft });
        known.set(key, merged);
        updated += 1;
      } else {
        const added = await createWord(draft);
        known.set(key, added);
        created += 1;
      }
    }
    return { created, updated };
  };
  const value = useMemo(
    () => ({
      language,
      switchingLanguage,
      words,
      reviews,
      loading,
      error,
      databaseConnected: isSupabaseConfigured,
      setLearningLanguage: changeLearningLanguage,
      createWord,
      createWords,
      updateWord,
      deleteWord,
      recordResult,
      recordResults,
      applyLearningResults,
      importWords,
    }),
    [language, switchingLanguage, words, reviews, loading, error],
  );
  return (
    <VocabularyContext.Provider value={value}>{children}</VocabularyContext.Provider>
  );
}

export function useVocabulary() {
  const value = useContext(VocabularyContext);
  if (!value) throw new Error("useVocabulary must be used inside VocabularyProvider");
  return value;
}
