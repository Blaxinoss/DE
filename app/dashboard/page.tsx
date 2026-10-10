"use client";

import Link from "next/link";
import { Activity, ArrowRight, BookPlus, Clock3, Repeat2 } from "lucide-react";
import { LoadingState, PageHeader, StateBadge } from "@/components/ui";
import { useVocabulary } from "@/components/vocabulary-provider";
import { languageDetails } from "@/lib/languages";
import { isActivationReady, isReviewReady, progressPercent } from "@/lib/learning";
import { vocabularyStates } from "@/lib/types";
import { useCurrentTime } from "@/components/use-current-time";

export default function Dashboard() {
  const { language, words, loading, error } = useVocabulary();
  const details = languageDetails[language];
  const now = useCurrentTime();

  if (loading) return <LoadingState />;

  const due = words.filter((word) => isReviewReady(word, now));
  const activeTargets = words.filter((word) => word.target === "active");
  const activationReady = activeTargets.filter((word) => isActivationReady(word, now));
  const reached = activeTargets.filter((word) => word.state === "active").length;
  const progress = progressPercent(activeTargets.map((word) => word.state));

  if (!words.length) {
    return (
      <>
        <PageHeader
          eyebrow="Your learning path"
          title={`Start your first ${details.name} word`}
          description={`Build a small, useful ${details.name} vocabulary bank first. Wortweg will handle the review path from there.`}
        />
        {error && <ErrorBanner message={error} />}
        <section className="surface overflow-hidden">
          <div className="border-b border-[var(--line)] p-6 sm:p-8">
            <p className="eyebrow">A simple first session</p>
            <h2 className="mt-2 max-w-xl text-2xl font-black sm:text-3xl">
              Add words you genuinely want to use.
            </h2>
            <p className="mt-3 max-w-2xl leading-7 text-[var(--muted)]">
              Include a chunk or example when possible. That context makes later recall
              and activation much more useful than a translation alone.
            </p>
            <Link
              href="/vocabulary?add=1"
              className="btn-primary mt-6"
            >
              <BookPlus size={18} />
              Add your first word
              <ArrowRight size={17} />
            </Link>
          </div>
          <div className="grid gap-px bg-[var(--line)] sm:grid-cols-3">
            {[
              ["01", "Build", "Add or import focused vocabulary."],
              ["02", "Review", "Recall it on a spaced schedule."],
              ["03", "Activate", "Use it naturally in your own writing."],
            ].map(([number, title, text]) => (
              <div
                key={number}
                className="bg-[var(--panel)] p-6"
              >
                <span className="text-xs font-black text-[var(--blue)]">{number}</span>
                <h3 className="mt-3 font-black">{title}</h3>
                <p className="mt-1 text-sm leading-6 text-[var(--muted)]">{text}</p>
              </div>
            ))}
          </div>
        </section>
      </>
    );
  }

  const nextAction = due.length
    ? {
        href: "/review",
        label: "Start review",
        detail: `${due.length} ${due.length === 1 ? "word is" : "words are"} ready now`,
        icon: Repeat2,
      }
    : activationReady.length
      ? {
          href: "/activate",
          label: "Start activation",
          detail: `${activationReady.length} ready for writing practice`,
          icon: Activity,
        }
      : {
          href: "/vocabulary?add=1",
          label: "Add vocabulary",
          detail: "Your schedule is clear",
          icon: BookPlus,
        };
  const NextIcon = nextAction.icon;

  return (
    <>
      <PageHeader
        eyebrow="Your learning path"
        title={language === "de" ? "Guten Morgen" : "Good morning"}
        description="One useful next step, then you are done for now."
      />
      {error && <ErrorBanner message={error} />}

      <section className="grid gap-4 lg:grid-cols-[1.35fr_.65fr]">
        <div className="surface overflow-hidden p-6 sm:p-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="eyebrow">Recommended next</p>
              <h2 className="mt-3 text-3xl font-black tracking-[-.04em]">
                {nextAction.label}
              </h2>
              <p className="mt-2 font-semibold text-[var(--muted)]">
                {nextAction.detail}
              </p>
            </div>
            <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-[var(--lime)] text-[#17200e]">
              <Clock3 size={25} />
            </span>
          </div>
          <Link
            href={nextAction.href}
            className="btn-primary mt-8 min-w-48"
          >
            <NextIcon size={18} />
            {nextAction.label}
            <ArrowRight size={17} />
          </Link>
          <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 border-t border-[var(--line)] pt-5 text-sm font-bold">
            <Link
              href="/review"
              className="text-[var(--muted)] transition hover:text-[var(--ink)]"
            >
              {due.length} due
            </Link>
            <Link
              href="/activate"
              className="text-[var(--muted)] transition hover:text-[var(--ink)]"
            >
              {activationReady.length} activation ready
            </Link>
            <Link
              href="/vocabulary?add=1"
              className="text-[var(--blue)] transition hover:text-[var(--ink)]"
            >
              + Add a word
            </Link>
          </div>
        </div>

        <div className="surface bg-[linear-gradient(145deg,#18263b,#121c2a)] p-6 sm:p-8">
          <p className="eyebrow">Active target</p>
          <div className="mt-5 flex items-end justify-between gap-4">
            <p className="text-4xl font-black">{progress}%</p>
            <p className="text-sm font-bold text-[var(--ink-soft)]">
              {reached}/{activeTargets.length} active
            </p>
          </div>
          <div className="mt-5 h-2.5 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-[var(--lime)] transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="mt-5 text-sm leading-6 text-[var(--muted)]">
            Progress follows active-target words through every learning state.
          </p>
        </div>
      </section>

      <section className="surface mt-5 p-6 sm:p-8">
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <p className="eyebrow">Learning states</p>
            <h2 className="mt-1 text-xl font-black">Where your words are now</h2>
          </div>
          <Link
            href="/vocabulary"
            className="text-sm font-bold text-[var(--blue)] hover:text-[var(--ink)]"
          >
            {words.length} total →
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
          {vocabularyStates.map((state) => (
            <div
              key={state}
              className="surface-muted p-4"
            >
              <StateBadge state={state} />
              <p className="mt-4 text-3xl font-black">
                {words.filter((word) => word.state === state).length}
              </p>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div
      className="mb-6 rounded-xl border border-[#623b44] bg-[var(--danger-soft)] p-4 font-semibold text-[var(--danger)]"
      role="alert"
    >
      {message}
    </div>
  );
}
