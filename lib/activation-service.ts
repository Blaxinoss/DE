import "server-only";

import type { SupabaseClient, User } from "@supabase/supabase-js";
import {
  ACTIVATION_EVALUATOR_VERSION,
  ActivationActionResult,
  ActivationRequest,
  ActivationSubmission,
  activationSubmissionSchema,
} from "@/lib/ai/activation-schema";
import { evaluateActivation } from "@/lib/ai/evaluate-activation";
import { geminiModel } from "@/lib/ai/gemini-client";
import { toActivationResult } from "@/lib/ai/activation-result";
import type { Database, Json } from "@/lib/database.types";
import { languageDetails } from "@/lib/languages";
import { isActivationReady, nextState, scheduleNextReview } from "@/lib/learning";
import type { Review, Vocabulary } from "@/lib/types";

type VocabularyRow = Database["public"]["Tables"]["vocabulary"]["Row"];
type ReviewRow = Database["public"]["Tables"]["reviews"]["Row"];

type SavedLearningResult = {
  review: ReviewRow;
  vocabulary: VocabularyRow;
};

function toVocabulary(row: VocabularyRow): Vocabulary {
  return {
    id: row.id,
    language: row.language as Vocabulary["language"],
    word: row.word,
    meaningAr: row.meaning_ar,
    type: row.type as Vocabulary["type"],
    target: row.target as Vocabulary["target"],
    state: row.state as Vocabulary["state"],
    grammar: (row.grammar_json as Record<string, unknown>) ?? {},
    commonness: row.commonness,
    chunk: row.chunk,
    example: row.example,
    nextReviewAt: row.next_review_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function loadActivationWords(
  client: SupabaseClient<Database>,
  user: User,
  submission: ActivationSubmission,
): Promise<Map<string, Vocabulary>> {
  const ids = submission.attempts.flatMap((attempt) => attempt.vocabularyIds);
  const { data, error } = await client
    .from("vocabulary")
    .select("*")
    .eq("user_id", user.id)
    .in("id", ids);

  if (error) throw error;
  if (data.length !== ids.length) {
    throw new Error("ACTIVATION_WORDS_UNAVAILABLE");
  }

  const words = new Map(
    (data as VocabularyRow[]).map((row) => {
      const word = toVocabulary(row);
      return [word.id, word];
    }),
  );
  const now = new Date();

  if ([...words.values()].some((word) => !isActivationReady(word, now))) {
    throw new Error("ACTIVATION_WORDS_NOT_READY");
  }

  return words;
}

function buildGeminiRequest(
  submission: ActivationSubmission,
  words: Map<string, Vocabulary>,
): ActivationRequest {
  const languages = new Set([...words.values()].map((word) => word.language));
  if (languages.size !== 1) throw new Error("ACTIVATION_LANGUAGE_MISMATCH");

  const language = [...languages][0];
  return {
    language,
    task: languageDetails[language].activationTask,
    attempts: submission.attempts.map((attempt) => ({
      attemptId: attempt.attemptId,
      answer: attempt.answer,
      targetWords: attempt.vocabularyIds.map((id) => {
        const word = words.get(id);
        if (!word) throw new Error("ACTIVATION_WORDS_UNAVAILABLE");
        return {
          id: word.id,
          word: word.word,
          meaningAr: word.meaningAr,
          type: word.type,
          grammar: word.grammar,
          chunk: word.chunk,
          example: word.example,
        };
      }),
    })),
  };
}

async function saveLearningResults(
  client: SupabaseClient<Database>,
  words: Map<string, Vocabulary>,
  evaluation: Awaited<ReturnType<typeof evaluateActivation>>,
): Promise<SavedLearningResult[]> {
  const reviewedAt = new Date().toISOString();
  const payload = evaluation.attempts.flatMap((attempt) =>
    attempt.targetWords.map((evaluatedWord) => {
      const word = words.get(evaluatedWord.vocabularyId);
      if (!word) throw new Error("ACTIVATION_WORDS_UNAVAILABLE");

      const result = toActivationResult(evaluatedWord);
      const state = nextState(word.state, result, "activate");
      return {
        vocabulary_id: word.id,
        activation_attempt_id: attempt.attemptId,
        result,
        review_type: "activate",
        reviewed_at: reviewedAt,
        next_review_at: scheduleNextReview(state, result),
        state,
      };
    }),
  );

  const { data, error } = await client.rpc("record_learning_results", {
    p_results: payload as Json,
  });

  if (error) throw error;
  if (!Array.isArray(data) || data.length !== payload.length) {
    throw new Error("ACTIVATION_SAVE_INCOMPLETE");
  }

  return data as unknown as SavedLearningResult[];
}

async function saveHistory(
  client: SupabaseClient<Database>,
  submission: ActivationSubmission,
  evaluation: Awaited<ReturnType<typeof evaluateActivation>>,
  savedResults: SavedLearningResult[],
): Promise<boolean> {
  const inputByAttempt = new Map(
    submission.attempts.map((attempt) => [attempt.attemptId, attempt]),
  );
  const reviewByVocabulary = new Map(
    savedResults.map((saved) => [saved.review.vocabulary_id, saved.review]),
  );

  const attempts = evaluation.attempts.map((attempt) => {
    const input = inputByAttempt.get(attempt.attemptId);
    if (!input) throw new Error("ACTIVATION_ATTEMPT_MISMATCH");

    return {
      id: attempt.attemptId,
      language: savedResults[0].vocabulary.language,
      answer: input.answer,
      correct: attempt.sentence.correct,
      corrected_answer: attempt.sentence.corrected,
      natural_suggestion: attempt.sentence.suggestion,
      feedback_ar: attempt.sentence.feedbackAr,
      grammar_score: attempt.sentence.scores.grammar,
      naturalness_score: attempt.sentence.scores.naturalness,
      meaning_score: attempt.sentence.scores.meaning,
      errors: attempt.errors,
      model: geminiModel,
      evaluator_version: ACTIVATION_EVALUATOR_VERSION,
    };
  });

  const wordResults = evaluation.attempts.flatMap((attempt) =>
    attempt.targetWords.map((word) => {
      const review = reviewByVocabulary.get(word.vocabularyId);
      if (!review) throw new Error("ACTIVATION_REVIEW_MISMATCH");

      return {
        attempt_id: attempt.attemptId,
        review_id: review.id,
        vocabulary_id: word.vocabularyId,
        word_snapshot: word.word,
        used: word.used,
        meaning_correct: word.meaningCorrect,
        grammar_correct: word.grammarCorrect,
        natural_usage: word.naturalUsage,
        collocation_correct: word.collocationCorrect,
        usage_score: word.usageScore,
        feedback_ar: word.feedbackAr,
      };
    }),
  );

  const { error } = await client.rpc("save_activation_history", {
    p_attempts: attempts as Json,
    p_word_results: wordResults as Json,
  });

  if (!error) return true;

  console.error("Activation progress saved, but history persistence failed", error);
  return false;
}

export async function activateAndSave(
  client: SupabaseClient<Database>,
  user: User,
  rawInput: unknown,
): Promise<Extract<ActivationActionResult, { ok: true }>> {
  const submission = activationSubmissionSchema.parse(rawInput);
  const words = await loadActivationWords(client, user, submission);
  const evaluation = await evaluateActivation(buildGeminiRequest(submission, words));
  const savedResults = await saveLearningResults(client, words, evaluation);
  let historySaved = false;

  try {
    historySaved = await saveHistory(client, submission, evaluation, savedResults);
  } catch (error) {
    console.error("Activation progress saved, but history preparation failed", error);
  }

  return {
    ok: true,
    evaluation,
    updatedWords: savedResults.map(({ vocabulary }) => ({
      id: vocabulary.id,
      state: vocabulary.state as Vocabulary["state"],
      nextReviewAt: vocabulary.next_review_at,
      updatedAt: vocabulary.updated_at,
    })),
    savedReviews: savedResults.map(({ review }) => ({
      id: review.id,
      vocabularyId: review.vocabulary_id,
      result: review.result as Review["result"],
      reviewType: review.review_type as Review["reviewType"],
      reviewedAt: review.reviewed_at,
    })),
    historySaved,
    warning: historySaved
      ? undefined
      : "Your progress was saved, but this attempt could not be added to history.",
  };
}
