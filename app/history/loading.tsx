const skeletonCards = [0, 1, 2];

export default function HistoryLoading() {
  return (
    <div
      aria-busy="true"
      aria-label="Loading activation history"
      role="status"
    >
      <header className="mb-8 flex animate-pulse flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div className="w-full max-w-2xl">
          <div className="h-3 w-36 rounded-full bg-[var(--panel-muted)]" />
          <div className="mt-4 h-10 w-64 max-w-full rounded-xl bg-[var(--panel-muted)]" />
          <div className="mt-3 h-5 w-full rounded-lg bg-[var(--panel-muted)]" />
        </div>
        <div className="h-10 w-24 rounded-full bg-[var(--panel-muted)]" />
      </header>

      <div className="space-y-4">
        {skeletonCards.map((card) => (
          <div
            key={card}
            className="surface animate-pulse p-5 sm:p-6"
          >
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
              <div className="flex flex-1 gap-3">
                <div className="size-5 shrink-0 rounded-full bg-[var(--panel-muted)]" />
                <div className="w-full max-w-xl">
                  <div className="h-5 w-3/4 rounded-lg bg-[var(--panel-muted)]" />
                  <div className="mt-3 h-3 w-44 rounded-full bg-[var(--panel-muted)]" />
                </div>
              </div>

              <div className="flex gap-2">
                <div className="h-8 w-24 rounded-lg bg-[var(--panel-muted)]" />
                <div className="h-8 w-20 rounded-lg bg-[var(--panel-muted)]" />
                <div className="h-8 w-20 rounded-lg bg-[var(--panel-muted)]" />
              </div>
            </div>
          </div>
        ))}
      </div>
      <span className="sr-only">Loading activation history...</span>
    </div>
  );
}
