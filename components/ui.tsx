"use client";

// Small shared building blocks: Badge, Card, Callout, PlaceholderNote, Thinking, NumberField.

import { useState, type ReactNode } from "react";
import { PLACEHOLDER_LABEL } from "@/lib/seed";

export type Tone = "good" | "caution" | "urgent" | "info" | "neutral";

const BADGE_STYLES: Record<Tone, string> = {
  good: "bg-good-tint text-good-ink border-good",
  caution: "bg-caution-tint text-caution-ink border-glow-deep",
  urgent: "bg-urgent-tint text-urgent border-urgent",
  info: "bg-glow-tint text-ink border-glow-deep",
  neutral: "bg-cream-deep text-ink border-line",
};

const BADGE_ICONS: Record<Tone, string> = {
  good: "✓",
  caution: "!",
  urgent: "▲",
  info: "i",
  neutral: "•",
};

/** Always carries text (and an icon), so color is never the only signal. */
export function Badge({
  tone,
  children,
  icon = true,
  size = "sm",
}: {
  tone: Tone;
  children: ReactNode;
  icon?: boolean;
  size?: "sm" | "lg";
}) {
  return (
    <span
      className={`inline-flex max-w-full items-center gap-1.5 rounded-full border font-extrabold ${
        size === "lg" ? "px-4 py-1 text-lg" : "px-3 py-0.5 text-sm"
      } ${BADGE_STYLES[tone]}`}
    >
      {icon && (
        <span aria-hidden="true" className="text-xs">
          {BADGE_ICONS[tone]}
        </span>
      )}
      {children}
    </span>
  );
}

export function Card({
  title,
  children,
  className = "",
  as: Tag = "section",
}: {
  title?: ReactNode;
  children: ReactNode;
  className?: string;
  as?: "section" | "div" | "article";
}) {
  return (
    <Tag className={`card ${className}`}>
      {title && <h2 className="mb-3 text-xl font-extrabold">{title}</h2>}
      {children}
    </Tag>
  );
}

const CALLOUT_STYLES: Record<Tone, string> = {
  good: "border-good bg-good-tint text-good-ink",
  caution: "border-glow-deep bg-caution-tint text-caution-ink",
  urgent: "border-urgent bg-urgent-tint text-urgent",
  info: "border-glow-deep bg-glow-tint text-ink",
  neutral: "border-line bg-cream-deep text-ink",
};

export function Callout({
  tone,
  title,
  children,
  role,
}: {
  tone: Tone;
  title?: ReactNode;
  children?: ReactNode;
  role?: "alert" | "status";
}) {
  return (
    <div role={role} className={`rounded-xl border-l-8 p-4 ${CALLOUT_STYLES[tone]}`}>
      {title && <p className="font-extrabold">{title}</p>}
      {children && <div className={title ? "mt-1" : ""}>{children}</div>}
    </div>
  );
}

/** The required label for any number that is not from a real source. */
export function PlaceholderNote({ className = "" }: { className?: string }) {
  return <span className={`text-sm italic text-ink-soft ${className}`}>{PLACEHOLDER_LABEL}</span>;
}

/** "Thinking" state for the mock AI. */
export function Thinking({ message }: { message: string }) {
  return (
    <div role="status" aria-live="polite" className="card flex items-center gap-4">
      <span className="flex items-center gap-1.5" aria-hidden="true">
        <span className="think-dot" />
        <span className="think-dot" />
        <span className="think-dot" />
      </span>
      <p className="font-bold">{message}</p>
    </div>
  );
}

/**
 * Number input that lets you type freely (like "3." on the way to "3.5").
 * Calls onChange only with valid numbers, and snaps back to the real value on blur.
 */
export function NumberField({
  id,
  label,
  value,
  onChange,
  step = 1,
  min,
  prefix,
  suffix,
  hint,
  invalid,
  onEmptyChange,
}: {
  id: string;
  label: ReactNode;
  value: number;
  onChange: (value: number) => void;
  step?: number | "any";
  min?: number;
  prefix?: string;
  suffix?: string;
  hint?: ReactNode;
  invalid?: boolean;
  /** Called with true when the box is cleared, and false when it has a number again or loses focus */
  onEmptyChange?: (empty: boolean) => void;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const shown = draft ?? String(value);

  return (
    <div>
      <label htmlFor={id} className="label">
        {label}
      </label>
      <div className="flex items-center gap-2">
        {prefix && <span className="text-lg font-bold">{prefix}</span>}
        <input
          id={id}
          type="number"
          inputMode="decimal"
          className="field"
          step={step}
          min={min}
          value={shown}
          aria-describedby={hint ? `${id}-hint` : undefined}
          aria-invalid={invalid ? true : undefined}
          onChange={(e) => {
            setDraft(e.target.value);
            const parsed = Number(e.target.value);
            const empty = e.target.value.trim() === "" || !Number.isFinite(parsed);
            onEmptyChange?.(empty);
            if (!empty) onChange(parsed);
          }}
          onBlur={() => {
            setDraft(null);
            onEmptyChange?.(false);
          }}
        />
        {suffix && <span className="text-lg font-bold">{suffix}</span>}
      </div>
      {hint && (
        <div id={`${id}-hint`} className="hint">
          {hint}
        </div>
      )}
    </div>
  );
}
