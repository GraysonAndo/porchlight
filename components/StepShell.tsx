"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { PAGE_TITLES, REPAIR_TABS } from "@/lib/steps";

const STEP_PATHS: Record<string, string> = {
  "owner-request": "/owner/request",
  "owner-record": "/owner/record",
  "owner-quote": "/owner/quote",
  "owner-decide": "/owner/decide",
  "owner-book": "/owner/book",
  "tools-forecast": "/owner/forecast",
  "tools-rent": "/owner/rent",
};

/** The frame for an owner detail page: a title, and tabs when the page is part of one repair. */
export function StepShell({ stepId, children }: { stepId: string; children: ReactNode; [key: string]: unknown }) {
  const pathname = usePathname();
  const path = STEP_PATHS[stepId] ?? "/owner";
  const isRepair = REPAIR_TABS.some((t) => t.href === path);

  return (
    <div className="mx-auto max-w-4xl">
      {isRepair && (
        <div className="mb-3">
          <Link href="/owner" className="inline-flex min-h-11 items-center font-bold text-brand underline underline-offset-4">
            &larr; Inbox
          </Link>
          <nav aria-label="Repair details" className="mt-1 flex gap-1 overflow-x-auto rounded-xl bg-cream-deep p-1">
            {REPAIR_TABS.map((t) => (
              <Link
                key={t.href}
                href={t.href}
                aria-current={pathname === t.href ? "page" : undefined}
                className={`inline-flex min-h-11 flex-1 items-center justify-center whitespace-nowrap rounded-lg px-3 text-sm font-bold ${
                  pathname === t.href ? "bg-white text-ink shadow-sm" : "text-ink-soft hover:text-ink"
                }`}
              >
                {t.label}
              </Link>
            ))}
          </nav>
        </div>
      )}
      <h1 className="text-3xl font-extrabold leading-tight sm:text-4xl">{PAGE_TITLES[path] ?? "GoHome"}</h1>
      <div className="reveal mt-5 space-y-5">{children}</div>
    </div>
  );
}
