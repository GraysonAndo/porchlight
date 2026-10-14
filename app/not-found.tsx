import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-xl space-y-4 py-10 text-center">
      <p className="eyebrow">Page not found</p>
      <h1 className="font-display text-4xl font-extrabold">That page is not part of the demo</h1>
      <p className="text-ink-soft">Here are the places that are.</p>
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
        <Link href="/" className="btn btn-primary">
          Home
        </Link>
        <Link href="/owner" className="btn btn-secondary">
          Owner home
        </Link>
        <Link href="/tenant" className="btn btn-secondary">
          Tenant view
        </Link>
      </div>
    </div>
  );
}
