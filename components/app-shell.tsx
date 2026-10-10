"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  ArrowUpFromLine,
  BookOpen,
  History,
  LayoutDashboard,
  Languages,
  LogOut,
  Repeat2,
} from "lucide-react";
import { signOut } from "@/features/auth/actions";
import { languageDetails } from "@/features/learning/language-config";
import { LearningLanguage } from "@/features/learning/types";
import { useVocabulary } from "@/features/vocabulary/components/vocabulary-provider";

const nav = [
  { href: "/dashboard", label: "Today", icon: LayoutDashboard },
  { href: "/vocabulary", label: "Vocabulary", icon: BookOpen },
  { href: "/review", label: "Review", icon: Repeat2 },
  { href: "/activate", label: "Activate", icon: Activity },
  { href: "/history", label: "History", icon: History },
  { href: "/transfer", label: "Transfer", icon: ArrowUpFromLine },
];

function Brand() {
  return (
    <Link
      href="/dashboard"
      className="flex items-center gap-3"
      aria-label="Wortweg home"
    >
      <span className="grid size-10 place-items-center rounded-xl bg-[var(--lime)] text-lg font-black text-[#17200e] shadow-[0_8px_22px_rgba(185,223,114,.12)]">
        W
      </span>
      <span>
        <span className="block text-lg font-black tracking-tight text-[var(--ink)]">
          Wortweg
        </span>
        <span className="text-xs font-semibold text-[var(--muted)]">
          learn → recall → active
        </span>
      </span>
    </Link>
  );
}

function LanguageSwitcher({
  language,
  busy,
  compact = false,
  onChange,
}: {
  language: LearningLanguage;
  busy: boolean;
  compact?: boolean;
  onChange(language: LearningLanguage): void;
}) {
  const nextLanguage: LearningLanguage = language === "de" ? "en" : "de";
  const current = languageDetails[language];
  const next = languageDetails[nextLanguage];

  return (
    <button
      type="button"
      disabled={busy}
      onClick={() => onChange(nextLanguage)}
      className={`flex items-center rounded-xl border border-[var(--blue-line)] bg-[var(--blue-soft)] text-left text-[var(--blue)] transition hover:border-[var(--blue)] hover:text-[var(--ink)] ${
        compact ? "min-h-10 gap-2 px-3" : "w-full gap-3 px-3.5 py-3"
      }`}
      aria-label={`Switch learning language to ${next.name}`}
      title={`Switch to ${next.name}`}
    >
      <Languages size={18} />
      {compact ? (
        <span className="text-xs font-black uppercase">{current.code}</span>
      ) : (
        <span className="min-w-0">
          <span className="block text-[10px] font-black uppercase tracking-[.14em] text-[var(--muted)]">
            Learning
          </span>
          <span className="block text-sm font-extrabold text-[var(--ink)]">
            {busy ? "Switching…" : current.nativeName}
          </span>
        </span>
      )}
      {!compact && (
        <span className="ml-auto text-xs font-black uppercase text-[var(--blue)]">
          {next.code}
        </span>
      )}
    </button>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { databaseConnected, language, setLearningLanguage, switchingLanguage } =
    useVocabulary();
  const isAuthPage = pathname === "/" || pathname === "/signup";

  if (isAuthPage) return children;

  return (
    <div className="mx-auto min-h-screen md:grid md:grid-cols-[264px_1fr]">
      <aside className="sticky top-0 hidden h-screen flex-col border-r border-[var(--line)] bg-[#0d141e]/88 px-5 py-7 backdrop-blur-xl md:flex">
        <div className="px-2">
          <Brand />
        </div>

        <div className="mt-8 px-1">
          <LanguageSwitcher
            language={language}
            busy={switchingLanguage}
            onChange={(next) => void setLearningLanguage(next)}
          />
        </div>

        <p className="mb-2 mt-7 px-3 text-[10px] font-black uppercase tracking-[.18em] text-[#68778b]">
          Workspace
        </p>
        <nav
          className="space-y-1.5"
          aria-label="Main navigation"
        >
          {nav.map(({ href, label, icon: Icon }) => {
            const active = pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={`relative flex min-h-12 items-center gap-3 rounded-xl px-3.5 text-sm font-bold transition ${
                  active
                    ? "bg-[var(--blue-soft)] text-[var(--ink)]"
                    : "text-[var(--muted)] hover:bg-[var(--panel-soft)] hover:text-[var(--ink)]"
                }`}
              >
                {active && (
                  <span className="absolute inset-y-3 left-0 w-0.5 rounded-full bg-[var(--blue)]" />
                )}
                <Icon
                  size={19}
                  strokeWidth={2.2}
                  className={active ? "text-[var(--blue)]" : ""}
                />
                {label}
              </Link>
            );
          })}
        </nav>

        <form
          action={signOut}
          className="mt-6"
        >
          <button
            type="submit"
            className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3.5 text-sm font-bold text-[var(--muted)] transition hover:bg-[var(--danger-soft)] hover:text-[var(--danger)]"
          >
            <LogOut size={18} />
            Sign out
          </button>
        </form>

        <div className="surface-muted mt-auto p-4 text-sm leading-relaxed text-[var(--muted)]">
          <span
            className={`mb-2 inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-xs font-extrabold ${
              databaseConnected
                ? "bg-[#17352f] text-[var(--teal)]"
                : "bg-[var(--danger-soft)] text-[var(--danger)]"
            }`}
          >
            <span className="size-1.5 rounded-full bg-current" />
            {databaseConnected ? "Database connected" : "Database offline"}
          </span>
          <p>
            {databaseConnected
              ? "Your learning progress is saved to your account."
              : "Add your Supabase keys to load and save vocabulary."}
          </p>
        </div>
      </aside>

      <div className="min-w-0">
        <header className="flex items-center justify-between border-b border-[var(--line)] bg-[#0d141e]/80 px-4 py-3 backdrop-blur md:hidden">
          <Brand />
          <div className="flex items-center gap-1.5">
            <LanguageSwitcher
              language={language}
              busy={switchingLanguage}
              compact
              onChange={(next) => void setLearningLanguage(next)}
            />
            <form action={signOut}>
              <button
                type="submit"
                className="icon-button"
                aria-label="Sign out"
              >
                <LogOut size={18} />
              </button>
            </form>
          </div>
        </header>
        <main className="min-w-0 px-4 py-6 sm:px-7 md:px-10 md:py-8 lg:px-12">
          {children}
        </main>
      </div>

      <nav
        className="fixed inset-x-3 bottom-3 z-40 grid grid-cols-6 rounded-2xl border border-[var(--line)] bg-[#101925]/95 p-1.5 shadow-[0_18px_45px_rgba(0,0,0,.4)] backdrop-blur-xl md:hidden"
        aria-label="Mobile navigation"
      >
        {nav.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={`flex min-h-14 min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-1 text-[10px] font-bold transition ${
                active ? "bg-[var(--blue-strong)] text-white" : "text-[var(--muted)]"
              }`}
            >
              <Icon size={18} />
              <span className="truncate">{label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
