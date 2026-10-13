"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { FLOWS, STEPS, flowSteps, positionOf, stepForPath, type FlowId } from "@/lib/steps";

const ORDER: FlowId[] = ["live", "tenant", "owner", "tools", "optional"];

/** Collapsible list of every screen, grouped by who uses it, so the presenter can jump anywhere. */
export function DemoGuide() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const current = stepForPath(pathname);
  const currentLabel = current
    ? FLOWS[current.flow].numbered
      ? `${FLOWS[current.flow].label} step ${positionOf(current).index} of ${flowSteps(current.flow).length}`
      : FLOWS[current.flow].label
    : `${STEPS.length} screens`;

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
            <span className="ml-1 font-normal text-ink-soft">{" "}{currentLabel}</span>
          </span>
          <span aria-hidden="true" className="text-lg">
            {open ? "Hide ▲" : "Show ▼"}
          </span>
        </button>
        {open && (
          <div id="demo-guide-panel" className="grid gap-4 pb-4 md:grid-cols-2">
            {ORDER.map((flowId) => {
              const flow = FLOWS[flowId];
              const steps = flowSteps(flowId);
              return (
                <section key={flowId} aria-labelledby={`guide-${flowId}`}>
                  <h2 id={`guide-${flowId}`} className="text-sm font-extrabold uppercase tracking-wide text-ink-soft">
                    {flow.label}
                    <span className="ml-1 font-semibold normal-case tracking-normal">{" "}{flow.blurb}</span>
                  </h2>
                  <ol className="mt-1 grid gap-1">
                    {steps.map((step, i) => {
                      const active = step.id === current?.id;
                      return (
                        <li key={step.id}>
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
                              {flow.numbered ? i + 1 : "•"}
                            </span>
                            <span>
                              {step.title}
                              {active && <span className="ml-1 text-sm font-semibold">{" "}(you are here)</span>}
                            </span>
                          </Link>
                        </li>
                      );
                    })}
                  </ol>
                </section>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
