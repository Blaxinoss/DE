import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { BooleanBadge, ScoreBadge } from "@/components/ui";
import type { ActivationHistoryAttempt } from "@/features/activation/history-query";
import { AnswerComparison } from "./answer-comparison";

const scoreStyles = {
  Grammar: "border-[var(--blue-line)] text-[var(--blue)]",
  Natural: "border-[#285149] text-[var(--teal)]",
  Meaning: "border-[#547840] text-[var(--lime)]",
} as const;

function Score({ label, value }: { label: keyof typeof scoreStyles; value: number }) {
  return (
    <span
      className={`rounded-lg border bg-[var(--panel-muted)] px-2.5 py-1.5 text-xs font-bold ${scoreStyles[label]}`}
    >
      {label} <strong className="text-[var(--ink)]">{value}/10</strong>
    </span>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function ActivationHistoryList({
  attempts,
}: {
  attempts: ActivationHistoryAttempt[];
}) {
  return (
    <div className="space-y-4">
      {attempts.map((attempt, index) => (
        <details
          key={attempt.id}
          className={`surface group overflow-hidden border-l-[3px] ${
            attempt.correct ? "border-l-[#4a8c7c]" : "border-l-[#9b7940]"
          }`}
          open={index === 0}
        >
          <summary className="cursor-pointer list-none p-5 sm:p-6">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
              <div className="flex min-w-0 gap-3">
                {attempt.correct ? (
                  <CheckCircle2
                    className="mt-0.5 shrink-0 text-[var(--teal)]"
                    size={21}
                  />
                ) : (
                  <AlertTriangle
                    className="mt-0.5 shrink-0 text-[var(--amber)]"
                    size={21}
                  />
                )}
                <div className="min-w-0">
                  <p
                    className="truncate font-black text-[var(--ink)]"
                    lang={attempt.language}
                  >
                    {attempt.answer}
                  </p>
                  <p className="mt-1 text-xs font-semibold text-[var(--muted)]">
                    {formatDate(attempt.createdAt)} · {attempt.words.length} target
                    {attempt.words.length === 1 ? " word" : " words"}
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 flex-wrap gap-2">
                <Score
                  label="Grammar"
                  value={attempt.scores.grammar}
                />
                <Score
                  label="Natural"
                  value={attempt.scores.naturalness}
                />
                <Score
                  label="Meaning"
                  value={attempt.scores.meaning}
                />
              </div>
            </div>
          </summary>

          <div className="border-t border-[var(--line)] p-5 sm:p-6">
            <p
              className="leading-8 text-[var(--ink-soft)]"
              dir="rtl"
              lang="ar"
            >
              {attempt.feedbackAr}
            </p>

            <AnswerComparison
              original={attempt.answer}
              corrected={attempt.correctedAnswer}
              suggestion={attempt.naturalSuggestion}
              language={attempt.language}
            />

            <div className="mt-5 grid gap-5 lg:grid-cols-2">
              <section>
                <p className="eyebrow">Target words</p>
                <div className="mt-3 space-y-3">
                  {attempt.words.map((word) => (
                    <article
                      key={word.id}
                      className="rounded-xl border border-[var(--line)] bg-[var(--panel-muted)] p-4"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <strong
                          className="text-[var(--ink)]"
                          lang={attempt.language}
                        >
                          {word.word}
                        </strong>
                        <ScoreBadge value={word.usageScore} />
                      </div>
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        <BooleanBadge
                          label="Used"
                          value={word.used}
                        />
                        <BooleanBadge
                          label="Meaning"
                          value={word.meaningCorrect}
                        />
                        <BooleanBadge
                          label="Grammar"
                          value={word.grammarCorrect}
                        />
                        <BooleanBadge
                          label="Natural"
                          value={word.naturalUsage}
                        />
                        <BooleanBadge
                          label="Collocation"
                          value={word.collocationCorrect}
                        />
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
                    </article>
                  ))}
                </div>
              </section>

              <section>
                <p className="eyebrow">Corrections</p>
                {attempt.errors.length ? (
                  <div className="mt-3 space-y-3">
                    {attempt.errors.map((error, errorIndex) => (
                      <article
                        key={`${error.type}-${errorIndex}`}
                        className="rounded-xl border border-[var(--line)] bg-[var(--panel-muted)] p-4"
                      >
                        <div className="flex items-center justify-between gap-3 text-sm font-black capitalize">
                          <span>{error.type.replace("_", " ")}</span>
                          <span
                            className={`rounded-full border px-2.5 py-1 text-xs ${
                              error.severity === "major"
                                ? "border-[#70464d] bg-[var(--danger-soft)] text-[var(--danger)]"
                                : "border-[#66542e] bg-[#30291b] text-[var(--amber)]"
                            }`}
                          >
                            {error.severity}
                          </span>
                        </div>
                        <p
                          className="mt-2 text-sm text-[var(--muted)]"
                          lang={attempt.language}
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
                  <p className="mt-3 rounded-xl border border-[#285149] bg-[#173b37] p-4 text-sm font-semibold text-[#9be5d3]">
                    No specific corrections in this attempt.
                  </p>
                )}
              </section>
            </div>
          </div>
        </details>
      ))}
    </div>
  );
}
