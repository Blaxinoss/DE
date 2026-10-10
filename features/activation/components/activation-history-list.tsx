import { AlertTriangle, CheckCircle2 } from "lucide-react";
import type { ActivationHistoryAttempt } from "@/features/activation/history-query";

function Score({ label, value }: { label: string; value: number }) {
  return (
    <span className="rounded-lg border border-[var(--line)] bg-[var(--panel-muted)] px-2.5 py-1.5 text-xs font-bold text-[var(--muted)]">
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
          className="surface group overflow-hidden"
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

            <div className="mt-5 grid gap-4 lg:grid-cols-2">
              {attempt.correctedAnswer && (
                <div className="surface-muted p-4">
                  <p className="eyebrow">Corrected answer</p>
                  <p
                    className="mt-2 leading-7 text-[var(--ink)]"
                    lang={attempt.language}
                  >
                    {attempt.correctedAnswer}
                  </p>
                </div>
              )}
              {attempt.naturalSuggestion &&
                attempt.naturalSuggestion !== attempt.correctedAnswer && (
                  <div className="rounded-xl border border-[var(--blue-line)] bg-[var(--blue-soft)] p-4">
                    <p className="eyebrow">More natural</p>
                    <p
                      className="mt-2 leading-7 text-[var(--ink)]"
                      lang={attempt.language}
                    >
                      {attempt.naturalSuggestion}
                    </p>
                  </div>
                )}
            </div>

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
                        <span className="text-sm font-black text-[var(--blue)]">
                          {word.usageScore}/10
                        </span>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2 text-xs font-bold text-[var(--muted)]">
                        <span>{word.used ? "Used" : "Not used"}</span>
                        <span>{word.meaningCorrect ? "Meaning ✓" : "Meaning ×"}</span>
                        <span>{word.grammarCorrect ? "Grammar ✓" : "Grammar ×"}</span>
                        <span>{word.naturalUsage ? "Natural ✓" : "Natural ×"}</span>
                        <span>
                          {word.collocationCorrect ? "Collocation ✓" : "Collocation ×"}
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
                            className={
                              error.severity === "major"
                                ? "text-[var(--danger)]"
                                : "text-[var(--amber)]"
                            }
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
