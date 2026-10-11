import { WordTypeMark } from "@/components/ui";
import type { LearningLanguage, WordType } from "@/features/learning/types";
import { languageDetails } from "@/features/learning/language-config";

const articleStyles: Record<string, string> = {
  der: "text-[#8498b8]",
  die: "text-[#bc8f98]",
  das: "text-[#81a99f]",
};

function grammarText(grammar: Record<string, unknown>, key: string): string | null {
  const value = grammar[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function WordIdentity({
  word,
  type,
  grammar,
  language,
  showPlural = false,
  className = "text-lg",
}: {
  word: string;
  type: WordType;
  grammar: Record<string, unknown>;
  language: LearningLanguage;
  showPlural?: boolean;
  className?: string;
}) {
  const details = languageDetails[language];
  const article =
    language === "de" && type === "noun" ? grammarText(grammar, "article") : null;
  const singular = grammarText(grammar, "singular");
  const plural = showPlural ? grammarText(grammar, "plural") : null;
  const headword = singular ?? word;
  const normalizedArticle = article?.toLocaleLowerCase(details.locale);
  const alreadyHasArticle = normalizedArticle
    ? headword.toLocaleLowerCase(details.locale).startsWith(`${normalizedArticle} `)
    : false;

  return (
    <span
      className={`inline-flex min-w-0 flex-wrap items-baseline gap-x-2 font-black tracking-tight text-[var(--ink)] ${className}`}
      lang={language}
    >
      <WordTypeMark type={type} />
      <span>
        {article && !alreadyHasArticle && (
          <span
            className={`mr-1.5 font-bold ${articleStyles[normalizedArticle ?? ""] ?? "text-[var(--muted)]"}`}
          >
            {article}
          </span>
        )}
        {headword}
      </span>
      {plural && (
        <span className="text-sm font-bold tracking-normal text-[var(--muted)]">
          – {plural}
        </span>
      )}
    </span>
  );
}
