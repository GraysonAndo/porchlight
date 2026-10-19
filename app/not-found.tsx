import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-xl space-y-4 py-10 text-center">
      <p className="eyebrow">Page not found</p>
      <h1 className="font-display text-4xl font-extrabold">We could not find that page</h1>
      <p className="text-ink-soft">Here is where you can go instead.</p>
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
        <Link href="/" className="btn btn-primary">
          Home
        </Link>
        <Link href="/owner" className="btn btn-secondary">
          Owner inbox
        </Link>
        <Link href="/tenant" className="btn btn-secondary">
          Tenant view
        </Link>
      </div>
    </div>
  );
}
