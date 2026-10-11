import { Target, VocabularyState, WordType } from "@/features/learning/types";

const badgeBase =
  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-extrabold";

const stateNames: Record<VocabularyState, string> = {
  new: "New",
  learning: "Learning",
  recall: "Recall",
  active: "Active",
};
const stateStyles: Record<VocabularyState, string> = {
  new: "border-[#35465a] bg-[#202b39] text-[#c4ceda]",
  learning: "border-[#5a4d32] bg-[#302a20] text-[#d2b97f]",
  recall: "border-[var(--blue-line)] bg-[var(--blue-soft)] text-[var(--blue)]",
  active: "border-[#465d3a] bg-[#243021] text-[#a9c981]",
};

const wordTypeStyles: Record<WordType, string> = {
  noun: "border-[#3c5273] bg-[#1a2639] text-[#9eb4df]",
  verb: "border-[#49466b] bg-[#25233a] text-[#b4addd]",
  adjective: "border-[#5e5135] bg-[#2c281e] text-[#d8bd82]",
  adverb: "border-[#345b55] bg-[#192f2d] text-[#91c9bd]",
  expression: "border-[#46583a] bg-[#243021] text-[#aecb87]",
  other: "border-[#35465a] bg-[#202b39] text-[#c4ceda]",
};

const wordTypeMarks: Record<WordType, string> = {
  noun: "N",
  verb: "V",
  adjective: "Adj",
  adverb: "Adv",
  expression: "E",
  other: "·",
};

const wordTypeMarkStyles: Record<WordType, string> = {
  noun: "text-[#8298bd]",
  verb: "text-[#9993bc]",
  adjective: "text-[#b4a176]",
  adverb: "text-[#78aaa0]",
  expression: "text-[#90a876]",
  other: "text-[var(--muted)]",
};

const targetStyles: Record<Target, string> = {
  active: "text-[#8fa5ba]",
  passive: "text-[#9297a5]",
};

export function StateBadge({ state }: { state: VocabularyState }) {
  return (
    <span className={`${badgeBase} ${stateStyles[state]}`}>{stateNames[state]}</span>
  );
}

export function WordTypeBadge({ type }: { type: WordType }) {
  return (
    <span className={`${badgeBase} capitalize ${wordTypeStyles[type]}`}>
      <span className="size-1.5 rounded-full bg-current opacity-80" />
      {type}
    </span>
  );
}

export function WordTypeMark({ type }: { type: WordType }) {
  return (
    <span
      className={`inline-grid h-5 w-6 shrink-0 place-items-center text-[10px] font-black uppercase tracking-[.08em] ${wordTypeMarkStyles[type]}`}
      title={type}
      aria-label={type}
    >
      {wordTypeMarks[type]}
    </span>
  );
}

export function TargetBadge({ target }: { target: Target }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs font-bold capitalize ${targetStyles[target]}`}
    >
      <span className="size-1.5 rounded-full bg-current opacity-70" />
      {target} target
    </span>
  );
}

export function BooleanBadge({ label, value }: { label: string; value: boolean }) {
  return (
    <span
      className={`${badgeBase} ${
        value
          ? "border-[#285149] bg-[#173b37] text-[#9be5d3]"
          : "border-[#66542e] bg-[#30291b] text-[#e9ca82]"
      }`}
    >
      <span className="text-[10px]">{value ? "✓" : "×"}</span>
      {label}
    </span>
  );
}

export function ScoreBadge({ value }: { value: number }) {
  const tone =
    value >= 8
      ? "border-[#285149] bg-[#173b37] text-[#9be5d3]"
      : value >= 5
        ? "border-[#66542e] bg-[#30291b] text-[#e9ca82]"
        : "border-[#70464d] bg-[var(--danger-soft)] text-[#f2a098]";

  return <span className={`${badgeBase} ${tone}`}>{value}/10</span>;
}
export function PageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <header className="mb-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
      <div>
        <p className="eyebrow mb-2.5">{eyebrow}</p>
        <h1 className="text-3xl font-black tracking-[-.045em] text-[#f5f7fa] sm:text-4xl">
          {title}
        </h1>
        {description && (
          <p className="mt-2.5 max-w-2xl text-base leading-7 text-[#9aa8ba]">
            {description}
          </p>
        )}
      </div>
      {action}
    </header>
  );
}
export function LoadingState() {
  return (
    <div className="surface grid min-h-72 place-items-center p-8">
      <div className="text-center">
        <span className="mx-auto mb-4 block size-8 animate-spin rounded-full border-4 border-[#26364a] border-t-[#91a8f7]" />
        <p className="font-bold text-[#9aa8ba]">Loading your words…</p>
      </div>
    </div>
  );
}
export function EmptyState({
  title,
  text,
  action,
}: {
  title: string;
  text: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="surface grid min-h-64 place-items-center p-8 text-center">
      <div className="max-w-md">
        <div className="mx-auto mb-5 grid size-14 place-items-center rounded-2xl border border-[#30435a] bg-[#192538] text-2xl font-black text-[#b6c3f5]">
          W
        </div>
        <h2 className="text-xl font-black text-[#f5f7fa]">{title}</h2>
        <p className="mt-2 text-base leading-7 text-[#9aa8ba]">{text}</p>
        {action && <div className="mt-5">{action}</div>}
      </div>
    </div>
  );
}
