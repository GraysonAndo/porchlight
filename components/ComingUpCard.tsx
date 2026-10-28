"use client";

import Link from "next/link";
import { comingUp, inDaysText } from "@/lib/comingUp";
import { longDate } from "@/lib/format";
import { useDemo } from "@/lib/store";

/** The dates GoHome is keeping track of, so the owner does not have to. */
export function ComingUpCard() {
  const { state, hydrated } = useDemo();
  // Dates depend on today, so the list waits for the browser and the server do not disagree.
  if (!hydrated) return null;
  const utilitiesPaid = state.payments.some((p) => p.kind === "utilities");
  const items = comingUp({ utilitiesPaid });
  if (items.length === 0) return null;
  return (
    <section aria-labelledby="coming-heading" className="card space-y-3">
      <h2 id="coming-heading" className="text-xl font-extrabold">
        Coming up
      </h2>
      <p className="text-sm text-ink-soft">Dates GoHome is keeping track of, so you do not have to.</p>
      <ul className="divide-y divide-line">
        {items.map((i) => (
          <li key={i.id} className="py-2">
            <p className="flex flex-wrap items-baseline justify-between gap-x-3">
              <span className="font-bold">
                {i.href ? (
                  <Link href={i.href} className="underline underline-offset-4">
                    {i.title}
                  </Link>
                ) : (
                  i.title
                )}
              </span>
              <span className="text-sm font-bold text-ink-soft">
                {longDate(i.date)}, {inDaysText(i.inDays)}
              </span>
            </p>
            <p className="text-sm text-ink-soft">{i.detail}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
