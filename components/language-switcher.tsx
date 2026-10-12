"use client";

import { Languages } from "lucide-react";
import { languageDetails } from "@/features/learning/language-config";
import type { LearningLanguage } from "@/features/learning/types";
import { useVocabulary } from "@/features/vocabulary/components/vocabulary-provider";

export function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const { language, setLearningLanguage, switchingLanguage } = useVocabulary();
  const nextLanguage: LearningLanguage = language === "de" ? "en" : "de";
  const current = languageDetails[language];
  const next = languageDetails[nextLanguage];

  return (
    <button
      type="button"
      disabled={switchingLanguage}
      onClick={() => void setLearningLanguage(nextLanguage)}
      className={`flex items-center rounded-xl border border-[var(--blue-line)] bg-[var(--blue-soft)] text-left text-[var(--blue)] transition hover:border-[var(--blue)] hover:text-[var(--ink)] ${
        compact ? "min-h-10 gap-2 px-3" : "w-full gap-3 px-3.5 py-3"
      }`}
      aria-label={`Switch learning language to ${next.name}`}
      title={`Switch to ${next.name}`}
    >
      <Languages size={18} />
      {compact ? (
        <span className="text-xs font-black uppercase">{current.code}</span>
      ) : (
        <span className="min-w-0">
          <span className="block text-[10px] font-black uppercase tracking-[.14em] text-[var(--muted)]">
            Learning
          </span>
          <span className="block text-sm font-extrabold text-[var(--ink)]">
            {switchingLanguage ? "Switching…" : current.nativeName}
          </span>
        </span>
      )}
      {!compact && (
        <span className="ml-auto text-xs font-black uppercase text-[var(--blue)]">
          {next.code}
        </span>
      )}
    </button>
  );
}
