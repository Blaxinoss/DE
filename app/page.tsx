"use client";

import Link from "next/link";
import { Activity, BookPlus, Clock3, Repeat2 } from "lucide-react";
import { isDue, progressPercent } from "@/lib/learning";
import { vocabularyStates } from "@/lib/types";
import { useVocabulary } from "@/components/vocabulary-provider";
import { LoadingState, PageHeader, StateBadge } from "@/components/ui";

export default function Dashboard() {
  const { words, reviews, loading, error } = useVocabulary(); if (loading) return <LoadingState/>;
  const due = words.filter((word) => isDue(word.id, reviews)); const activeTargets = words.filter((word) => word.target === "active");
  const reached = activeTargets.filter((word) => word.state === "active").length; const progress = progressPercent(activeTargets.map((word) => word.state));
  return <><PageHeader eyebrow="Your learning path" title="Guten Morgen" description="Choose the next useful step. Recognition is only the beginning."/>
    {error && <div className="mb-6 rounded-xl border border-[#ffcbbf] bg-[#fff1ed] p-4 font-semibold text-[#8f3629]">{error}</div>}
    <section className="grid gap-4 lg:grid-cols-[1.35fr_.65fr]"><div className="surface overflow-hidden p-6 sm:p-8"><div className="flex items-start justify-between gap-4"><div><p className="eyebrow">Ready now</p><p className="mt-2 text-6xl font-black tracking-[-.06em]">{due.length}</p><p className="mt-1 text-lg font-bold">words due today</p></div><span className="grid size-14 place-items-center rounded-2xl bg-[#c9f46a]"><Clock3 size={26}/></span></div><div className="mt-8 flex flex-col gap-3 sm:flex-row"><Link href="/review" className="btn-primary flex-1"><Repeat2 size={18}/>Start review</Link><Link href="/activate" className="btn-secondary flex-1"><Activity size={18}/>Start activate</Link><Link href="/vocabulary?add=1" className="btn-secondary flex-1"><BookPlus size={18}/>Add vocabulary</Link></div></div>
      <div className="surface bg-[#172033] p-6 text-white sm:p-8"><p className="text-xs font-extrabold uppercase tracking-[.16em] text-[#9eb6ff]">Active target</p><div className="mt-5 flex items-end justify-between"><p className="text-4xl font-black">{progress}%</p><p className="text-sm font-bold text-[#cbd2df]">{reached}/{activeTargets.length} active</p></div><div className="mt-5 h-3 overflow-hidden rounded-full bg-white/12"><div className="h-full rounded-full bg-[#c9f46a] transition-all" style={{ width: `${progress}%` }}/></div><p className="mt-5 text-sm leading-relaxed text-[#cbd2df]">Progress reflects how naturally active-target words move through every learning state.</p></div></section>
    <section className="surface mt-5 p-6 sm:p-8"><div className="mb-5 flex items-center justify-between"><div><p className="eyebrow">Learning states</p><h2 className="mt-1 text-xl font-black">Where your words are now</h2></div><span className="text-sm font-bold text-[#687085]">{words.length} total</span></div><div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">{vocabularyStates.map((state) => <div key={state} className="rounded-2xl border border-[#e4e8f0] bg-[#fafbfe] p-4"><StateBadge state={state}/><p className="mt-4 text-3xl font-black">{words.filter((word) => word.state === state).length}</p></div>)}</div></section>
  </>;
}
