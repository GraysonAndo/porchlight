// Small original diagrams. Each one has a text caption, so the picture is never the only way to get the point.

function ValvePicture({ open }: { open: boolean }) {
  return (
    <svg viewBox="0 0 160 80" width="160" height="80" aria-hidden="true" focusable="false" className="shrink-0">
      {/* Pipe */}
      <rect x="4" y="32" width="152" height="16" rx="3" fill="#C5CCD8" stroke="#6B7587" strokeWidth="2" />
      {/* Valve body */}
      <rect x="62" y="26" width="36" height="28" rx="6" fill="#1d3a8a" stroke="#0F2552" strokeWidth="2" />
      <circle cx="80" cy="40" r="5" fill="#F97316" stroke="#0F2552" strokeWidth="2" />
      {open ? (
        // Handle lines up with the pipe
        <rect x="80" y="36" width="64" height="8" rx="4" fill="#F97316" stroke="#0F2552" strokeWidth="2" />
      ) : (
        // Handle sits across the pipe
        <rect x="76" y="2" width="8" height="38" rx="4" fill="#F97316" stroke="#0F2552" strokeWidth="2" />
      )}
    </svg>
  );
}

/** Quarter-turn valve: handle along the pipe is open, across the pipe is closed. */
export function ValveDiagram() {
  return (
    <figure className="rounded-2xl bg-cream p-3">
      <div className="flex flex-wrap items-end justify-around gap-4">
        <div className="text-center">
          <ValvePicture open />
          <p className="mt-1 text-sm font-extrabold text-good-ink">OPEN</p>
          <p className="text-sm">Handle lines up with the pipe</p>
        </div>
        <div className="text-center">
          <ValvePicture open={false} />
          <p className="mt-1 text-sm font-extrabold text-urgent">CLOSED</p>
          <p className="text-sm">Handle sits across the pipe</p>
        </div>
      </div>
      <figcaption className="mt-2 text-center text-sm text-ink-soft">
        On a lever valve, a quarter turn changes between open and closed. A round wheel closes by turning clockwise
        (to the right).
      </figcaption>
    </figure>
  );
}
