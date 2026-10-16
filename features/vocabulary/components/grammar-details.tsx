import type { LearningLanguage, WordType } from "@/features/learning/types";
import { grammarKeysByType } from "@/features/vocabulary/grammar-config";

const preferredLabels: Record<string, Record<string, string>> = {
  en: {
    article: "Article",
    singular: "Singular",
    plural: "Plural",
    present: "Present",
    thirdPerson: "Third person",
    past: "Simple past",
    pastParticiple: "Past participle",
    gerund: "-ing form",
    auxiliary: "Auxiliary",
    partizipII: "Past Participle",
    reflexive: "Reflexive",
    preposition: "Preposition",
    objectCase: "Case",
    countability: "Countability",
    transitivity: "Transitivity",
    comparative: "Comparative",
    superlative: "Superlative",
    commonVerb: "Common verb",
    commonCollocation: "Common phrase",
    commonAlternative: "Common alternative",
    usagePattern: "Usage pattern",
    literalMeaning: "Literal meaning",
    usageNote: "Usage note",
    synonyms: "Synonyms",
  },
  de: {
    article: "Article",
    singular: "Singular",
    plural: "Plural",
    present: "Präsens",
    thirdPerson: "Third person",
    past: "Präteritum",
    pastParticiple: "Past participle",
    gerund: "-ing form",
    auxiliary: "Auxiliary",
    partizipII: "Partizip II",
    reflexive: "Reflexive",
    preposition: "Preposition",
    objectCase: "Case",
    countability: "Countability",
    transitivity: "Transitivity",
    comparative: "Comparative",
    superlative: "Superlative",
    commonVerb: "Common verb",
    commonCollocation: "Common phrase",
    commonAlternative: "Common alternative",
    usagePattern: "Usage pattern",
    literalMeaning: "Literal meaning",
    usageNote: "Usage note",
    synonyms: "Synonyms",
  },
};

function labelFor(key: string, languageInput: string): string {
  if (preferredLabels[languageInput][key]) return preferredLabels[languageInput][key];

  const spaced = key.replace(/([a-z0-9])([A-Z])/g, "$1 $2").replace(/[_-]+/g, " ");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

function valueFor(value: unknown): string | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (Array.isArray(value)) return value.filter(Boolean).join(" · ") || null;
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function toneFor(key: string): string {
  if (["article", "singular", "plural", "gender"].includes(key)) {
    return "border-[#285149] bg-[#142c2b]";
  }
  if (["present", "past", "partizipII", "auxiliary"].includes(key)) {
    return "border-[var(--blue-line)] bg-[var(--blue-soft)]";
  }
  if (["preposition", "objectCase", "reflexive"].includes(key)) {
    return "border-[#66542e] bg-[#2b261b]";
  }
  if (
    ["synonyms", "commonAlternative", "commonVerb", "commonCollocation"].includes(key)
  ) {
    return "border-[#465d3a] bg-[#243021]";
  }
  return "border-[var(--line)] bg-[var(--panel-soft)]";
}

export function GrammarDetails({
  grammar,
  compact = false,
  excludeKeys = [],
  language = "de",
  type,
}: {
  grammar: Record<string, unknown>;
  compact?: boolean;
  excludeKeys?: string[];
  language?: LearningLanguage;
  type: WordType;
}) {
  const excluded = new Set(excludeKeys);
  const allowed = new Set<string>(grammarKeysByType[type]);
  const entries = Object.entries(grammar).flatMap(([key, value]) => {
    if (excluded.has(key) || !allowed.has(key)) return [];
    const formatted = valueFor(value);
    return formatted ? [[key, formatted] as const] : [];
  });

  if (!entries.length) return null;

  return (
    <dl
      className={`flex flex-wrap gap-2 ${compact ? "mt-4 justify-center" : "mt-5 border-t border-(--line) pt-4"}`}
    >
      {entries.map(([key, value]) => (
        <div
          key={key}
          className={`rounded-xl border px-3 py-2 text-left ${toneFor(key)}`}
        >
          <dt className="text-[11px] font-extrabold uppercase tracking-widest text-(--muted)">
            {labelFor(key, language)}
          </dt>
          <dd
            className="mt-0.5 text-sm font-bold text-(--ink)"
            lang={language}
          >
            {value}
          </dd>
        </div>
      ))}
    </dl>
  );
}
