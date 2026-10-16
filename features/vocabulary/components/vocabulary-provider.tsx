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
import { toast } from "sonner";
import { nextState, scheduleNextReview } from "@/features/learning/rules";
import { normalizeWord } from "@/features/vocabulary/import-export";
import { vocabularyRepository } from "@/features/vocabulary/vocabulary-repository";
import { isSupabaseConfigured } from "@/lib/supabase/browser";
import {
  LearningResult,
  LearningLanguage,
  CERF,
  Review,
  ReviewType,
  Vocabulary,
  VocabularyDraft,
  VocabularyLearningUpdate,
} from "@/features/learning/types";
import { seedUserVocabulary } from "@/features/seedPack/action";

type ContextValue = {
  language: LearningLanguage;
  showGuide: boolean;
  switchingLanguage: boolean;
  showSeed: boolean;
  seededLanguages: LearningLanguage[];
  words: Vocabulary[];
  reviews: Review[];
  loading: boolean;
  error: string | null;
  databaseConnected: boolean;
  openSeed(): void;
  closeSeed(): void;
  hideGuide(): void;
  setLearningLanguage(language: LearningLanguage): Promise<void>;
  createWord(draft: VocabularyDraft): Promise<Vocabulary>;
  createWords(drafts: VocabularyDraft[]): Promise<Vocabulary[]>;
  updateWord(id: string, draft: VocabularyDraft): Promise<Vocabulary>;
  deleteWord(id: string): Promise<void>;
  seedVocabularyCERF(level: CERF): ReturnType<typeof seedUserVocabulary>;
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
  const isAuthPage = ["/", "/signup", "/forgot-password", "/reset-password"].includes(
    pathname,
  );
  const [words, setWords] = useState<Vocabulary[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [language, setLanguage] = useState<LearningLanguage>("de");
  const [showGuide, setShowGuide] = useState(false);
  const [switchingLanguage, setSwitchingLanguage] = useState(false);
  const [showSeed, setShowSeed] = useState<boolean>(false);
  const [seededLanguages, setSeededLanguages] = useState<LearningLanguage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hideGuide = useCallback(() => setShowGuide(false), []);
  const load = useCallback(async () => {
    try {
      const data = await vocabularyRepository.loadCourseData();
      setLanguage(data.language);
      setShowGuide(data.showGuide);
      setSeededLanguages(data.seededLanguages);
      setWords(data.words);
      setReviews(data.reviews);
      setError(null);
    } catch (reason) {
      const message =
        reason instanceof Error ? reason.message : "Could not load vocabulary.";
      setError(message);
      toast.error("Could not load your learning data", {
        id: "course-load-error",
        description: message,
      });
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
      setShowGuide(data.showGuide);
      setWords(data.words);
      setSeededLanguages(data.seededLanguages);
      setReviews(data.reviews);
      setError(null);
      toast.success(`${nextLanguage === "de" ? "German" : "English"} course ready`);
    } catch (reason) {
      const message =
        reason instanceof Error
          ? reason.message
          : "Could not change the learning language.";
      setError(message);
      toast.error("Could not switch language", { description: message });
    } finally {
      setLoading(false);
      setSwitchingLanguage(false);
    }
  };

  const openSeed = useCallback(() => setShowSeed(true), []);
  const closeSeed = useCallback(() => setShowSeed(false), []);

  const seedVocabularyCERF = async (level: CERF) => {
    const result = await seedUserVocabulary(level, language);

    if (!result.ok) {
      toast.error("Could not add the starter pack", {
        description: result.error,
      });
      return result;
    }

    await load();
    closeSeed();
    if (result.alreadySeeded) {
      toast.info("This language already has a starter pack");
    } else {
      toast.success("Starter pack added", {
        description: `${result.insertedCount} ${language === "de" ? "German" : "English"} words are ready to learn.`,
      });
    }

    return result;
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
      showGuide,
      switchingLanguage,
      words,
      reviews,
      loading,
      error,
      databaseConnected: isSupabaseConfigured,
      hideGuide,
      setLearningLanguage: changeLearningLanguage,
      createWord,
      createWords,
      updateWord,
      deleteWord,
      seedVocabularyCERF,
      showSeed,
      seededLanguages,
      openSeed,
      closeSeed,
      recordResult,
      recordResults,
      applyLearningResults,
      importWords,
    }),
    [
      language,
      showGuide,
      switchingLanguage,
      showSeed,
      seededLanguages,
      words,
      reviews,
      loading,
      error,
    ],
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
