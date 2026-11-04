"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { roleForPath } from "@/lib/steps";

export default function NotFound() {
  // A tenant is not offered the owner's side, and the other way round.
  const role = roleForPath(usePathname() ?? "");
  return (
    <div className="mx-auto max-w-xl space-y-4 py-10 text-center">
      <p className="eyebrow">Page not found</p>
      <h1 className="font-display text-4xl font-extrabold">We could not find that page</h1>
      <p className="text-ink-soft">Here is where you can go instead.</p>
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
        <Link href="/" className="btn btn-primary">
          Home
        </Link>
        {role !== "tenant" && (
          <Link href="/owner" className="btn btn-secondary">
            Owner inbox
          </Link>
        )}
        {role !== "owner" && (
          <Link href="/tenant" className="btn btn-secondary">
            Tenant help
          </Link>
        )}
      </div>
    </div>
  );
}
