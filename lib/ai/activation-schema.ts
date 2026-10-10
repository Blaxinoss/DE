import { z } from "zod";
import { learningLanguages } from "@/lib/types";
import type { Review, VocabularyLearningUpdate } from "@/lib/types";

export const ACTIVATION_WORDS_PER_EXERCISE = 4;
export const ACTIVATION_EXERCISES_PER_REQUEST = 3;
export const ACTIVATION_EVALUATOR_VERSION = 1;
export const ACTIVATION_MAX_WORDS_PER_REQUEST =
  ACTIVATION_WORDS_PER_EXERCISE * ACTIVATION_EXERCISES_PER_REQUEST;

const taskSchema = z.object({
  title: z.string().min(1).max(200),
  instructions: z.string().min(1).max(1000),
});

const targetWordInputSchema = z.object({
  id: z.uuid(),
  word: z.string().min(1).max(100),
  meaningAr: z.string().max(500),
  type: z.enum(["noun", "verb", "adjective", "adverb", "expression", "other"]),
  grammar: z.record(z.string(), z.unknown()),
  chunk: z.string().max(500).nullable(),
  example: z.string().max(1000).nullable(),
});

export const activationAttemptRequestSchema = z.object({
  attemptId: z.uuid(),
  answer: z.string().min(1).max(5000),
  targetWords: z.array(targetWordInputSchema).min(1).max(ACTIVATION_WORDS_PER_EXERCISE),
});

export const activationRequestSchema = z
  .object({
    language: z.enum(learningLanguages),
    task: taskSchema,
    attempts: z
      .array(activationAttemptRequestSchema)
      .min(1)
      .max(ACTIVATION_EXERCISES_PER_REQUEST),
  })
  .superRefine((input, context) => {
    const attemptIds = input.attempts.map((attempt) => attempt.attemptId);
    if (new Set(attemptIds).size !== attemptIds.length) {
      context.addIssue({
        code: "custom",
        message: "Attempt ids must be unique",
        path: ["attempts"],
      });
    }

    const wordIds = input.attempts.flatMap((attempt) =>
      attempt.targetWords.map((word) => word.id),
    );
    if (wordIds.length > ACTIVATION_MAX_WORDS_PER_REQUEST) {
      context.addIssue({
        code: "custom",
        message: `A request may contain at most ${ACTIVATION_MAX_WORDS_PER_REQUEST} target words`,
        path: ["attempts"],
      });
    }
    if (new Set(wordIds).size !== wordIds.length) {
      context.addIssue({
        code: "custom",
        message: "Target-word ids must be unique across attempts",
        path: ["attempts"],
      });
    }
  });

export const targetWordEvaluationSchema = z.object({
  vocabularyId: z.uuid(),
  word: z.string(),
  used: z.boolean(),
  meaningCorrect: z.boolean(),
  grammarCorrect: z.boolean(),
  naturalUsage: z.boolean(),
  collocationCorrect: z.boolean(),
  usageScore: z.number().int().min(0).max(10),
  feedbackAr: z.string().nullable(),
});

export const activationErrorSchema = z.object({
  type: z.enum([
    "grammar",
    "meaning",
    "naturalness",
    "collocation",
    "word_order",
    "spelling",
    "other",
  ]),
  severity: z.enum(["minor", "major"]),
  original: z.string(),
  correction: z.string(),
  explanationAr: z.string(),
  targetWordIds: z.array(z.string().uuid()),
});

export const activationAttemptResponseSchema = z.object({
  attemptId: z.uuid(),
  sentence: z.object({
    correct: z.boolean(),
    corrected: z.string().nullable(),
    scores: z.object({
      grammar: z.number().int().min(0).max(10),
      naturalness: z.number().int().min(0).max(10),
      meaning: z.number().int().min(0).max(10),
    }),
    feedbackAr: z.string(),
    suggestion: z.string().nullable(),
  }),
  errors: z.array(activationErrorSchema),
  targetWords: z.array(targetWordEvaluationSchema),
});

export const activationResponseSchema = z.object({
  attempts: z
    .array(activationAttemptResponseSchema)
    .min(1)
    .max(ACTIVATION_EXERCISES_PER_REQUEST),
});

export const activationSubmissionSchema = z
  .object({
    attempts: z
      .array(
        z.object({
          attemptId: z.uuid(),
          answer: z.string().trim().min(1).max(5000),
          vocabularyIds: z.array(z.uuid()).min(1).max(ACTIVATION_WORDS_PER_EXERCISE),
        }),
      )
      .min(1)
      .max(ACTIVATION_EXERCISES_PER_REQUEST),
  })
  .superRefine((input, context) => {
    const attemptIds = input.attempts.map((attempt) => attempt.attemptId);
    if (new Set(attemptIds).size !== attemptIds.length) {
      context.addIssue({
        code: "custom",
        message: "Attempt ids must be unique",
        path: ["attempts"],
      });
    }

    for (const [index, attempt] of input.attempts.entries()) {
      if (new Set(attempt.vocabularyIds).size !== attempt.vocabularyIds.length) {
        context.addIssue({
          code: "custom",
          message: "Vocabulary ids must be unique within an attempt",
          path: ["attempts", index, "vocabularyIds"],
        });
      }
    }

    const vocabularyIds = input.attempts.flatMap((attempt) => attempt.vocabularyIds);
    if (new Set(vocabularyIds).size !== vocabularyIds.length) {
      context.addIssue({
        code: "custom",
        message: "Vocabulary ids must be unique across attempts",
        path: ["attempts"],
      });
    }
  });

export type ActivationAttemptRequest = z.infer<typeof activationAttemptRequestSchema>;
export type ActivationRequest = z.infer<typeof activationRequestSchema>;
export type ActivationAttemptResponse = z.infer<typeof activationAttemptResponseSchema>;
export type ActivationResponse = z.infer<typeof activationResponseSchema>;
export type TargetWordEvaluation = z.infer<typeof targetWordEvaluationSchema>;
export type ActivationSubmission = z.infer<typeof activationSubmissionSchema>;
export type ActivationActionResult =
  | {
      ok: true;
      evaluation: ActivationResponse;
      updatedWords: VocabularyLearningUpdate[];
      savedReviews: Review[];
      historySaved: boolean;
      warning?: string;
    }
  | { ok: false; error: string };
