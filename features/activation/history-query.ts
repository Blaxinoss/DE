import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { activationErrorSchema } from "@/features/activation/schema";
import type { Database } from "@/lib/database.types";
import type { LearningLanguage } from "@/features/learning/types";

export const ACTIVATION_HISTORY_PAGE_SIZE = 20;

type AttemptRow = Database["public"]["Tables"]["activation_attempts"]["Row"];
type WordResultRow = Database["public"]["Tables"]["activation_word_results"]["Row"];

export type ActivationHistoryAttempt = {
  id: string;
  language: LearningLanguage;
  answer: string;
  correct: boolean;
  correctedAnswer: string | null;
  naturalSuggestion: string | null;
  feedbackAr: string;
  scores: {
    grammar: number;
    naturalness: number;
    meaning: number;
  };
  errors: z.infer<typeof activationErrorSchema>[];
  model: string;
  evaluatorVersion: number;
  createdAt: string;
  words: Array<{
    id: string;
    word: string;
    used: boolean;
    meaningCorrect: boolean;
    grammarCorrect: boolean;
    naturalUsage: boolean;
    collocationCorrect: boolean;
    usageScore: number;
    feedbackAr: string | null;
  }>;
};

type AttemptWithWords = AttemptRow & {
  activation_word_results: WordResultRow[];
};

export async function getActivationHistory(
  client: SupabaseClient<Database>,
  language: LearningLanguage,
  page: number,
): Promise<{ attempts: ActivationHistoryAttempt[]; total: number }> {
  const from = (page - 1) * ACTIVATION_HISTORY_PAGE_SIZE;
  const to = from + ACTIVATION_HISTORY_PAGE_SIZE - 1;
  const { data, error, count } = await client
    .from("activation_attempts")
    .select(
      `
        *,
        activation_word_results (*)
      `,
      { count: "exact" },
    )
    .eq("language", language)
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) throw error;

  return {
    total: count ?? 0,
    attempts: (data as AttemptWithWords[]).map((attempt) => {
      const parsedErrors = z
        .array(activationErrorSchema)
        .safeParse(attempt.errors_json);

      return {
        id: attempt.id,
        language: attempt.language as LearningLanguage,
        answer: attempt.answer,
        correct: attempt.correct,
        correctedAnswer: attempt.corrected_answer,
        naturalSuggestion: attempt.natural_suggestion,
        feedbackAr: attempt.feedback_ar,
        scores: {
          grammar: attempt.grammar_score,
          naturalness: attempt.naturalness_score,
          meaning: attempt.meaning_score,
        },
        errors: parsedErrors.success ? parsedErrors.data : [],
        model: attempt.model,
        evaluatorVersion: attempt.evaluator_version,
        createdAt: attempt.created_at,
        words: attempt.activation_word_results
          .sort((a, b) => a.word_snapshot.localeCompare(b.word_snapshot))
          .map((word) => ({
            id: word.id,
            word: word.word_snapshot,
            used: word.used,
            meaningCorrect: word.meaning_correct,
            grammarCorrect: word.grammar_correct,
            naturalUsage: word.natural_usage,
            collocationCorrect: word.collocation_correct,
            usageScore: word.usage_score,
            feedbackAr: word.feedback_ar,
          })),
      };
    }),
  };
}
