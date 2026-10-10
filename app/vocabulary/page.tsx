"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronDown, Pencil, Plus, RotateCcw, Search, Trash2 } from "lucide-react";
import { GrammarDetails } from "@/features/vocabulary/components/grammar-details";
import { EmptyState, LoadingState, PageHeader, StateBadge } from "@/components/ui";
import { VocabularyForm } from "@/features/vocabulary/components/vocabulary-form";
import { useVocabulary } from "@/features/vocabulary/components/vocabulary-provider";
import { languageDetails } from "@/features/learning/language-config";
import {
  LearningLanguage,
  Target,
  Vocabulary,
  VocabularyState,
  vocabularyStates,
} from "@/features/learning/types";

function grammarString(word: Vocabulary, key: string): string | null {
  const value = word.grammar[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function TargetWordHeading({
  word,
  language,
}: {
  word: Vocabulary;
  language: LearningLanguage;
}) {
  const details = languageDetails[language];
  const article = grammarString(word, "article");
  const singular = grammarString(word, "singular");
  const plural = grammarString(word, "plural");
  const headword = singular ?? word.word;
  const alreadyHasArticle = article
    ? headword
        .toLocaleLowerCase(details.locale)
        .startsWith(`${article.toLocaleLowerCase(details.locale)} `)
    : false;

  return (
    <h2
      className="flex flex-wrap items-baseline gap-x-2 text-xl font-black tracking-tight text-[var(--ink)] sm:text-2xl"
      lang={language}
    >
      {article && !alreadyHasArticle && (
        <span className="text-[var(--lime)]">{article}</span>
      )}
      <span>{headword}</span>
      {plural && (
        <span className="text-base font-bold tracking-normal text-[var(--muted)]">
          – {plural}
        </span>
      )}
    </h2>
  );
}

export default function VocabularyPage() {
  const { language, words, loading, createWord, updateWord, deleteWord } =
    useVocabulary();
  const details = languageDetails[language];
  const [query, setQuery] = useState("");
  const [target, setTarget] = useState<Target | "all">("all");
  const [state, setState] = useState<VocabularyState | "all">("all");
  const [editing, setEditing] = useState<Vocabulary | "new" | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("add") === "1") {
      setEditing("new");
    }
  }, []);

  const shown = useMemo(
    () =>
      words.filter(
        (word) =>
          `${word.word} ${word.meaningAr} ${word.chunk ?? ""}`
            .toLocaleLowerCase()
            .includes(query.toLocaleLowerCase()) &&
          (target === "all" || word.target === target) &&
          (state === "all" || word.state === state),
      ),
    [words, query, target, state],
  );

  if (loading) return <LoadingState />;

  return (
    <>
      <PageHeader
        eyebrow="Vocabulary bank"
        title={`${details.name} words worth using`}
        description={`Build ${details.name} vocabulary for recognition, recall and natural active use.`}
        action={
          <button
            className="btn-primary"
            onClick={() => setEditing("new")}
          >
            <Plus size={18} />
            Add vocabulary
          </button>
        }
      />

      <div className="surface mb-4 grid gap-3 p-4 md:grid-cols-[1fr_190px_210px]">
        <label className="relative">
          <span className="sr-only">Search vocabulary</span>
          <Search
            className="absolute left-3.5 top-3.5 text-[var(--muted)]"
            size={18}
          />
          <input
            className="field pl-10"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={`Search ${details.name}, Arabic or chunk…`}
          />
        </label>
        <select
          className="field"
          aria-label="Filter by target"
          value={target}
          onChange={(event) => setTarget(event.target.value as Target | "all")}
        >
          <option value="all">All targets</option>
          <option value="active">Active target</option>
          <option value="passive">Passive target</option>
        </select>
        <select
          className="field"
          aria-label="Filter by state"
          value={state}
          onChange={(event) => setState(event.target.value as VocabularyState | "all")}
        >
          <option value="all">All learning states</option>
          {vocabularyStates.map((value) => (
            <option
              key={value}
              value={value}
            >
              {value.replace("_", " ")}
            </option>
          ))}
        </select>
      </div>

      <div className="mb-4 flex min-h-9 items-center justify-between gap-3 px-1">
        <p className="text-sm font-semibold text-[var(--muted)]">
          Showing <span className="text-[var(--ink)]">{shown.length}</span> of{" "}
          {words.length} words
        </p>
        {(query || target !== "all" || state !== "all") && (
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-bold text-[var(--blue)] transition hover:bg-[var(--blue-soft)]"
            onClick={() => {
              setQuery("");
              setTarget("all");
              setState("all");
            }}
          >
            <RotateCcw size={15} />
            Clear filters
          </button>
        )}
      </div>

      {!shown.length ? (
        <EmptyState
          title={words.length ? "No matching words" : "Your vocabulary bank is empty"}
          text={
            words.length
              ? "Try a broader search or clear one of the filters."
              : `Add the first ${details.name} word you want to move into active use.`
          }
          action={
            !words.length && (
              <button
                className="btn-primary"
                onClick={() => setEditing("new")}
              >
                <Plus size={18} />
                Add vocabulary
              </button>
            )
          }
        />
      ) : (
        <div className="grid items-start gap-3 xl:grid-cols-2">
          {shown.map((word) => {
            const expanded = expandedId === word.id;
            const detailsId = `word-details-${word.id}`;

            return (
              <article
                key={word.id}
                className={`surface overflow-hidden transition-colors ${
                  expanded ? "border-[var(--blue-strong)]" : ""
                }`}
              >
                <div className="flex items-start gap-2 p-4 sm:p-5">
                  <button
                    type="button"
                    className="min-w-0 flex-1 text-left"
                    aria-expanded={expanded}
                    aria-controls={detailsId}
                    onClick={() => setExpandedId(expanded ? null : word.id)}
                  >
                    <div className="mb-3 flex flex-wrap items-center gap-2">
                      <StateBadge state={word.state} />
                      <span className="chip capitalize">{word.target} target</span>
                      <span className="text-xs font-bold capitalize text-[var(--muted)]">
                        {word.type}
                      </span>
                    </div>
                    <TargetWordHeading
                      word={word}
                      language={language}
                    />
                    <p
                      className="mt-1 line-clamp-1 text-base font-bold text-[var(--ink-soft)]"
                      dir="rtl"
                      lang="ar"
                    >
                      {word.meaningAr}
                    </p>
                  </button>
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      className="icon-button"
                      onClick={() => setEditing(word)}
                      aria-label={`Edit ${word.word}`}
                    >
                      <Pencil size={18} />
                    </button>
                    <button
                      className="icon-button text-[var(--danger)] hover:bg-[var(--danger-soft)]"
                      onClick={() => {
                        if (confirm(`Delete “${word.word}”?`)) {
                          void deleteWord(word.id);
                        }
                      }}
                      aria-label={`Delete ${word.word}`}
                    >
                      <Trash2 size={18} />
                    </button>
                    <button
                      type="button"
                      className="icon-button"
                      aria-label={`${expanded ? "Collapse" : "Expand"} ${word.word}`}
                      aria-expanded={expanded}
                      aria-controls={detailsId}
                      onClick={() => setExpandedId(expanded ? null : word.id)}
                    >
                      <ChevronDown
                        size={19}
                        className={`transition-transform ${expanded ? "rotate-180" : ""}`}
                      />
                    </button>
                  </div>
                </div>

                {expanded && (
                  <div
                    id={detailsId}
                    className="border-t border-[var(--line)] bg-[var(--panel-muted)] px-4 pb-5 pt-1 sm:px-5"
                  >
                    <GrammarDetails
                      grammar={word.grammar}
                      language={language}
                      excludeKeys={["article", "singular", "plural"]}
                    />
                    {word.chunk && (
                      <div
                        className="mt-4 rounded-xl border border-[var(--blue-line)] bg-[var(--blue-soft)] px-4 py-3 font-bold text-[var(--blue)]"
                        lang={language}
                      >
                        {word.chunk}
                      </div>
                    )}
                    {word.example && (
                      <p
                        className="mt-4 border-l-2 border-[var(--lime)] pl-4 text-base leading-relaxed text-[var(--ink-soft)]"
                        lang={language}
                      >
                        {word.example}
                      </p>
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}

      {editing && (
        <VocabularyForm
          initial={editing === "new" ? undefined : editing}
          language={language}
          onClose={() => setEditing(null)}
          onSave={(draft) =>
            editing === "new"
              ? createWord(draft).then(() => undefined)
              : updateWord(editing.id, draft).then(() => undefined)
          }
        />
      )}
    </>
  );
}
