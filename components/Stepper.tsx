"use client";

import { useDemo } from "@/lib/store";
import { FLOWS, flowSteps, positionOf, type Step } from "@/lib/steps";

/** Progress through one flow. Text first, bars second, names on wider screens. */
export function Stepper({ step }: { step: Step }) {
  const flow = FLOWS[step.flow];
  const { state } = useDemo();
  // A step the person chose to skip is not "done".
  const skipped = (id: string) => id === "tenant-label" && state.tenantSkippedLabel;

  // Tools and optional screens are not part of a numbered sequence.
  if (!flow.numbered) {
    return (
      <p className="eyebrow mb-3">
        {flow.label}: {flow.blurb}
      </p>
    );
  }

  const steps = flowSteps(step.flow);
  const { index, total } = positionOf(step);
  return (
    <nav aria-label={`${flow.label} progress`} className="mb-5">
      <p className="eyebrow mb-2">
        {flow.label} view, step {index} of {total}
        <span className="text-ink">: {step.short}</span>
      </p>
      <ol className="flex gap-1.5 sm:gap-2">
        {steps.map((s, i) => {
          const n = i + 1;
          return (
            <li key={s.id} aria-current={n === index ? "step" : undefined} className="min-w-0 flex-1">
              <span
                className={`block h-2.5 rounded-full transition-colors ${
                  skipped(s.id) && n !== index
                    ? "bg-caution-tint ring-1 ring-glow-deep"
                    : n < index
                      ? "bg-good"
                      : n === index
                        ? "bg-glow ring-2 ring-ink"
                        : "bg-line"
                }`}
              />
              <span
                aria-hidden="true"
                className={`mt-1 hidden truncate text-xs font-bold lg:block ${n === index ? "text-ink" : "text-ink-soft"}`}
              >
                {s.short}
                {skipped(s.id) ? " (skipped)" : ""}
              </span>
              <span className="sr-only">
                {s.title}
                {skipped(s.id) ? ", skipped" : n < index ? ", done" : n === index ? ", current step" : ""}
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
