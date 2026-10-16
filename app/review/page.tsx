"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { Eye, RotateCcw } from "lucide-react";
import { isReviewReady, nearestReviewDelay } from "@/features/learning/rules";
import { ReviewResult } from "@/features/learning/types";
import { useVocabulary } from "@/features/vocabulary/components/vocabulary-provider";
import {
  EmptyState,
  LoadingState,
  PageHeader,
  StateBadge,
  TargetBadge,
} from "@/components/ui";
import { GrammarDetails } from "@/features/vocabulary/components/grammar-details";
import { WordIdentity } from "@/features/vocabulary/components/word-identity";
import { languageDetails } from "@/features/learning/language-config";
import { useCurrentTime } from "@/hooks/use-current-time";

const options: {
  result: ReviewResult;
  label: string;
  detail: string;
  style: string;
}[] = [
  {
    result: "instant",
    label: "Instant",
    detail: "Immediate recall",
    style: "border-[#396e61] hover:bg-[#17352f]",
  },
  {
    result: "slow",
    label: "Slow",
    detail: "Needed a moment",
    style: "border-[var(--blue-line)] hover:bg-[var(--blue-soft)]",
  },
  {
    result: "hint",
    label: "Hint",
    detail: "Needed some help",
    style: "border-[#755f32] hover:bg-[#30291b]",
  },
  {
    result: "wrong",
    label: "Wrong",
    detail: "Could not recall",
    style: "border-[#70464d] hover:bg-[var(--danger-soft)]",
  },
];
export default function ReviewPage() {
  const { language, words, loading, recordResult } = useVocabulary();
  const details = languageDetails[language];
  const now = useCurrentTime();
  const queue = useMemo(
    () => words.filter((word) => isReviewReady(word, now)),
    [words, now],
  );
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [sessionDone, setSessionDone] = useState(0);
  const totalTargetQueueWords = sessionDone + queue.length;
  const [busy, setBusy] = useState(false);
  if (loading) return <LoadingState />;
  const current = queue[index];

  const backIn = current ? null : nearestReviewDelay(words, now);

  const grade = async (result: ReviewResult) => {
    if (!current) return;
    setBusy(true);
    await recordResult(current.id, result, "review");
    setSessionDone((n) => n + 1);
    setRevealed(false);
    setIndex(0);
    setBusy(false);
  };
  return (
    <>
      <PageHeader
        eyebrow="Retrieval practice"
        title="Review"
        description="Can you retrieve the word quickly, without help?"
      />
      {!current ? (
        <EmptyState
          title={
            sessionDone
              ? "Review complete"
              : backIn
                ? `Nothing due now — next review in ${backIn}`
                : "Nothing due right now"
          }
          text={
            sessionDone
              ? `You reviewed ${sessionDone} ${sessionDone === 1 ? "word" : "words"}. Come back when the next words are due.`
              : "Your current schedule is clear. Activation practice may still be ready."
          }
          action={
            <Link
              className="btn-primary"
              href="/activate"
            >
              Practice active use
            </Link>
          }
        />
      ) : (
        <section className="mx-auto max-w-3xl">
          <div className="mb-4 flex items-center justify-between text-sm font-bold text-(--muted)">
            <span>
              {sessionDone + 1} of {totalTargetQueueWords} due
            </span>
            <span>{sessionDone} completed</span>
          </div>
          <div className="mb-6 h-2 overflow-hidden rounded-full bg-(--line)">
            <div
              className="h-full rounded-full bg-(--blue-strong)"
              style={{ width: `${((sessionDone + 1) / totalTargetQueueWords) * 100}%` }}
            />
          </div>
          <article className="surface min-h-107.5 overflow-hidden">
            <div className="border-b border-(--line) bg-(--panel-soft) px-6 py-4 sm:px-9">
              <span className="text-sm font-extrabold text-(--muted)">
                Arabic → {details.name}
              </span>
            </div>
            <div className="flex min-h-87.5 flex-col items-center justify-center p-7 text-center sm:p-10">
              <div className="flex flex-wrap justify-center gap-2">
                <StateBadge state={current.state} />
                <TargetBadge target={current.target} />
              </div>
              <p className="mt-7 text-sm font-bold text-(--muted)">
                How do you say this in {details.name}?
              </p>
              <h2
                className="mt-3 max-w-xl text-3xl font-black leading-snug text-(--ink)"
                dir="rtl"
                lang="ar"
              >
                {current.meaningAr}
              </h2>
              {!revealed ? (
                <button
                  className="btn-primary mt-10 min-w-44"
                  onClick={() => setRevealed(true)}
                >
                  <Eye size={18} />
                  Show answer
                </button>
              ) : (
                <div className="mt-8 w-full">
                  <div className="rounded-2xl border border-(--line) bg-(--panel-muted) p-6 text-white">
                    {current.chunk ? (
                      <p
                        className="text-3xl font-black"
                        lang={language}
                      >
                        {current.chunk}
                      </p>
                    ) : (
                      <WordIdentity
                        word={current.word}
                        type={current.type}
                        grammar={current.grammar}
                        language={language}
                        className="justify-center text-3xl"
                      />
                    )}
                    <GrammarDetails
                      grammar={current.grammar}
                      type={current.type}
                      language={language}
                      compact
                    />
                    {current.example && (
                      <p
                        className="mt-4 text-base leading-relaxed text-(--ink-soft)"
                        lang={language}
                      >
                        {current.example}
                      </p>
                    )}
                  </div>
                  <p className="mb-3 mt-7 text-sm font-bold text-(--muted)">
                    How did recall feel?
                  </p>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {options.map((option) => (
                      <button
                        key={option.result}
                        disabled={busy}
                        onClick={() => void grade(option.result)}
                        className={`min-h-20 rounded-xl border bg-(--panel-soft) p-3 text-left transition ${option.style}`}
                      >
                        <span className="block text-sm font-black text-(--ink)">
                          {option.label}
                        </span>
                        <span className="mt-1 block text-xs text-(--muted)">
                          {option.detail}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </article>
          {revealed && (
            <button
              className="mx-auto mt-4 flex items-center gap-2 text-sm font-bold text-(--muted) transition hover:text-(--ink)"
              onClick={() => setRevealed(false)}
            >
              <RotateCcw size={15} />
              Hide answer
            </button>
          )}
        </section>
      )}
    </>
  );
}
