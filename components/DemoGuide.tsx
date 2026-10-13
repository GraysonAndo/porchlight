"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { STEPS, stepForPath } from "@/lib/steps";

/** Collapsible list of the 9 steps so the presenter can jump to any screen. */
export function DemoGuide() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const current = stepForPath(pathname)?.n;

  return (
    <div className="border-b border-line/70 bg-glow-tint/50">
      <div className="mx-auto w-full max-w-5xl px-4 sm:px-6">
        <button
          type="button"
          className="flex min-h-11 w-full items-center justify-between gap-3 py-1 text-left text-base font-bold"
          aria-expanded={open}
          aria-controls="demo-guide-panel"
          onClick={() => setOpen((v) => !v)}
        >
          <span>
            Demo guide
            <span className="ml-2 font-normal text-ink-soft">
              {current ? `Step ${current} of ${STEPS.length}` : "9 steps"}
            </span>
          </span>
          <span aria-hidden="true" className="text-lg">
            {open ? "Hide ▲" : "Show ▼"}
          </span>
        </button>
        {open && (
          <ol id="demo-guide-panel" className="grid gap-1 pb-3 sm:grid-cols-2 lg:grid-cols-3">
            {STEPS.map((step) => {
              const active = step.n === current;
              return (
                <li key={step.n}>
                  <Link
                    href={step.path}
                    aria-current={active ? "step" : undefined}
                    className={`flex min-h-11 items-center gap-3 rounded-xl px-3 py-1.5 text-base ${
                      active ? "bg-ink font-bold text-cream" : "bg-white font-semibold hover:bg-cream-deep"
                    }`}
                  >
                    <span
                      aria-hidden="true"
                      className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-extrabold ${
                        active ? "bg-glow text-ink" : "bg-cream-deep text-ink"
                      }`}
                    >
                      {step.n}
                    </span>
                    <span>
                      {step.title}
                      {active && <span className="ml-2 text-sm font-semibold">(you are here)</span>}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </div>
  );
}
