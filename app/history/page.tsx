import Link from "next/link";
import { redirect } from "next/navigation";
import { ActivationHistoryList } from "@/features/activation/components/activation-history-list";
import { EmptyState, PageHeader } from "@/components/ui";
import {
  ACTIVATION_HISTORY_PAGE_SIZE,
  getActivationHistory,
} from "@/features/activation/history-query";
import type { LearningLanguage } from "@/features/learning/types";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const requestedPage = Number.parseInt((await searchParams).page ?? "1", 10);
  const page = Number.isFinite(requestedPage) ? Math.max(requestedPage, 1) : 1;
  const client = await createServerSupabaseClient();
  const {
    data: { user },
  } = await client.auth.getUser();

  if (!user) redirect("/");

  const { data: preferences } = await client
    .from("user_preferences")
    .select("learning_language")
    .maybeSingle();
  const language: LearningLanguage =
    preferences?.learning_language === "en" ? "en" : "de";
  const { attempts, total } = await getActivationHistory(client, language, page);
  const pageCount = Math.max(Math.ceil(total / ACTIVATION_HISTORY_PAGE_SIZE), 1);

  if (page > pageCount && total) redirect(`/history?page=${pageCount}`);

  return (
    <>
      <PageHeader
        eyebrow="Production practice"
        title="Activation history"
        description="Revisit your writing, corrections and target-word performance."
        action={
          total ? (
            <span className="chip px-3 py-2 text-sm font-bold">
              {total} attempt{total === 1 ? "" : "s"}
            </span>
          ) : undefined
        }
      />

      {attempts.length ? (
        <>
          <ActivationHistoryList attempts={attempts} />
          {pageCount > 1 && (
            <nav className="mt-6 flex items-center justify-between gap-3">
              {page > 1 ? (
                <Link
                  className="btn-secondary"
                  href={`/history?page=${page - 1}`}
                >
                  Previous
                </Link>
              ) : (
                <span />
              )}
              <span className="text-sm font-bold text-[var(--muted)]">
                Page {page} of {pageCount}
              </span>
              {page < pageCount ? (
                <Link
                  className="btn-secondary"
                  href={`/history?page=${page + 1}`}
                >
                  Next
                </Link>
              ) : (
                <span />
              )}
            </nav>
          )}
        </>
      ) : (
        <EmptyState
          title="No activation history yet"
          text="Complete an activation exercise and its saved evaluation will appear here."
          action={
            <Link
              className="btn-primary"
              href="/activate"
            >
              Start activation
            </Link>
          }
        />
      )}
    </>
  );
}
