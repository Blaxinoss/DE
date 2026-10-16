"use client";

import Link from "next/link";
import { useActionState, useEffect } from "react";
import { ArrowLeft, KeyRound, LoaderCircle, Mail } from "lucide-react";
import { toast } from "sonner";
import { requestPasswordReset, updatePassword } from "@/features/auth/actions";
import { initialAuthState } from "@/features/auth/state";

type RecoveryMode = "request" | "update";

export function PasswordRecoveryForm({ mode }: { mode: RecoveryMode }) {
  const isRequest = mode === "request";
  const [state, formAction, pending] = useActionState(
    isRequest ? requestPasswordReset : updatePassword,
    initialAuthState,
  );

  useEffect(() => {
    if (state.status === "error" && state.message && !state.fieldErrors) {
      toast.error("Account recovery failed", { description: state.message });
    } else if (state.status === "success" && state.message) {
      toast.success("Recovery email sent", { description: state.message });
    }
  }, [state]);

  return (
    <main className="grid min-h-screen place-items-center px-4 py-10 sm:px-6">
      <section className="surface w-full max-w-md p-6 sm:p-8">
        <Link
          href="/"
          className="mb-8 inline-flex items-center gap-2 text-sm font-bold text-[var(--muted)] transition hover:text-[var(--ink)]"
        >
          <ArrowLeft size={16} />
          Back to sign in
        </Link>

        <span className="grid size-12 place-items-center rounded-2xl bg-[var(--blue-soft)] text-[var(--blue)]">
          {isRequest ? <Mail size={23} /> : <KeyRound size={23} />}
        </span>
        <p className="eyebrow mt-6">Account recovery</p>
        <h1 className="mt-2 text-3xl font-black tracking-[-.035em] text-[var(--ink)]">
          {isRequest ? "Reset your password" : "Choose a new password"}
        </h1>
        <p className="mt-3 leading-6 text-[var(--muted)]">
          {isRequest
            ? "Enter your account email and we'll send you a secure reset link."
            : "Use at least 6 characters, then sign in again with your new password."}
        </p>

        <form
          className="mt-8 space-y-5"
          action={formAction}
        >
          {isRequest ? (
            <label className="block">
              <span className="label">Email</span>
              <input
                className="field"
                type="email"
                name="email"
                autoComplete="email"
                placeholder="you@example.com"
                aria-invalid={Boolean(state.fieldErrors?.email)}
                required
              />
              {state.fieldErrors?.email?.map((error) => (
                <span
                  className="mt-1.5 block text-sm font-semibold text-[var(--danger)]"
                  key={error}
                >
                  {error}
                </span>
              ))}
            </label>
          ) : (
            <>
              <label className="block">
                <span className="label">New password</span>
                <input
                  className="field"
                  type="password"
                  name="password"
                  autoComplete="new-password"
                  placeholder="At least 6 characters"
                  minLength={6}
                  aria-invalid={Boolean(state.fieldErrors?.password)}
                  required
                />
                {state.fieldErrors?.password?.map((error) => (
                  <span
                    className="mt-1.5 block text-sm font-semibold text-[var(--danger)]"
                    key={error}
                  >
                    {error}
                  </span>
                ))}
              </label>

              <label className="block">
                <span className="label">Confirm new password</span>
                <input
                  className="field"
                  type="password"
                  name="confirmPassword"
                  autoComplete="new-password"
                  placeholder="Repeat your new password"
                  minLength={6}
                  aria-invalid={Boolean(state.fieldErrors?.confirmPassword)}
                  required
                />
                {state.fieldErrors?.confirmPassword?.map((error) => (
                  <span
                    className="mt-1.5 block text-sm font-semibold text-[var(--danger)]"
                    key={error}
                  >
                    {error}
                  </span>
                ))}
              </label>
            </>
          )}

          {state.status === "success" && state.message && (
            <p
              role="status"
              className="rounded-xl border border-[#31584f] bg-[#17352f] px-4 py-3 text-sm font-semibold text-[var(--teal)]"
            >
              {state.message}
            </p>
          )}

          {state.status !== "success" && (
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
              ) : null}
              {pending
                ? "Please wait..."
                : isRequest
                  ? "Send reset link"
                  : "Update password"}
            </button>
          )}
        </form>
      </section>
    </main>
  );
}
