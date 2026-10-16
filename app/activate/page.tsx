"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ActivationFeedback } from "@/features/activation/components/activation-feedback";
import { useVocabulary } from "@/features/vocabulary/components/vocabulary-provider";
import { EmptyState, LoadingState, PageHeader, StateBadge } from "@/components/ui";
import {
  ACTIVATION_EXERCISES_PER_REQUEST,
  ACTIVATION_WORDS_PER_EXERCISE,
  ActivationResponse,
  ActivationSubmission,
  activationResponseSchema,
} from "@/features/activation/schema";
import { languageDetails } from "@/features/learning/language-config";
import { isActivationReady } from "@/features/learning/rules";
import { useCurrentTime } from "@/hooks/use-current-time";
import { submitActivation } from "@/features/activation/submit-activation";
import { WordIdentity } from "@/features/vocabulary/components/word-identity";
import { toast } from "sonner";

export default function ActivatePage() {
  const { language, words, loading, applyLearningResults } = useVocabulary();
  const details = languageDetails[language];
  const task = details.activationTask;
  const now = useCurrentTime();
  const readyWords = useMemo(
    () => words.filter((word) => isActivationReady(word, now)),
    [words, now],
  );

  const [completedIds, setCompletedIds] = useState<string[]>([]);
  const [pendingAttempts, setPendingAttempts] = useState<
    ActivationSubmission["attempts"]
  >([]);
  const [text, setText] = useState("");
  const [evaluation, setEvaluation] = useState<ActivationResponse | null>(null);
  const [evaluatedAttempts, setEvaluatedAttempts] = useState<
    ActivationSubmission["attempts"]
  >([]);
  const [busy, setBusy] = useState(false);
  const [warning, setWarning] = useState<string | null>(null);

  const stagedIds = new Set(
    pendingAttempts.flatMap((attempt) => attempt.vocabularyIds),
  );
  const remainingWords = readyWords.filter(
    (word) => !completedIds.includes(word.id) && !stagedIds.has(word.id),
  );
  const activeBatch = remainingWords.slice(0, ACTIVATION_WORDS_PER_EXERCISE);
  const attemptsAfterCurrent = pendingAttempts.length + 1;
  const currentIsLastExercise = remainingWords.length <= activeBatch.length;
  const currentWillTriggerEvaluation =
    attemptsAfterCurrent >= ACTIVATION_EXERCISES_PER_REQUEST || currentIsLastExercise;

  if (loading) return <LoadingState />;

  const createCurrentAttempt = (): ActivationSubmission["attempts"][number] => ({
    attemptId: crypto.randomUUID(),
    answer: text.trim(),
    vocabularyIds: activeBatch.map((word) => word.id),
  });

  const evaluateAttempts = async (attempts: ActivationSubmission["attempts"]) => {
    setBusy(true);
    setWarning(null);

    try {
      const actionResult = await submitActivation({ attempts });
      if (!actionResult.ok) throw new Error(actionResult.error);

      const result = activationResponseSchema.parse(actionResult.evaluation);
      applyLearningResults(actionResult.updatedWords, actionResult.savedReviews);

      const evaluatedIds = attempts.flatMap((attempt) => attempt.vocabularyIds);
      setCompletedIds((current) => [...new Set([...current, ...evaluatedIds])]);
      setPendingAttempts([]);
      setText("");
      setEvaluatedAttempts(attempts);
      setEvaluation(result);
      setWarning(actionResult.warning ?? null);
      toast.success("Activation evaluated", {
        description: `${evaluatedIds.length} ${evaluatedIds.length === 1 ? "word was" : "words were"} updated.`,
      });
    } catch (reason) {
      toast.error("The AI evaluation failed", {
        description: reason instanceof Error ? reason.message : "Please try again.",
      });
    } finally {
      setBusy(false);
    }
  };

  const submitCurrentExercise = async () => {
    if (!text.trim() || !activeBatch.length) return;

    const attempts = [...pendingAttempts, createCurrentAttempt()];
    if (currentWillTriggerEvaluation) {
      await evaluateAttempts(attempts);
      return;
    }

    setPendingAttempts(attempts);
    setText("");
    toast.info("Exercise saved for this evaluation", {
      description: `${attempts.length}/${ACTIVATION_EXERCISES_PER_REQUEST} exercises queued.`,
    });
  };

  const evaluateNow = async () => {
    const attempts = text.trim()
      ? [...pendingAttempts, createCurrentAttempt()]
      : pendingAttempts;
    if (!attempts.length) return;
    await evaluateAttempts(attempts);
  };

  const nextRound = () => {
    setText("");
    setEvaluation(null);
    setEvaluatedAttempts([]);
    setWarning(null);
  };

  const restartSession = () => {
    setCompletedIds([]);
    setPendingAttempts([]);
    nextRound();
  };

  const completedOrStagedCount = completedIds.length + stagedIds.size;
  const evaluationCount =
    pendingAttempts.length + (text.trim() && activeBatch.length ? 1 : 0);

  return (
    <>
      <PageHeader
        eyebrow="Production practice"
        title="Activate"
        description="Write naturally. Up to three short exercises are evaluated together to keep feedback accurate and efficient."
        action={
          readyWords.length ? (
            <div className="flex flex-wrap gap-2 text-sm font-bold">
              <span className="chip px-3 py-2">{readyWords.length} ready</span>
              <span className="rounded-full border border-[var(--blue-line)] bg-[var(--blue-soft)] px-3 py-2 text-[var(--blue)]">
                {pendingAttempts.length}/{ACTIVATION_EXERCISES_PER_REQUEST} queued
              </span>
            </div>
          ) : undefined
        }
      />

      {warning && (
        <div
          className="mb-5 rounded-xl border border-[#5a4b28] bg-[#30291b] p-4 text-sm font-semibold text-[var(--amber)]"
          role="status"
        >
          {warning}
        </div>
      )}

      {evaluation ? (
        <ActivationFeedback
          evaluation={evaluation}
          language={language}
          answers={evaluatedAttempts}
          remaining={remainingWords.length}
          onContinue={nextRound}
          onRestart={restartSession}
        />
      ) : !readyWords.length ? (
        <EmptyState
          title="No words are ready to activate"
          text="Active-target words appear here when they reach Recall and their scheduled practice time is due. New, Learning and already Active words stay in their appropriate stage."
          action={
            <Link
              className="btn-primary"
              href="/vocabulary"
            >
              View vocabulary
            </Link>
          }
        />
      ) : (
        <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
          <section className="surface p-6 sm:p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="eyebrow">
                  Exercise {pendingAttempts.length + 1} of{" "}
                  {ACTIVATION_EXERCISES_PER_REQUEST}
                </p>
                <h2 className="mt-2 text-2xl font-black text-[var(--ink)]">
                  {task.title}
                </h2>
              </div>
              <span className="text-sm font-bold text-[var(--muted)]">
                {completedOrStagedCount + 1}–
                {completedOrStagedCount + activeBatch.length} of{" "}
                {completedOrStagedCount + remainingWords.length}
              </span>
            </div>
            <p className="mt-2 text-base leading-relaxed text-[var(--muted)]">
              {task.instructions} Try to use all {activeBatch.length} words.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              {activeBatch.map((word) => (
                <span
                  key={word.id}
                  className="rounded-xl border border-[var(--blue-line)] bg-[var(--blue-soft)] px-3 py-2"
                >
                  <WordIdentity
                    word={word.word}
                    type={word.type}
                    grammar={word.grammar}
                    language={language}
                    className="text-sm"
                  />
                </span>
              ))}
            </div>
            <textarea
              className="field mt-6 min-h-64 resize-y p-4 leading-relaxed"
              value={text}
              onChange={(event) => setText(event.target.value)}
              placeholder={task.answerPlaceholder}
              lang={language}
              disabled={busy}
            />
            <p className="mt-2 text-right text-xs font-bold text-[var(--muted)]">
              {text.trim() ? text.trim().split(/\s+/).length : 0} words
            </p>
          </section>

          <aside className="surface flex flex-col p-5 sm:p-6">
            <p className="eyebrow">Target words</p>
            <h2 className="mt-2 text-xl font-black text-[var(--ink)]">
              {pendingAttempts.length
                ? `${pendingAttempts.length} exercise${pendingAttempts.length === 1 ? "" : "s"} waiting`
                : "Build an evaluation group"}
            </h2>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
              Gemini receives at most {ACTIVATION_EXERCISES_PER_REQUEST} exercises and{" "}
              {ACTIVATION_WORDS_PER_EXERCISE * ACTIVATION_EXERCISES_PER_REQUEST} target
              words in one request.
            </p>

            <div className="mt-5 flex-1 space-y-4">
              {activeBatch.map((word) => (
                <div
                  key={word.id}
                  className="border-b border-[var(--line)] pb-4 last:border-0"
                >
                  <div className="flex items-center justify-between gap-2">
                    <WordIdentity
                      word={word.word}
                      type={word.type}
                      grammar={word.grammar}
                      language={language}
                      className="text-base"
                    />
                    <StateBadge state={word.state} />
                  </div>
                  {word.chunk && (
                    <p
                      className="mt-2 text-sm text-[var(--blue)]"
                      lang={language}
                    >
                      {word.chunk}
                    </p>
                  )}
                </div>
              ))}
            </div>

            <button
              className="btn-primary mt-5 w-full"
              disabled={!text.trim() || busy || !activeBatch.length}
              onClick={() => void submitCurrentExercise()}
            >
              {busy
                ? "Evaluating…"
                : currentWillTriggerEvaluation
                  ? `Evaluate ${attemptsAfterCurrent} exercise${attemptsAfterCurrent === 1 ? "" : "s"}`
                  : `Save & next words (${attemptsAfterCurrent}/${ACTIVATION_EXERCISES_PER_REQUEST})`}
            </button>

            {pendingAttempts.length > 0 && (
              <button
                className="btn-secondary mt-2 w-full"
                disabled={busy}
                onClick={() => void evaluateNow()}
              >
                Evaluate now ({evaluationCount})
              </button>
            )}

            <p className="mt-3 text-center text-xs leading-5 text-[var(--muted)]">
              Reviews are saved only after the whole group passes validation.
            </p>
          </aside>
        </div>
      )}
    </>
  );
}
