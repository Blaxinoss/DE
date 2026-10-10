import { TargetWordEvaluation } from "./schema";
import { ActivationResult } from "@/features/learning/types";

export function toActivationResult(evaluation: TargetWordEvaluation): ActivationResult {
  if (!evaluation.used || !evaluation.meaningCorrect) {
    return "could_not_use";
  }

  if (
    evaluation.usageScore <= 4 ||
    !evaluation.grammarCorrect ||
    !evaluation.collocationCorrect
  ) {
    return "needed_help";
  }

  if (evaluation.usageScore < 8 || !evaluation.naturalUsage) {
    return "effort";
  }

  return "easy";
}
