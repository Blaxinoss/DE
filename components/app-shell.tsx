"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, ArrowUpFromLine, BookOpen, LayoutDashboard, Repeat2 } from "lucide-react";
import { useVocabulary } from "./vocabulary-provider";

const nav = [
  { href: "/", label: "Today", icon: LayoutDashboard }, { href: "/vocabulary", label: "Vocabulary", icon: BookOpen },
  { href: "/review", label: "Review", icon: Repeat2 }, { href: "/activate", label: "Activate", icon: Activity },
  { href: "/transfer", label: "Transfer", icon: ArrowUpFromLine },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname(); const { demoMode } = useVocabulary();
  return <div className="mx-auto min-h-screen max-w-[1500px] md:grid md:grid-cols-[245px_1fr]">
    <aside className="sticky top-0 hidden h-screen flex-col border-r border-[#dfe4ee] bg-[#f8f9fd]/90 px-5 py-7 backdrop-blur md:flex">
      <Link href="/" className="mb-10 flex items-center gap-3 px-2" aria-label="Wortweg home"><span className="grid size-10 place-items-center rounded-xl bg-[#172033] text-lg font-black text-[#c9f46a]">W</span><span><span className="block text-lg font-black tracking-tight">Wortweg</span><span className="text-xs font-semibold text-[#7b8395]">passive → active</span></span></Link>
      <nav className="space-y-1.5" aria-label="Main navigation">{nav.map(({ href, label, icon: Icon }) => { const active = href === "/" ? pathname === href : pathname.startsWith(href); return <Link key={href} href={href} className={`flex min-h-12 items-center gap-3 rounded-xl px-3.5 text-sm font-bold transition ${active ? "bg-[#172033] text-white shadow-lg shadow-[#172033]/10" : "text-[#626b7f] hover:bg-white hover:text-[#172033]"}`}><Icon size={19} strokeWidth={2.2}/>{label}</Link>; })}</nav>
      <div className="mt-auto rounded-2xl border border-[#dfe4ee] bg-white p-4 text-sm leading-relaxed text-[#687085]"><span className={`mb-2 inline-flex rounded-full px-2.5 py-1 text-xs font-extrabold ${demoMode ? "bg-[#fff1ec] text-[#a6402f]" : "bg-[#e8f8df] text-[#286225]"}`}>{demoMode ? "Demo mode" : "Supabase connected"}</span><p>{demoMode ? "Add Supabase keys to sync your progress across devices." : "Your learning progress is being saved."}</p></div>
    </aside>
    <main className="min-w-0 px-4 py-5 sm:px-7 md:px-10 md:py-8 lg:px-12">{children}</main>
    <nav className="fixed inset-x-3 bottom-3 z-40 grid grid-cols-5 rounded-2xl border border-[#dfe4ee] bg-white/95 p-1.5 shadow-[0_18px_45px_rgba(23,32,51,.18)] backdrop-blur md:hidden" aria-label="Mobile navigation">{nav.map(({ href, label, icon: Icon }) => { const active = href === "/" ? pathname === href : pathname.startsWith(href); return <Link key={href} href={href} className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl text-[11px] font-bold ${active ? "bg-[#172033] text-white" : "text-[#6d7587]"}`}><Icon size={18}/>{label}</Link>; })}</nav>
  </div>;
}
