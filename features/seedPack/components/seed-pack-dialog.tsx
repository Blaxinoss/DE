"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { BookOpenCheck, Check, LoaderCircle, Sparkles, X } from "lucide-react";
import { languageDetails } from "@/features/learning/language-config";
import { CERF, level_CERF } from "@/features/learning/types";
import { useVocabulary } from "@/features/vocabulary/components/vocabulary-provider";

const levelDescriptions: Record<CERF, string> = {
  A1: "First everyday words",
  A2: "Common daily situations",
  B1: "Independent conversation",
  B2: "Detailed, natural expression",
  C1: "Advanced and precise language",
  C2: "Nuanced, near-native vocabulary",
};

export function SeedPackDialog() {
  const { language, seededLanguages, showSeed, closeSeed, seedVocabularyCERF } =
    useVocabulary();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [selectedLevel, setSelectedLevel] = useState<CERF | null>(null);
  const [saving, startSaving] = useTransition();
  const details = languageDetails[language];
  const alreadySeeded = seededLanguages.includes(language);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (showSeed && !dialog.open) {
      setSelectedLevel(null);
      dialog.showModal();
    } else if (!showSeed && dialog.open) {
      dialog.close();
    }
  }, [showSeed, language]);

  const submit = () => {
    if (!selectedLevel || saving || alreadySeeded) return;

    startSaving(async () => {
      await seedVocabularyCERF(selectedLevel);
    });
  };

  return (
    <dialog
      ref={dialogRef}
      className="surface fixed inset-x-0 bottom-0 top-auto m-0 max-h-[calc(100dvh-1rem)] w-full max-w-none overflow-y-auto rounded-b-none border-b-0 bg-[var(--panel)] p-0 text-[var(--ink)] backdrop:bg-[#02060c]/78 backdrop:backdrop-blur-sm sm:inset-0 sm:m-auto sm:max-w-2xl sm:rounded-[1.5rem] sm:border-b"
      aria-labelledby="seed-pack-title"
      onClose={closeSeed}
      onCancel={(event) => {
        event.preventDefault();
        closeSeed();
      }}
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) closeSeed();
      }}
    >
      <div className="relative p-6 sm:p-8">
        <button
          type="button"
          className="icon-button absolute right-4 top-4"
          onClick={closeSeed}
          aria-label="Close starter pack"
        >
          <X size={19} />
        </button>

        <div className="flex items-start gap-4 pr-10">
          <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-[var(--lime-soft)] text-[var(--lime)]">
            <Sparkles size={22} />
          </span>
          <div>
            <p className="eyebrow">Starter vocabulary</p>
            <h2
              id="seed-pack-title"
              className="mt-1 text-2xl font-black tracking-[-.03em] text-[var(--ink)] sm:text-3xl"
            >
              Build your {details.name} starting point
            </h2>
            <p className="mt-2 leading-7 text-[var(--muted)]">
              Pick the level closest to you. We will add a ready-made set to your
              vocabulary, then the normal review system takes over.
            </p>
          </div>
        </div>

        <div className="mt-7 rounded-2xl border border-[var(--blue-line)] bg-[var(--blue-soft)] p-4">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-[var(--panel)] text-[var(--blue)]">
              <BookOpenCheck size={20} />
            </span>
            <div>
              <p className="text-xs font-black uppercase tracking-[.14em] text-[var(--muted)]">
                Current language
              </p>
              <p className="mt-0.5 font-black text-[var(--ink)]">
                {details.nativeName}
                <span className="ml-2 text-sm font-semibold text-[var(--muted)]">
                  {details.name}
                </span>
              </p>
            </div>
          </div>
        </div>

        {alreadySeeded ? (
          <div className="mt-6 rounded-2xl border border-[var(--lime-line)] bg-[var(--lime-soft)] p-5">
            <div className="flex gap-3">
              <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-full bg-[var(--lime)] text-[#17200e]">
                <Check
                  size={16}
                  strokeWidth={3}
                />
              </span>
              <div>
                <h3 className="font-black text-[var(--ink)]">Starter pack added</h3>
                <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
                  Your {details.name} starter words are already in your vocabulary.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <>
            <fieldset className="mt-7">
              <legend className="text-sm font-black text-[var(--ink)]">
                Choose your current CEFR level
              </legend>
              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {level_CERF.map((level) => {
                  const selected = selectedLevel === level;
                  return (
                    <button
                      key={level}
                      type="button"
                      className={`rounded-2xl border p-4 text-left transition ${
                        selected
                          ? "border-[var(--lime)] bg-[var(--lime-soft)]"
                          : "border-[var(--line)] bg-[var(--panel-soft)] hover:border-[var(--blue-strong)]"
                      }`}
                      aria-pressed={selected}
                      onClick={() => setSelectedLevel(level)}
                    >
                      <span className="flex items-center justify-between gap-2">
                        <span className="text-lg font-black text-[var(--ink)]">
                          {level}
                        </span>
                        {selected && (
                          <span className="grid size-5 place-items-center rounded-full bg-[var(--lime)] text-[#17200e]">
                            <Check
                              size={12}
                              strokeWidth={3}
                            />
                          </span>
                        )}
                      </span>
                      <span className="mt-1 block text-xs leading-5 text-[var(--muted)]">
                        {levelDescriptions[level]}
                      </span>
                    </button>
                  );
                })}
              </div>
            </fieldset>
          </>
        )}

        <div className="mt-8 flex justify-end gap-3 border-t border-[var(--line)] pt-5">
          <button
            type="button"
            className="btn-secondary"
            onClick={closeSeed}
            disabled={saving}
          >
            {alreadySeeded ? "Close" : "Not now"}
          </button>
          {!alreadySeeded && (
            <button
              type="button"
              className="btn-primary"
              onClick={submit}
              disabled={!selectedLevel || saving}
            >
              {saving ? (
                <>
                  <LoaderCircle
                    className="animate-spin"
                    size={17}
                  />
                  Adding words…
                </>
              ) : (
                <>
                  Add starter pack
                  <Sparkles size={17} />
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </dialog>
  );
}
