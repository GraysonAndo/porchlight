import { STEPS } from "@/lib/steps";

/** Progress through the 9 screens. Text first, bars second, names on wider screens. */
export function Stepper({ current }: { current: number }) {
  const step = STEPS[current - 1];
  return (
    <nav aria-label="Progress" className="mb-5">
      <p className="eyebrow mb-2">
        Step {current} of {STEPS.length}
        {step && <span className="text-ink">: {step.short}</span>}
      </p>
      <ol className="flex gap-1.5 sm:gap-2">
        {STEPS.map((s) => (
          <li
            key={s.n}
            aria-current={s.n === current ? "step" : undefined}
            className="min-w-0 flex-1"
          >
            <span
              className={`block h-2.5 rounded-full transition-colors ${
                s.n < current ? "bg-good" : s.n === current ? "bg-glow ring-2 ring-ink" : "bg-line"
              }`}
            />
            <span
              aria-hidden="true"
              className={`mt-1 hidden truncate text-xs font-bold lg:block ${
                s.n === current ? "text-ink" : "text-ink-soft"
              }`}
            >
              {s.short}
            </span>
            <span className="sr-only">
              {s.title}
              {s.n < current ? ", done" : s.n === current ? ", current step" : ""}
            </span>
          </li>
        ))}
      </ol>
    </nav>
  );
}
