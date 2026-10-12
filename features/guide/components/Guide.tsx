"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { ArrowLeft, ArrowRight, Check, X } from "lucide-react";
import { dismissGuide } from "@/features/guide/actions";
import {
  GuideVisual,
  guidePages,
  guideToneStyles,
} from "@/features/guide/components/guide-content";
import { useVocabulary } from "@/features/vocabulary/components/vocabulary-provider";

function Dots({ currentPage }: { currentPage: number }) {
  return (
    <div
      className="flex items-center justify-center gap-2"
      aria-label={`Step ${currentPage + 1} of ${guidePages.length}`}
    >
      {guidePages.map((page, index) => (
        <span
          key={page.id}
          className={`h-1.5 rounded-full transition-all ${
            index === currentPage ? "w-7 bg-[var(--blue)]" : "w-1.5 bg-[var(--line)]"
          }`}
        />
      ))}
    </div>
  );
}

export function OnboardingGuide({ openRequest = 0 }: { openRequest?: number }) {
  const { showGuide, hideGuide } = useVocabulary();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const openedManually = useRef(false);
  const openedAutomatically = useRef(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  const [saving, startSaving] = useTransition();

  const page = guidePages[currentPage];
  const isFirst = currentPage === 0;
  const isLast = currentPage === guidePages.length - 1;

  const openGuide = () => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
  };

  const closeGuide = () => {
    dialogRef.current?.close();
  };

  useEffect(() => {
    if (!showGuide || openedManually.current || openedAutomatically.current) {
      return;
    }

    openedAutomatically.current = true;
    openGuide();
  }, [showGuide]);

  useEffect(() => {
    if (openRequest <= 0) return;
    openedManually.current = true;
    setCurrentPage(0);
    setMessage(null);
    openGuide();
  }, [openRequest]);

  const nextPage = () => {
    setCurrentPage((current) => Math.min(current + 1, guidePages.length - 1));
  };

  const previousPage = () => {
    setCurrentPage((current) => Math.max(current - 1, 0));
  };

  const dismissPermanently = () => {
    setMessage(null);

    if (!showGuide) {
      closeGuide();
      return;
    }

    startSaving(async () => {
      const result = await dismissGuide();
      if (result.ok) {
        hideGuide();
        closeGuide();
        return;
      }
      setMessage(result.error);
    });
  };

  return (
    <dialog
      ref={dialogRef}
      className="surface fixed inset-x-0 bottom-0 top-auto m-0 max-h-[calc(100dvh-1rem)] w-full max-w-none overflow-y-auto rounded-b-none border-b-0 bg-[var(--panel)] p-0 text-[var(--ink)] backdrop:bg-[#02060c]/78 backdrop:backdrop-blur-sm sm:inset-0 sm:m-auto sm:max-w-5xl sm:rounded-[1.5rem] sm:border-b"
      aria-labelledby="guide-title"
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) closeGuide();
      }}
    >
      <div className="relative w-full overflow-hidden">
        <button
          type="button"
          className="icon-button absolute right-4 top-4 z-10"
          onClick={closeGuide}
          aria-label="Close guide for now"
        >
          <X size={19} />
        </button>

        <div className="grid min-h-[38rem] sm:grid-cols-[.95fr_1.05fr]">
          <div
            className={`flex min-h-64 items-center justify-center border-b p-6 sm:min-h-full sm:border-b-0 sm:border-r sm:p-8 ${guideToneStyles[page.tone]}`}
          >
            <div className="w-full max-w-sm">
              <p className="mb-5 text-center text-xs font-black uppercase tracking-[.16em] opacity-80">
                {currentPage + 1} / {guidePages.length}
              </p>
              <GuideVisual page={page} />
            </div>
          </div>

          <div className="flex min-w-0 flex-col p-6 pt-14 sm:p-8 sm:pt-12">
            <p className="eyebrow">{page.eyebrow}</p>
            <h2
              id="guide-title"
              className="mt-2 text-2xl font-black tracking-[-.03em] text-[var(--ink)] sm:text-3xl"
            >
              {page.title}
            </h2>
            <p className="mt-3 leading-7 text-[var(--muted)]">{page.description}</p>

            {page.points.length > 0 && (
              <ul className="mt-5 space-y-2.5">
                {page.points.map((point) => (
                  <li
                    key={point}
                    className="flex gap-3 text-sm leading-6 text-[var(--ink-soft)]"
                  >
                    <span className="mt-1 grid size-5 shrink-0 place-items-center rounded-full bg-[var(--blue-soft)] text-[var(--blue)]">
                      <Check
                        size={12}
                        strokeWidth={3}
                      />
                    </span>
                    {point}
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-5 rounded-xl border border-[var(--blue-line)] bg-[var(--blue-soft)] p-3 text-sm leading-6 text-[var(--ink-soft)]">
              {page.note}
            </div>

            {message && (
              <p
                className="mt-4 rounded-xl border border-[#70464d] bg-[var(--danger-soft)] p-3 text-sm text-[var(--danger)]"
                role="alert"
              >
                {message}
              </p>
            )}

            <div className="mt-auto pt-7">
              <Dots currentPage={currentPage} />

              <div className="mt-6 flex items-center justify-between gap-3">
                <button
                  type="button"
                  className="text-sm font-bold text-[var(--muted)] transition hover:text-[var(--ink)]"
                  onClick={showGuide ? dismissPermanently : closeGuide}
                  disabled={saving}
                >
                  {showGuide ? "Don’t show again" : "Close guide"}
                </button>

                <div className="flex gap-2">
                  <button
                    type="button"
                    className="btn-secondary px-3"
                    onClick={previousPage}
                    disabled={isFirst || saving}
                    aria-label="Previous guide step"
                  >
                    <ArrowLeft size={17} />
                  </button>

                  {isLast ? (
                    <button
                      type="button"
                      className="btn-primary"
                      onClick={dismissPermanently}
                      disabled={saving}
                    >
                      {saving ? "Saving…" : "Finish"}
                      <Check size={17} />
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="btn-primary"
                      onClick={nextPage}
                    >
                      Next
                      <ArrowRight size={17} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </dialog>
  );
}
