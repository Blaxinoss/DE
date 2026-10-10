import { VocabularyState } from "@/features/learning/types";

const stateNames: Record<VocabularyState, string> = {
  new: "New",
  learning: "Learning",
  recall: "Recall",
  active: "Active",
};
const stateStyles: Record<VocabularyState, string> = {
  new: "bg-[#202b39] text-[#c4ceda]",
  learning: "bg-[#3b321f] text-[#e9ca82]",
  recall: "bg-[#24324c] text-[#aebcf3]",
  active: "bg-[#b9df72] text-[#17200e]",
};

export function StateBadge({ state }: { state: VocabularyState }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-extrabold ${stateStyles[state]}`}
    >
      {stateNames[state]}
    </span>
  );
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
