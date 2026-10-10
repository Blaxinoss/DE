import { AlertTriangle, CheckCircle2, CircleGauge, Sparkles } from "lucide-react";
import {
  ActivationAttemptResponse,
  ActivationResponse,
} from "@/features/activation/schema";
import { toActivationResult } from "@/features/activation/map-result";
import { ActivationResult, LearningLanguage } from "@/features/learning/types";

const resultLabels: Record<ActivationResult, string> = {
  easy: "Strong use",
  effort: "Good with notes",
  needed_help: "Needs practice",
  could_not_use: "Not demonstrated",
};

const resultStyles: Record<ActivationResult, string> = {
  easy: "bg-[#17352f] text-[var(--teal)]",
  effort: "bg-[var(--blue-soft)] text-[var(--blue)]",
  needed_help: "bg-[#30291b] text-[var(--amber)]",
  could_not_use: "bg-[var(--danger-soft)] text-[var(--danger)]",
};

function Score({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-[var(--line)] bg-[var(--panel-muted)] p-3">
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="font-bold text-[var(--muted)]">{label}</span>
        <span className="font-black text-[var(--ink)]">{value}/10</span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--line)]">
        <div
          className="h-full rounded-full bg-[var(--blue-strong)]"
          style={{ width: `${value * 10}%` }}
        />
      </div>
    </div>
  );
}

