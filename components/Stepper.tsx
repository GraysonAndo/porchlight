import { STEPS } from "@/lib/steps";

/** Progress through the 9 screens. Text first, bars second. */
export function Stepper({ current }: { current: number }) {
  const step = STEPS[current - 1];
  return (
    <nav aria-label="Progress" className="mb-4">
      <p className="mb-2 text-sm font-bold text-ink-soft">
        Step {current} of {STEPS.length}
        {step && <span className="text-ink">: {step.short}</span>}
      </p>
      <ol className="flex gap-1.5">
        {STEPS.map((s) => (
          <li
            key={s.n}
            aria-current={s.n === current ? "step" : undefined}
            className={`h-2.5 flex-1 rounded-full ${
              s.n < current ? "bg-good" : s.n === current ? "bg-glow ring-2 ring-ink" : "bg-line"
            }`}
          >
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
