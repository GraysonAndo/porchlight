import { CheckIcon } from "./icons";
import { JOB_STATUSES, statusIndex, type JobStatus } from "@/lib/jobStatus";

/** new, quoted, approved, booked, done. It is only drawn. It moves by itself. */
export function JobStatusTracker({ status }: { status: JobStatus }) {
  const current = statusIndex(status);
  return (
    <ol aria-label="Job status" className="flex gap-1">
      {JOB_STATUSES.map((s, i) => {
        const done = i < current || status === "done";
        const here = i === current && status !== "done";
        return (
          <li key={s.id} aria-current={here ? "step" : undefined} className="min-w-0 flex-1 text-center">
            <span
              aria-hidden="true"
              className={`mx-auto flex h-8 w-8 items-center justify-center rounded-full text-sm font-extrabold ${
                done ? "bg-good text-white" : here ? "bg-glow text-ink ring-4 ring-glow/30" : "bg-line text-ink-soft"
              }`}
            >
              {done ? <CheckIcon size={16} /> : i + 1}
            </span>
            <span className={`mt-1 block truncate text-xs font-bold sm:text-sm ${here ? "text-ink" : "text-ink-soft"}`}>{s.label}</span>
            <span className="sr-only">{done ? ", done" : here ? ", current" : ", not yet"}</span>
          </li>
        );
      })}
    </ol>
  );
}
