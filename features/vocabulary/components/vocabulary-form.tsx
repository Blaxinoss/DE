"use client";

import {
  FormEvent,
  ReactNode,
  useActionState,
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";
import { useFormStatus } from "react-dom";
import { Check, LoaderCircle, Search, Sparkles, X } from "lucide-react";
import {
  generateDictionaryEntry,
  searchDictionary,
} from "@/features/vocabulary/dictionary-actions";
import type { GenerateDictionaryState } from "@/features/vocabulary/dictionary-actions";
import { GrammarDetails } from "@/features/vocabulary/components/grammar-details";
import { WordSuggestion } from "@/features/vocabulary/dictionary-schema";
import { languageDetails } from "@/features/learning/language-config";
import {
  LearningLanguage,
  Target,
  Vocabulary,
  VocabularyDraft,
  targets,
  vocabularyStates,
  wordTypes,
} from "@/features/learning/types";

const initialGenerateDictionaryState: GenerateDictionaryState = {
  status: "idle",
  query: "",
  suggestions: [],
};

function FormShell({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose(): void;
  children: ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-end bg-[#02060c]/76 backdrop-blur-sm sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="h-[94vh] w-full overflow-y-auto rounded-t-[1.6rem] border border-[var(--line)] bg-[var(--panel)] p-5 shadow-2xl sm:h-full sm:max-w-2xl sm:rounded-[1.6rem] sm:p-7">
        <div className="mb-7 flex items-center justify-between">
          <div>
            <p className="eyebrow">Vocabulary</p>
            <h2 className="mt-1 text-2xl font-black text-[var(--ink)]">{title}</h2>
          </div>
          <button
            type="button"
            className="icon-button size-11 border-[var(--line)] bg-[var(--panel-soft)]"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function WordOption({
  suggestion,
  language,
  selected,
  alreadyAdded,
  onSelect,
}: {
  suggestion: WordSuggestion;
  language: LearningLanguage;
  selected: boolean;
  alreadyAdded: boolean;
  onSelect(): void;
}) {
  const unavailable = suggestion.id === null;
  const disabled = alreadyAdded || unavailable;

  return (
    <button
      type="button"
      className={`w-full rounded-2xl border p-4 text-left transition ${
        disabled
          ? "cursor-not-allowed border-[var(--line)] bg-[var(--panel-soft)] opacity-60"
          : selected
            ? "border-[var(--lime)] bg-[var(--panel-muted)]"
            : "border-[var(--line)] bg-[var(--panel-soft)] hover:border-[var(--blue-strong)]"
      }`}
      disabled={disabled}
      onClick={onSelect}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <strong
              className="text-lg text-[var(--ink)]"
              lang={language}
            >
              {suggestion.word}
            </strong>
            <span className="chip capitalize">{suggestion.type}</span>
            {alreadyAdded && (
              <span className="inline-flex items-center gap-1 rounded-full border border-[#285149] bg-[#173b37] px-2 py-0.5 text-xs font-bold text-[#9be5d3]">
                <Check size={12} />
                Already added
              </span>
            )}
            {unavailable && (
              <span className="rounded-full border border-[var(--line)] px-2 py-0.5 text-xs font-bold text-[var(--muted)]">
                Unavailable
              </span>
            )}
            {suggestion.commonness && (
              <span className="text-xs font-bold text-[var(--muted)]">
                {suggestion.commonness.replaceAll("_", " ")}
              </span>
            )}
          </div>
          <p
            className="mt-1 text-base font-bold text-[var(--ink-soft)]"
            dir="rtl"
            lang="ar"
          >
            {suggestion.meaningAr}
          </p>
        </div>
        <span
          className={`grid size-7 shrink-0 place-items-center rounded-full border ${
            selected
              ? "border-[var(--lime)] bg-[var(--lime)] text-[#10200c]"
              : "border-[var(--line)] text-transparent"
          }`}
        >
          <Check size={16} />
        </span>
      </div>

      {Object.keys(suggestion.grammar).length > 0 && (
        <GrammarDetails
          grammar={suggestion.grammar}
          language={language}
        />
      )}

      {suggestion.chunk && (
        <p
          className="mt-3 rounded-xl bg-[var(--blue-soft)] px-3 py-2 text-sm font-bold text-[var(--blue)]"
          lang={language}
        >
          {suggestion.chunk}
        </p>
      )}

      {suggestion.example && (
        <p
          className="mt-3 border-l-2 border-[var(--lime)] pl-3 text-sm leading-relaxed text-[var(--muted)]"
          lang={language}
        >
          {suggestion.example}
        </p>
      )}
    </button>
  );
}

function GenerateButton({ compact = false }: { compact?: boolean }) {
  const { pending } = useFormStatus();

  return (
    <button
      className={
        compact
          ? "text-sm font-bold text-[var(--blue)]"
          : "btn-secondary w-full justify-center"
      }
      disabled={pending}
    >
      {!compact &&
        (pending ? (
          <LoaderCircle
            className="animate-spin"
            size={18}
          />
        ) : (
          <Sparkles size={18} />
        ))}
      {pending
        ? compact
          ? "Generating…"
          : "Generating word data…"
        : compact
          ? "Not the right meaning? Generate"
          : "Generate with AI"}
    </button>
  );
}

function GenerateForm({
  action,
  language,
  query,
  compact,
}: {
  action: (formData: FormData) => void;
  language: LearningLanguage;
  query: string;
  compact?: boolean;
}) {
  return (
    <form action={action}>
      <input
        type="hidden"
        name="language"
        value={language}
      />
      <input
        type="hidden"
        name="query"
        value={query}
      />
      <GenerateButton compact={compact} />
    </form>
  );
}

function NewVocabularyForm({
  language,
  existingLexiconIds,
  onSave,
  onClose,
}: {
  language: LearningLanguage;
  existingLexiconIds: ReadonlySet<string>;
  onSave(drafts: VocabularyDraft[]): Promise<void>;
  onClose(): void;
}) {
  const details = languageDetails[language];
  const requestId = useRef(0);
  const handledGeneration = useRef(initialGenerateDictionaryState);
  const [query, setQuery] = useState("");
  const [target, setTarget] = useState<Target>("active");
  const [suggestions, setSuggestions] = useState<WordSuggestion[]>([]);
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [searchedQuery, setSearchedQuery] = useState("");
  const [message, setMessage] = useState("");
  const [searching, startSearch] = useTransition();
  const [saving, startSave] = useTransition();
  const [generateState, generateAction, generating] = useActionState(
    generateDictionaryEntry,
    initialGenerateDictionaryState,
  );

  const selectedIds = new Set(selectedKeys);
  const selectableSuggestions = suggestions.filter(
    (suggestion): suggestion is WordSuggestion & { id: string } =>
      suggestion.id !== null && !existingLexiconIds.has(suggestion.id),
  );
  const selectedSuggestions = selectableSuggestions.filter((suggestion) =>
    selectedIds.has(suggestion.senseKey),
  );
  const normalizedQuery = query.trim();

  useEffect(() => {
    setSelectedKeys([]);
    setMessage("");

    if (normalizedQuery.length < 2) {
      requestId.current += 1;
      setSuggestions([]);
      setSearchedQuery("");
      return;
    }

    const currentRequest = ++requestId.current;
    const timer = window.setTimeout(() => {
      startSearch(async () => {
        const result = await searchDictionary({
          language,
          query: normalizedQuery,
        });

        if (currentRequest !== requestId.current) return;
        setSearchedQuery(normalizedQuery);

        if (result.ok) {
          setSuggestions(result.suggestions);
          if (
            result.suggestions.length === 1 &&
            result.suggestions[0].id !== null &&
            !existingLexiconIds.has(result.suggestions[0].id)
          ) {
            setSelectedKeys([result.suggestions[0].senseKey]);
          }
        } else {
          setSuggestions([]);
          setMessage(result.error);
        }
      });
    }, 350);

    return () => window.clearTimeout(timer);
  }, [existingLexiconIds, language, normalizedQuery]);

  useEffect(() => {
    if (handledGeneration.current === generateState) return;
    handledGeneration.current = generateState;
    if (generateState.query !== normalizedQuery) return;

    setSearchedQuery(generateState.query);
    setMessage(generateState.message ?? "");

    if (generateState.status === "success") {
      requestId.current += 1;
      setSuggestions(generateState.suggestions);
      setSelectedKeys(
        generateState.suggestions.length === 1 &&
          generateState.suggestions[0].id !== null &&
          !existingLexiconIds.has(generateState.suggestions[0].id)
          ? [generateState.suggestions[0].senseKey]
          : [],
      );
    }
  }, [existingLexiconIds, generateState, normalizedQuery]);

  const addSelected = () => {
    if (selectedSuggestions.length === 0) {
      setMessage("Choose one or more meanings before adding words.");
      return;
    }

    setMessage("");
    startSave(async () => {
      try {
        const drafts: VocabularyDraft[] = selectedSuggestions.map((suggestion) => ({
          lexiconId: suggestion.id,
          word: suggestion.word,
          meaningAr: suggestion.meaningAr,
          type: suggestion.type,
          target,
          state: "new",
          grammar: suggestion.grammar,
          commonness: suggestion.commonness,
          chunk: suggestion.chunk,
          example: suggestion.example,
        }));
        await onSave(drafts);
        onClose();
      } catch (error) {
        setMessage(
          error instanceof Error ? error.message : "Could not save this word.",
        );
      }
    });
  };

  const searchFinished =
    normalizedQuery.length >= 2 && searchedQuery === normalizedQuery && !searching;

  return (
    <FormShell
      title="Add a new word"
      onClose={onClose}
    >
      <div className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-[1fr_180px]">
          <label>
            <span className="label">{details.name} word or expression</span>
            <span className="relative block">
              <Search
                className="absolute left-3.5 top-3.5 text-[var(--muted)]"
                size={18}
              />
              <input
                className="field pl-10"
                required
                autoFocus
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={details.wordPlaceholder}
                lang={language}
                autoComplete="off"
              />
            </span>
          </label>

          <label>
            <span className="label">Learning target</span>
            <select
              className="field"
              value={target}
              onChange={(event) => setTarget(event.target.value as Target)}
            >
              <option value="active">Use it actively</option>
              <option value="passive">Recognize and recall</option>
            </select>
          </label>
        </div>

        <p className="text-sm leading-relaxed text-[var(--muted)]">
          Meaning, grammar, chunk and example will be filled from the shared dictionary.
          Search runs after you pause typing; AI runs only when you ask.
        </p>

        {searching && (
          <div className="flex items-center gap-2 rounded-xl bg-[var(--panel-soft)] p-3 text-sm font-bold text-[var(--muted)]">
            <LoaderCircle
              className="animate-spin"
              size={17}
            />
            Searching the shared dictionary…
          </div>
        )}

        {searchFinished && suggestions.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-extrabold text-[var(--ink)]">
                {suggestions.length === 1
                  ? "One matching entry"
                  : `${suggestions.length} possible meanings`}
              </p>
              <GenerateForm
                action={generateAction}
                language={language}
                query={normalizedQuery}
                compact
              />
            </div>
            {suggestions.map((suggestion) => {
              const alreadyAdded =
                suggestion.id !== null && existingLexiconIds.has(suggestion.id);

              return (
                <WordOption
                  key={suggestion.id ?? suggestion.senseKey}
                  suggestion={suggestion}
                  language={language}
                  selected={selectedIds.has(suggestion.senseKey)}
                  alreadyAdded={alreadyAdded}
                  onSelect={() => {
                    setSelectedKeys((current) =>
                      current.includes(suggestion.senseKey)
                        ? current.filter((key) => key !== suggestion.senseKey)
                        : [...current, suggestion.senseKey],
                    );
                  }}
                />
              );
            })}
          </div>
        )}
        {searchFinished && suggestions.length === 0 && !message && (
          <div className="rounded-2xl border border-dashed border-[var(--blue-line)] bg-[var(--blue-soft)] p-5 text-center">
            <p className="font-extrabold text-[var(--ink)]">No shared entry found</p>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Generate the lexical details once, then future searches can reuse them.
            </p>
          </div>
        )}

        {normalizedQuery && searchFinished && suggestions.length === 0 && (
          <GenerateForm
            action={generateAction}
            language={language}
            query={normalizedQuery}
          />
        )}

        {message && (
          <p className="rounded-xl bg-[var(--panel-soft)] p-3 text-sm font-semibold text-[var(--muted)]">
            {message}
          </p>
        )}

        <div className="flex justify-end gap-3 border-t border-[var(--line)] pt-5">
          <button
            type="button"
            className="btn-secondary"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn-primary"
            disabled={selectedSuggestions.length === 0 || saving || generating}
            onClick={addSelected}
          >
            {saving
              ? "Adding…"
              : `Add ${selectedSuggestions.length} selected ${
                  selectedSuggestions.length === 1 ? "word" : "words"
                }`}
          </button>
        </div>
      </div>
    </FormShell>
  );
}

function EditVocabularyForm({
  initial,
  language,
  onSave,
  onClose,
}: {
  initial: Vocabulary;
  language: LearningLanguage;
  onSave(draft: VocabularyDraft): Promise<void>;
  onClose(): void;
}) {
  const details = languageDetails[language];
  const [draft, setDraft] = useState<VocabularyDraft>({ ...initial });
  const [grammar, setGrammar] = useState(JSON.stringify(initial.grammar, null, 2));
  const [message, setMessage] = useState("");
  const [saving, startSave] = useTransition();
  const set = <K extends keyof VocabularyDraft>(field: K, value: VocabularyDraft[K]) =>
    setDraft((current) => ({ ...current, [field]: value }));

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setMessage("");
    startSave(async () => {
      try {
        await onSave({ ...draft, grammar: JSON.parse(grammar || "{}") });
        onClose();
      } catch (error) {
        setMessage(
          error instanceof Error ? error.message : "Could not save this word.",
        );
      }
    });
  };

  return (
    <FormShell
      title="Edit word"
      onClose={onClose}
    >
      <form
        onSubmit={submit}
        className="space-y-5"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <label>
            <span className="label">{details.name} word</span>
            <input
              className="field"
              required
              value={draft.word}
              onChange={(event) => set("word", event.target.value)}
              lang={language}
            />
          </label>
          <label>
            <span className="label">Arabic meaning</span>
            <input
              className="field text-right"
              required
              dir="rtl"
              lang="ar"
              value={draft.meaningAr}
              onChange={(event) => set("meaningAr", event.target.value)}
            />
          </label>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <label>
            <span className="label">Type</span>
            <select
              className="field"
              value={draft.type}
              onChange={(event) =>
                set("type", event.target.value as VocabularyDraft["type"])
              }
            >
              {wordTypes.map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
          </label>
          <label>
            <span className="label">Target</span>
            <select
              className="field"
              value={draft.target}
              onChange={(event) =>
                set("target", event.target.value as VocabularyDraft["target"])
              }
            >
              {targets.map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
          </label>
          <label className="col-span-2 sm:col-span-1">
            <span className="label">Current state</span>
            <select
              className="field"
              value={draft.state}
              onChange={(event) =>
                set("state", event.target.value as VocabularyDraft["state"])
              }
            >
              {vocabularyStates.map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
          </label>
        </div>

        <label>
          <span className="label">Useful chunk</span>
          <input
            className="field"
            value={draft.chunk ?? ""}
            onChange={(event) => set("chunk", event.target.value)}
            lang={language}
          />
        </label>

        <label>
          <span className="label">Example sentence</span>
          <textarea
            className="field min-h-24 resize-y"
            value={draft.example ?? ""}
            onChange={(event) => set("example", event.target.value)}
            lang={language}
          />
        </label>

        <label>
          <span className="label">Grammar (JSON)</span>
          <textarea
            className="field min-h-40 resize-y font-mono text-sm"
            value={grammar}
            onChange={(event) => setGrammar(event.target.value)}
            spellCheck={false}
          />
        </label>

        {message && (
          <p className="rounded-xl bg-[var(--danger-soft)] p-3 text-sm font-semibold text-[var(--danger)]">
            {message}
          </p>
        )}

        <div className="flex justify-end gap-3 border-t border-[var(--line)] pt-5">
          <button
            type="button"
            className="btn-secondary"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            className="btn-primary"
            disabled={saving}
          >
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </form>
    </FormShell>
  );
}

export function VocabularyForm({
  initial,
  language,
  existingLexiconIds,
  onCreate,
  onUpdate,
  onClose,
}: {
  initial?: Vocabulary;
  language: LearningLanguage;
  existingLexiconIds: ReadonlySet<string>;
  onCreate(drafts: VocabularyDraft[]): Promise<void>;
  onUpdate(draft: VocabularyDraft): Promise<void>;
  onClose(): void;
}) {
  if (initial) {
    return (
      <EditVocabularyForm
        initial={initial}
        language={language}
        onSave={onUpdate}
        onClose={onClose}
      />
    );
  }

  return (
    <NewVocabularyForm
      language={language}
      existingLexiconIds={existingLexiconIds}
      onSave={onCreate}
      onClose={onClose}
    />
  );
}