function AttemptFeedback({
  attempt,
  index,
  total,
  language,
}: {
  attempt: ActivationAttemptResponse;
  index: number;
  total: number;
  language: LearningLanguage;
}) {
  return (
    <section className="surface p-5 sm:p-7">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <p className="eyebrow">
            Exercise {index + 1} of {total}
          </p>
          <div className="mt-2 flex items-center gap-2">
            {attempt.sentence.correct ? (
              <CheckCircle2
                className="text-[var(--teal)]"
                size={22}
              />
            ) : (
              <AlertTriangle
                className="text-[var(--amber)]"
                size={22}
              />
            )}
            <h2 className="text-xl font-black text-[var(--ink)]">
              {attempt.sentence.correct
                ? "Your answer works"
                : "Your answer needs correction"}
            </h2>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 sm:min-w-96">
          <Score
            label="Grammar"
            value={attempt.sentence.scores.grammar}
          />
          <Score
            label="Naturalness"
            value={attempt.sentence.scores.naturalness}
          />
          <Score
            label="Meaning"
            value={attempt.sentence.scores.meaning}
          />
        </div>
      </div>

      <p
        className="mt-5 text-base leading-8 text-[var(--ink-soft)]"
        dir="rtl"
        lang="ar"
      >
        {attempt.sentence.feedbackAr}
      </p>

      {attempt.sentence.corrected && (
        <div className="mt-5 rounded-xl border border-[var(--line)] bg-[var(--panel-muted)] p-4">
          <p className="text-xs font-extrabold uppercase tracking-[.14em] text-[var(--blue)]">
            Corrected answer
          </p>
          <p
            className="mt-2 leading-7 text-[var(--ink)]"
            lang={language}
          >
            {attempt.sentence.corrected}
          </p>
        </div>
      )}

      {attempt.sentence.suggestion &&
        attempt.sentence.suggestion !== attempt.sentence.corrected && (
          <div className="mt-3 rounded-xl border border-[var(--blue-line)] bg-[var(--blue-soft)] p-4">
            <div className="flex items-center gap-2 text-[var(--blue)]">
              <Sparkles size={17} />
              <p className="text-xs font-extrabold uppercase tracking-[.14em]">
                More natural
              </p>
            </div>
            <p
              className="mt-2 leading-7 text-[var(--ink)]"
              lang={language}
            >
              {attempt.sentence.suggestion}
            </p>
          </div>
        )}

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <div className="surface-muted p-4 sm:p-5">
          <p className="eyebrow">Target words</p>
          <div className="mt-4 space-y-4">
            {attempt.targetWords.map((word) => {
              const result = toActivationResult(word);
              return (
                <article
                  key={word.vocabularyId}
                  className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <CircleGauge
                        size={18}
                        className="text-[var(--blue)]"
                      />
                      <h3
                        className="font-black text-[var(--ink)]"
                        lang={language}
                      >
                        {word.word}
                      </h3>
                      <span className="text-sm font-black text-[var(--muted)]">
                        {word.usageScore}/10
                      </span>
                    </div>
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-extrabold ${resultStyles[result]}`}
                    >
                      {resultLabels[result]}
                    </span>
                  </div>
                  {word.feedbackAr && (
                    <p
                      className="mt-3 text-sm leading-7 text-[var(--ink-soft)]"
                      dir="rtl"
                      lang="ar"
                    >
                      {word.feedbackAr}
                    </p>
                  )}
                  <div className="mt-3 flex flex-wrap gap-1.5 text-xs font-bold">
                    <span className={word.used ? "text-[#81d7c2]" : "text-[#ffb0a2]"}>
                      {word.used ? "Used" : "Not used"}
                    </span>
                    <span className="text-[#586781]">•</span>
                    <span
                      className={
                        word.grammarCorrect ? "text-[#81d7c2]" : "text-[#f4d784]"
                      }
                    >
                      Grammar
                    </span>
                    <span className="text-[#586781]">•</span>
                    <span
                      className={
                        word.naturalUsage ? "text-[#81d7c2]" : "text-[#f4d784]"
                      }
                    >
                      Naturalness
                    </span>
                    <span className="text-[#586781]">•</span>
                    <span
                      className={
                        word.collocationCorrect ? "text-[#81d7c2]" : "text-[#f4d784]"
                      }
                    >
                      Collocation
                    </span>
                  </div>
                </article>
              );
            })}
          </div>
        </div>

        <div className="surface-muted p-4 sm:p-5">
          <p className="eyebrow">Corrections</p>
          {attempt.errors.length ? (
            <div className="mt-4 space-y-3">
              {attempt.errors.map((error, errorIndex) => (
                <article
                  key={`${error.type}-${errorIndex}`}
                  className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-extrabold capitalize text-[var(--ink)]">
                      {error.type.replace("_", " ")}
                    </span>
                    <span
                      className={
                        error.severity === "major"
                          ? "text-xs font-black text-[#ffb0a2]"
                          : "text-xs font-black text-[#f4d784]"
                      }
                    >
                      {error.severity}
                    </span>
                  </div>
                  <p
                    className="mt-2 text-sm text-[var(--muted)]"
                    lang={language}
                  >
                    <span className="line-through">{error.original}</span>
                    {" → "}
                    <span className="font-bold text-[var(--ink)]">
                      {error.correction}
                    </span>
                  </p>
                  <p
                    className="mt-3 text-sm leading-7 text-[var(--ink-soft)]"
                    dir="rtl"
                    lang="ar"
                  >
                    {error.explanationAr}
                  </p>
                </article>
              ))}
            </div>
          ) : (
            <div className="mt-4 rounded-xl border border-[#285149] bg-[#173b37] p-4 text-[#9be5d3]">
              No specific errors found.
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

export function ActivationFeedback({
  evaluation,
  language,
  remaining,
  onContinue,
  onRestart,
}: {
  evaluation: ActivationResponse;
  language: LearningLanguage;
  remaining: number;
  onContinue(): void;
  onRestart(): void;
}) {
  const allCorrect = evaluation.attempts.every((attempt) => attempt.sentence.correct);

  return (
    <div className="space-y-5">
      <div className="surface flex flex-col justify-between gap-4 p-5 sm:flex-row sm:items-center sm:p-6">
        <div>
          <p className="eyebrow">Evaluation group complete</p>
          <h2 className="mt-2 text-2xl font-black text-[var(--ink)]">
            {evaluation.attempts.length} exercise
            {evaluation.attempts.length === 1 ? "" : "s"} evaluated
          </h2>
          <p className="mt-2 text-sm text-[var(--muted)]">
            {allCorrect
              ? "All answers passed the sentence check."
              : "Review the corrections below before continuing."}
          </p>
        </div>
        <span
          className={`w-fit rounded-full px-3 py-2 text-sm font-extrabold ${
            allCorrect ? "bg-[#173b37] text-[#81d7c2]" : "bg-[#3b3320] text-[#f4d784]"
          }`}
        >
          {allCorrect ? "All clear" : "Corrections available"}
        </span>
      </div>

      {evaluation.attempts.map((attempt, index) => (
        <AttemptFeedback
          key={attempt.attemptId}
          attempt={attempt}
          index={index}
          total={evaluation.attempts.length}
          language={language}
        />
      ))}

      <div className="flex justify-end">
        {remaining ? (
          <button
            className="btn-primary"
            onClick={onContinue}
          >
            Practice next words ({remaining})
          </button>
        ) : (
          <button
            className="btn-secondary"
            onClick={onRestart}
          >
            Start another session
          </button>
        )}
      </div>
    </div>
  );
}
