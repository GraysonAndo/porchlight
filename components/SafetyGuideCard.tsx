import { AlertIcon } from "./icons";
import { ValveDiagram } from "./diagrams";
import type { SafetyGuide } from "@/lib/safetyGuides";

/** The expanded "How to do this" content for one safety step. */
export function SafetyGuideCard({ guide }: { guide: SafetyGuide }) {
  return (
    <div className="mt-2 space-y-4 rounded-2xl border border-line bg-cream p-4">
      <div>
        <p className="font-extrabold">{guide.title}</p>
        <p className="text-sm text-ink-soft">
          <strong className="text-ink">Time:</strong> {guide.time}. <strong className="text-ink">You need:</strong>{" "}
          {guide.youNeed}
        </p>
      </div>

      {guide.recordNote && (
        <p className="rounded-xl bg-glow-tint px-3 py-2 text-sm font-bold">From your house record: {guide.recordNote}</p>
      )}

      <p>
        <strong>Why:</strong> {guide.why}
      </p>

      {guide.diagram === "valve" && <ValveDiagram />}

      <ol className="space-y-2">
        {guide.steps.map((step, i) => (
          <li key={step} className="flex gap-3">
            <span
              aria-hidden="true"
              className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-ink text-sm font-extrabold text-cream"
            >
              {i + 1}
            </span>{" "}
            <span>{step}</span>
          </li>
        ))}
      </ol>

      {guide.stopIf.length > 0 && (
        <div className="rounded-xl border-l-8 border-urgent bg-urgent-tint p-3 text-urgent">
          <p className="flex items-center gap-2 font-extrabold">
            <AlertIcon size={20} /> Stop and get help if:
          </p>
          <ul className="mt-1 list-disc space-y-1 pl-6 text-ink">
            {guide.stopIf.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
