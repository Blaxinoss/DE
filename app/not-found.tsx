import Link from "next/link";

export default function NotFound() {
  return (
    <div className="surface grid min-h-72 place-items-center p-8 text-center">
      <div>
        <p className="eyebrow">404</p>
        <h1 className="mt-2 text-2xl font-black text-[var(--ink)]">Page not found</h1>
        <p className="mt-2 text-[var(--muted)]">This learning page does not exist.</p>
        <Link
          href="/dashboard"
          className="btn-primary mt-5"
        >
          Back to today
        </Link>
      </div>
    </div>
  );
}
