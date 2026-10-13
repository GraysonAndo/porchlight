"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { roleForPath } from "@/lib/steps";
import { Badge } from "./ui";
import { Logo } from "./Logo";

export function SiteHeader() {
  const pathname = usePathname();
  const role = roleForPath(pathname);

  // Phone: logo and Notes on the first row, the role chip on its own row. Wider screens: one row.
  return (
    <header className="border-b border-line/70 bg-cream/80 backdrop-blur">
      <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center gap-x-2 px-4 py-1 sm:px-6 sm:py-2">
        <Link href="/" className="order-1 mr-auto inline-flex min-h-11 items-center rounded-lg" aria-label="Porchlight home">
          <Logo />
        </Link>
        <Link
          href="/feedback"
          className="btn btn-ghost order-2 !px-2 text-sm whitespace-nowrap sm:order-3"
          aria-label="Feedback notes"
        >
          <span className="sm:hidden">Notes</span>
          <span className="hidden sm:inline">Feedback notes</span>
        </Link>
        {role && (
          <div className="order-3 flex w-full items-center gap-2 pb-1 sm:order-2 sm:w-auto sm:pb-0">
            <Badge tone="info" icon={false}>
              {role === "owner" ? "Owner view" : "Tenant view"}
            </Badge>
            <Link href="/" className="btn btn-ghost !px-2 text-sm whitespace-nowrap">
              Switch role
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}
