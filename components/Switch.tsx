"use client";

/** A labelled on and off switch. The label is read by screen readers, the description is shown under it. */
export function SwitchRow({
  title,
  description,
  on,
  onChange,
  disabled = false,
  icon,
}: {
  title: string;
  description: string;
  on: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 py-3">
      {icon && <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-tint text-brand">{icon}</span>}
      <p className="min-w-0 flex-1 text-sm">
        <strong className="text-base">{title}</strong>
        <span className="block text-ink-soft">{description}</span>
      </p>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label={title}
        disabled={disabled}
        onClick={() => onChange(!on)}
        className={`relative inline-flex h-11 w-16 shrink-0 items-center rounded-full border-2 transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${on ? "border-good bg-good" : "border-line bg-cream-deep"}`}
      >
        <span className={`inline-block h-8 w-8 rounded-full bg-white shadow transition-transform ${on ? "translate-x-7" : "translate-x-1"}`} />
      </button>
    </div>
  );
}
