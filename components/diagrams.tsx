// Small original diagrams. Each one has a text caption, so the picture is never the only way to get the point.

function ValvePicture({ open }: { open: boolean }) {
  return (
    <svg viewBox="0 0 160 80" width="160" height="80" aria-hidden="true" focusable="false" className="shrink-0">
      {/* Pipe */}
      <rect x="4" y="32" width="152" height="16" rx="3" fill="#C5CCD8" stroke="#6B7587" strokeWidth="2" />
      {/* Valve body */}
      <rect x="62" y="26" width="36" height="28" rx="6" fill="#3A4560" stroke="#1F2A44" strokeWidth="2" />
      <circle cx="80" cy="40" r="5" fill="#F5A524" stroke="#1F2A44" strokeWidth="2" />
      {open ? (
        // Handle lines up with the pipe
        <rect x="80" y="36" width="64" height="8" rx="4" fill="#F5A524" stroke="#1F2A44" strokeWidth="2" />
      ) : (
        // Handle sits across the pipe
        <rect x="76" y="2" width="8" height="38" rx="4" fill="#F5A524" stroke="#1F2A44" strokeWidth="2" />
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

/** Where the rating label usually is on a water heater. */
export function LabelLocationDiagram() {
  return (
    <figure className="rounded-2xl bg-cream p-3">
      <svg viewBox="0 0 220 200" width="100%" height="190" aria-hidden="true" focusable="false">
        {/* Pipes */}
        <rect x="78" y="6" width="14" height="30" fill="#3B7DB8" stroke="#24557F" strokeWidth="2" />
        <rect x="108" y="6" width="14" height="30" fill="#C4563A" stroke="#8C3722" strokeWidth="2" />
        {/* Tank */}
        <path
          d="M52 48 Q52 34 78 34 L122 34 Q148 34 148 48 L148 168 Q148 182 122 182 L78 182 Q52 182 52 168 Z"
          fill="#E4E8EF"
          stroke="#6B7587"
          strokeWidth="3"
        />
        {/* The label, highlighted */}
        <rect x="68" y="78" width="64" height="48" rx="3" fill="#FFFFFF" stroke="#F5A524" strokeWidth="4" />
        <g fill="#B5BCC8">
          <rect x="75" y="87" width="50" height="4" />
          <rect x="75" y="97" width="38" height="4" />
          <rect x="75" y="107" width="44" height="4" />
          <rect x="75" y="117" width="30" height="4" />
        </g>
        {/* Arrow */}
        <path d="M200 102 L140 102" stroke="#1F2A44" strokeWidth="3" fill="none" />
        <path d="M148 94 L136 102 L148 110" stroke="#1F2A44" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <text x="164" y="92" fontSize="14" fontWeight="800" fill="#1F2A44" fontFamily="Arial, sans-serif">
          Label
        </text>
        {/* Gas control */}
        <rect x="70" y="146" width="26" height="22" rx="4" fill="#3A4560" stroke="#1F2A44" strokeWidth="2" />
        <circle cx="83" cy="157" r="5" fill="#F5A524" stroke="#1F2A44" strokeWidth="2" />
      </svg>
      <figcaption className="text-center text-sm text-ink-soft">
        On a water heater the label is a sticker or metal plate, usually on the side of the tank. Furnaces have it
        inside the door panel or on the side. Air conditioners have it on the side of the outdoor unit.
      </figcaption>
    </figure>
  );
}
