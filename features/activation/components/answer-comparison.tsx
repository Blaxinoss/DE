import { Check, MessageSquareText, Sparkles } from "lucide-react";
import type { LearningLanguage } from "@/features/learning/types";

function sameText(left: string | null, right: string | null): boolean {
  if (!left || !right) return false;
  const normalize = (value: string) =>
    value.normalize("NFKC").trim().replace(/\s+/g, " ").toLocaleLowerCase();
  return normalize(left) === normalize(right);
}

export function AnswerComparison({
  original,
  corrected,
  suggestion,
  language,
}: {
  original: string;
  corrected: string | null;
  suggestion: string | null;
  language: LearningLanguage;
}) {
  const visibleCorrection = sameText(original, corrected) ? null : corrected;
  const visibleSuggestion =
    sameText(original, suggestion) || sameText(visibleCorrection, suggestion)
      ? null
      : suggestion;

  return (
    <div className="mt-5 overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--panel-muted)]">
      <div className="grid divide-y divide-[var(--line)] lg:grid-cols-3 lg:divide-x lg:divide-y-0">
        <section className="p-4 sm:p-5">
          <div className="flex items-center gap-2 text-[var(--muted)]">
            <MessageSquareText size={16} />
            <p className="text-xs font-extrabold uppercase tracking-[.14em]">
              Your answer
            </p>
          </div>
          <p
            className="mt-3 whitespace-pre-wrap leading-7 text-[var(--ink)]"
            lang={language}
          >
            {original}
          </p>
        </section>

        {visibleCorrection && (
          <section className="bg-[#30291b]/45 p-4 sm:p-5">
            <div className="flex items-center gap-2 text-[var(--amber)]">
              <Check size={16} />
              <p className="text-xs font-extrabold uppercase tracking-[.14em]">
                Corrected
              </p>
            </div>
            <p className="mt-1 text-xs text-[var(--muted)]">Only necessary fixes</p>
            <p
              className="mt-3 whitespace-pre-wrap leading-7 text-[var(--ink)]"
              lang={language}
            >
              {visibleCorrection}
            </p>
          </section>
        )}

        {visibleSuggestion && (
          <section className="bg-[var(--blue-soft)]/55 p-4 sm:p-5">
            <div className="flex items-center gap-2 text-[var(--blue)]">
              <Sparkles size={16} />
              <p className="text-xs font-extrabold uppercase tracking-[.14em]">
                Natural alternative
              </p>
            </div>
            <p className="mt-1 text-xs text-[var(--muted)]">
              Same meaning and target words
            </p>
            <p
              className="mt-3 whitespace-pre-wrap leading-7 text-[var(--ink)]"
              lang={language}
            >
              {visibleSuggestion}
            </p>
          </section>
        )}
      </div>
    </div>
  );
}
