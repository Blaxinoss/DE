import {
  activationResponseSchema,
  type ActivationAttemptRequest,
  type ActivationAttemptResponse,
  type ActivationRequest,
  type ActivationResponse,
} from "./schema";

function validateWordCoverage(
  input: ActivationAttemptRequest,
  output: ActivationAttemptResponse,
): void {
  const expectedWords = new Map(input.targetWords.map((word) => [word.id, word.word]));
  const returnedIds = output.targetWords.map((word) => word.vocabularyId);

  if (
    returnedIds.length !== expectedWords.size ||
    new Set(returnedIds).size !== returnedIds.length ||
    returnedIds.some((id) => !expectedWords.has(id))
  ) {
    throw new Error(
      `Gemini returned incomplete target-word coverage for attempt ${input.attemptId}`,
    );
  }

  if (
    output.targetWords.some(
      (word) => expectedWords.get(word.vocabularyId) !== word.word,
    )
  ) {
    throw new Error(`Gemini changed a target word in attempt ${input.attemptId}`);
  }

  if (
    output.errors.some((error) =>
      error.targetWordIds.some((id) => !expectedWords.has(id)),
    )
  ) {
    throw new Error(
      `Gemini returned an unknown target-word id for attempt ${input.attemptId}`,
    );
  }
}

function validateAttemptCoverage(
  input: ActivationRequest,
  output: ActivationResponse,
): void {
  const expectedAttempts = new Map(
    input.attempts.map((attempt) => [attempt.attemptId, attempt]),
  );
  const returnedIds = output.attempts.map((attempt) => attempt.attemptId);

  if (
    returnedIds.length !== expectedAttempts.size ||
    new Set(returnedIds).size !== returnedIds.length ||
    returnedIds.some((id) => !expectedAttempts.has(id))
  ) {
    throw new Error("Gemini returned incomplete attempt coverage");
  }

  for (const outputAttempt of output.attempts) {
    const inputAttempt = expectedAttempts.get(outputAttempt.attemptId);
    if (!inputAttempt) {
      throw new Error("Gemini returned an unknown attempt id");
    }
    validateWordCoverage(inputAttempt, outputAttempt);

    const normalize = (value: string) =>
      value.normalize("NFKC").trim().replace(/\s+/g, " ").toLocaleLowerCase();
    const original = normalize(inputAttempt.answer);
    const corrected = outputAttempt.sentence.corrected
      ? normalize(outputAttempt.sentence.corrected)
      : null;
    const suggestion = outputAttempt.sentence.suggestion
      ? normalize(outputAttempt.sentence.suggestion)
      : null;
    const alreadyNatural =
      outputAttempt.sentence.scores.naturalness >= 8 &&
      outputAttempt.targetWords.every((word) => word.naturalUsage);

    if (
      suggestion &&
      (alreadyNatural || suggestion === original || suggestion === corrected)
    ) {
      outputAttempt.sentence.suggestion = null;
    }

    if (corrected === original && !outputAttempt.sentence.correct) {
      throw new Error(
        "An incorrect answer needs a correction that differs from the original",
      );
    }

    if (corrected === original) {
      outputAttempt.sentence.corrected = null;
    }
  }
}

export function parseActivationEvaluation(
  input: ActivationRequest,
  responseText: string,
): ActivationResponse {
  const output = activationResponseSchema.parse(JSON.parse(responseText));
  validateAttemptCoverage(input, output);
  return output;
}
