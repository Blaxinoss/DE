"use client";

import Link from "next/link";
import { useActionState, useEffect } from "react";
import { ArrowRight, BookOpenCheck, LoaderCircle } from "lucide-react";
import { toast } from "sonner";
import { login, signup } from "@/features/auth/actions";
import { initialAuthState } from "@/features/auth/state";

type AuthMode = "login" | "signup";

export function AuthForm({ mode, notice }: { mode: AuthMode; notice?: string }) {
  const isLogin = mode === "login";
  const [state, formAction, pending] = useActionState(
    isLogin ? login : signup,
    initialAuthState,
  );

  useEffect(() => {
    if (state.status === "error" && state.message && !state.fieldErrors) {
      toast.error(isLogin ? "Could not sign in" : "Could not create your account", {
        description: state.message,
      });
    } else if (state.status === "success" && state.message) {
      toast.success("Account created", { description: state.message });
    }
  }, [isLogin, state]);

  useEffect(() => {
    if (notice) toast.success(notice, { id: "auth-notice" });
  }, [notice]);

  return (
    <main className="grid min-h-screen place-items-center px-4 py-10 sm:px-6">
      <section className="grid w-full max-w-5xl overflow-hidden rounded-[2rem] border border-[var(--line)] bg-[var(--panel)] shadow-[0_28px_80px_rgba(0,0,0,.35)] lg:grid-cols-[1.05fr_.95fr]">
        <div className="hidden min-h-[650px] flex-col justify-between bg-[radial-gradient(circle_at_20%_15%,rgba(113,136,232,.24),transparent_35%),linear-gradient(145deg,#18263b,#0e1723)] p-10 lg:flex">
          <Link
            href="/"
            className="flex items-center gap-3"
            aria-label="Wortweg"
          >
            <span className="grid size-11 place-items-center rounded-xl bg-[var(--lime)] text-xl font-black text-[#17200e]">
              W
            </span>
            <span className="text-xl font-black tracking-tight">Wortweg</span>
          </Link>

          <div>
            <span className="mb-6 grid size-14 place-items-center rounded-2xl border border-white/10 bg-white/8 text-[var(--lime)]">
              <BookOpenCheck size={27} />
            </span>
            <p className="max-w-md text-4xl font-black leading-tight tracking-[-.04em] text-white">
              Turn words you recognize into words you can use.
            </p>
            <p className="mt-5 max-w-md text-base leading-7 text-[var(--ink-soft)]">
              A calm, focused path from first contact to natural active recall.
            </p>
          </div>

          <p className="text-sm font-semibold text-[var(--muted)]">
            Recognition is only the beginning.
          </p>
        </div>

        <div className="flex min-h-[650px] items-center p-6 sm:p-10 lg:p-12">
          <div className="mx-auto w-full max-w-sm">
            <Link
              href="/"
              className="mb-10 flex items-center gap-3 lg:hidden"
            >
              <span className="grid size-10 place-items-center rounded-xl bg-[var(--lime)] font-black text-[#17200e]">
                W
              </span>
              <span className="text-lg font-black">Wortweg</span>
            </Link>

            <p className="eyebrow">{isLogin ? "Welcome back" : "Start your path"}</p>
            <h1 className="mt-2 text-3xl font-black tracking-[-.035em] text-[var(--ink)]">
              {isLogin ? "Sign in to continue" : "Create your account"}
            </h1>
            <p className="mt-3 leading-6 text-[var(--muted)]">
              {isLogin
                ? "Your vocabulary and review history are waiting for you."
                : "Keep your vocabulary private and synced across sessions."}
            </p>

            <form
              className="mt-8 space-y-5"
              action={formAction}
            >
              <label className="block">
                <span className="label">Email</span>
                <input
                  className="field"
                  type="email"
                  name="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  aria-invalid={Boolean(state.fieldErrors?.email)}
                  aria-describedby={
                    state.fieldErrors?.email ? "email-error" : undefined
                  }
                  required
                />
                {state.fieldErrors?.email?.map((error) => (
                  <span
                    id="email-error"
                    className="mt-1.5 block text-sm font-semibold text-[var(--danger)]"
                    key={error}
                  >
                    {error}
                  </span>
                ))}
              </label>

              <label className="block">
                <span className="label">Password</span>
                <input
                  className="field"
                  type="password"
                  name="password"
                  autoComplete={isLogin ? "current-password" : "new-password"}
                  placeholder="At least 6 characters"
                  minLength={6}
                  aria-invalid={Boolean(state.fieldErrors?.password)}
                  aria-describedby={
                    state.fieldErrors?.password ? "password-error" : undefined
                  }
                  required
                />
                {state.fieldErrors?.password?.map((error) => (
                  <span
                    id="password-error"
                    className="mt-1.5 block text-sm font-semibold text-[var(--danger)]"
                    key={error}
                  >
                    {error}
                  </span>
                ))}
              </label>

              {isLogin && (
                <div className="-mt-3 text-right">
                  <Link
                    href="/forgot-password"
                    className="text-sm font-bold text-[var(--blue)] transition hover:text-[var(--ink)]"
                  >
                    Forgot password?
                  </Link>
                </div>
              )}

              {notice && state.status === "idle" && (
                <p
                  role="status"
                  className="rounded-xl border border-[#31584f] bg-[#17352f] px-4 py-3 text-sm font-semibold text-[var(--teal)]"
                >
                  {notice}
                </p>
              )}

              {state.status === "success" && state.message && (
                <p
                  role="status"
                  className="rounded-xl border border-[#31584f] bg-[#17352f] px-4 py-3 text-sm font-semibold text-[var(--teal)]"
                >
                  {state.message}
                </p>
              )}

              <button
                className="btn-primary w-full"
                type="submit"
                disabled={pending}
              >
                {pending ? (
                  <LoaderCircle
                    className="animate-spin"
                    size={18}
                  />
                ) : (
                  <ArrowRight size={18} />
                )}
                {pending ? "Please wait..." : isLogin ? "Sign in" : "Create account"}
              </button>
            </form>

            <p className="mt-7 text-center text-sm text-[var(--muted)]">
              {isLogin ? "New to Wortweg?" : "Already have an account?"}{" "}
              <Link
                href={isLogin ? "/signup" : "/"}
                className="font-extrabold text-[var(--blue)] transition hover:text-[var(--ink)]"
              >
                {isLogin ? "Create an account" : "Sign in"}
              </Link>
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
