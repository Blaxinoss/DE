import { VocabularyState } from "@/lib/types";

const stateNames: Record<VocabularyState, string> = { new: "New", recognition: "Recognition", passive: "Passive", slow_recall: "Slow recall", usable: "Usable", active: "Active" };
const stateStyles: Record<VocabularyState, string> = { new: "bg-[#eef0f5] text-[#596174]", recognition: "bg-[#fff1c7] text-[#7a5911]", passive: "bg-[#ffe9e4] text-[#963b2e]", slow_recall: "bg-[#e9efff] text-[#2757d6]", usable: "bg-[#e3f7ef] text-[#17664c]", active: "bg-[#172033] text-[#c9f46a]" };

export function StateBadge({ state }: { state: VocabularyState }) { return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-extrabold ${stateStyles[state]}`}>{stateNames[state]}</span>; }
export function PageHeader({ eyebrow, title, description, action }: { eyebrow: string; title: string; description?: string; action?: React.ReactNode }) {
  return <header className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="eyebrow mb-2">{eyebrow}</p><h1 className="text-3xl font-black tracking-[-.04em] sm:text-4xl">{title}</h1>{description && <p className="mt-2 max-w-2xl text-base leading-relaxed text-[#687085]">{description}</p>}</div>{action}</header>;
}
export function LoadingState() { return <div className="surface grid min-h-72 place-items-center p-8"><div className="text-center"><span className="mx-auto mb-4 block size-8 animate-spin rounded-full border-4 border-[#dfe4ee] border-t-[#2757d6]"/><p className="font-bold text-[#687085]">Loading your words…</p></div></div>; }
export function EmptyState({ title, text, action }: { title: string; text: string; action?: React.ReactNode }) { return <div className="surface grid min-h-64 place-items-center p-8 text-center"><div className="max-w-md"><div className="mx-auto mb-5 grid size-14 place-items-center rounded-2xl bg-[#e9efff] text-2xl font-black">W</div><h2 className="text-xl font-black">{title}</h2><p className="mt-2 text-base leading-relaxed text-[#687085]">{text}</p>{action && <div className="mt-5">{action}</div>}</div></div>; }
