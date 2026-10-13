"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { STEPS } from "@/lib/steps";
import { Stepper } from "./Stepper";

interface StepShellProps {
  step: number;
  children: ReactNode;
  /** Label for the Next button. Defaults to the next screen's name. */
  nextLabel?: string;
  /** Go to a page. Use onNext instead if something must happen first. */
  nextHref?: string;
  onNext?: () => void;
  nextDisabled?: boolean;
  backHref?: string;
  /** An optional quiet third action, such as "Skip" */
  skipLabel?: string;
  skipHref?: string;
  /** Narrower reading width for simple screens */
  narrow?: boolean;
}

export function StepShell({
  step,
  children,
  nextLabel,
  nextHref,
  onNext,
  nextDisabled,
  backHref,
  skipLabel,
  skipHref,
  narrow,
}: StepShellProps) {
  const info = STEPS[step - 1];
  const previous = STEPS[step - 2];
  const next = STEPS[step];
  const back = backHref ?? previous?.path ?? "/";
  const forwardHref = nextHref ?? next?.path ?? "/";
  const forwardLabel = nextLabel ?? (next ? `Next: ${next.title}` : "Back to home");

  return (
    <div className={narrow ? "mx-auto max-w-2xl" : ""}>
      <Stepper current={step} />
      <h1 className="text-3xl font-extrabold leading-tight sm:text-5xl">{info.title}</h1>

      <details className="mt-3 rounded-2xl border border-glow/30 bg-glow-tint/70 px-4">
        <summary className="flex min-h-11 cursor-pointer items-center font-bold">
          Why this screen exists
        </summary>
        <p className="pb-3 text-ink">{info.why}</p>
      </details>

      <div className="reveal mt-5 space-y-5">{children}</div>

      <div className="mt-8 flex flex-col-reverse gap-3 border-t border-line pt-5 sm:flex-row sm:items-center sm:justify-between">
        <Link href={back} className="btn btn-secondary sm:min-w-32">
          Back
        </Link>
        <div className="flex flex-col-reverse items-stretch gap-3 sm:flex-row sm:items-center">
          {skipLabel && skipHref && (
            <Link href={skipHref} className="btn btn-ghost">
              {skipLabel}
            </Link>
          )}
          {onNext ? (
            <button type="button" className="btn btn-primary" onClick={onNext} disabled={nextDisabled}>
              {forwardLabel}
            </button>
          ) : (
            <Link
              href={forwardHref}
              className={`btn btn-primary ${nextDisabled ? "pointer-events-none opacity-50" : ""}`}
              aria-disabled={nextDisabled || undefined}
            >
              {forwardLabel}
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
