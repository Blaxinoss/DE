const preferredLabels: Record<string, string> = {
  article: "Article",
  singular: "Singular",
  plural: "Plural",
  present: "Präsens",
  past: "Präteritum",
  auxiliary: "Auxiliary",
  partizipII: "Partizip II",
  reflexive: "Reflexive",
  preposition: "Preposition",
  objectCase: "Case",
  synonyms: "Synonyms",
};

function labelFor(key: string): string {
  if (preferredLabels[key]) return preferredLabels[key];
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

export function GrammarDetails({
  grammar,
  compact = false,
  excludeKeys = [],
  language = "de",
}: {
  grammar: Record<string, unknown>;
  compact?: boolean;
  excludeKeys?: string[];
  language?: LearningLanguage;
}) {
  const excluded = new Set(excludeKeys);
  const entries = Object.entries(grammar).flatMap(([key, value]) => {
    if (excluded.has(key)) return [];
    const formatted = valueFor(value);
    return formatted ? [[key, formatted] as const] : [];
  });

  if (!entries.length) return null;

  return (
    <dl
      className={`flex flex-wrap gap-2 ${compact ? "mt-4 justify-center" : "mt-5 border-t border-[var(--line)] pt-4"}`}
    >
      {entries.map(([key, value]) => (
        <div
          key={key}
          className="rounded-xl border border-[var(--line)] bg-[var(--panel-soft)] px-3 py-2 text-left"
        >
          <dt className="text-[11px] font-extrabold uppercase tracking-[.1em] text-[var(--muted)]">
            {labelFor(key)}
          </dt>
          <dd
            className="mt-0.5 text-sm font-bold text-[var(--ink)]"
            lang={language}
          >
            {value}
          </dd>
        </div>
      ))}
    </dl>
  );
}
import { LearningLanguage } from "@/lib/types";
