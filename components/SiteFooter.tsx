"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { FeedbackLink } from "./FeedbackButton";
import { useDemo } from "@/lib/store";
import { roleForPath } from "@/lib/steps";

export function SiteFooter() {
  const { actions } = useDemo();
  const router = useRouter();
  const pathname = usePathname();
  const role = roleForPath(pathname);

  return (
    <footer className="border-t border-line bg-white px-4 pb-24 pt-5 md:pb-8 sm:px-6">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <nav aria-label="More about GoHome" className="flex flex-wrap gap-x-5 gap-y-0 text-sm font-bold">
            {role === "owner" && (
              <Link href="/pricing" className="inline-flex min-h-11 items-center underline underline-offset-4">
                Pricing
              </Link>
            )}
            <Link href="/about#faq" className="inline-flex min-h-11 items-center underline underline-offset-4">
              Help and FAQ
            </Link>
            <Link href="/about#contact" className="inline-flex min-h-11 items-center underline underline-offset-4">
              Contact
            </Link>
            <FeedbackLink />
          </nav>
          <p className="text-sm text-ink-soft">
            GoHome is a student project (California only, for now). All names, prices, and addresses are sample data, and nothing is
            really sent or charged.
          </p>
        </div>
        <button
          type="button"
          className="btn btn-ghost text-sm"
          onClick={() => {
            actions.reset();
            router.push("/");
          }}
        >
          Reset sample data
        </button>
      </div>
    </footer>
  );
}
