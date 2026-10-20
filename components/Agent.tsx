"use client";

// The agent log: what GoHome did, in order, and WHO did each piece of work.
// This is the core of the pitch. The AI only reads photos and writes text. Plain
// code decides prices, rules, and the legal cap. A person approves every dollar.

import type { ComponentType } from "react";
import { BoltIcon, CalculatorIcon, RobotIcon, TapIcon } from "./icons";
import type { AgentEvent, Engine } from "@/lib/scenario";

export const ENGINE_META: Record<
  Engine,
  { label: string; hint: string; chip: string; dot: string; Icon: ComponentType<{ size?: number }> }
> = {
  ai: {
    label: "AI",
    hint: "Reads photos and writes text",
    chip: "bg-glow-tint text-ink border-glow-deep",
    dot: "bg-glow text-ink",
    Icon: RobotIcon,
  },
  code: {
    label: "Plain code",
    hint: "Decides prices, rules, and the legal cap",
    chip: "bg-ink text-cream border-ink",
    dot: "bg-ink text-cream",
    Icon: CalculatorIcon,
  },
  action: {
    label: "GoHome acts",
    hint: "Inside limits the owner set",
    chip: "bg-white text-ink border-ink",
    dot: "bg-white text-ink ring-2 ring-ink",
    Icon: BoltIcon,
  },
  human: {
    label: "A person taps",
    hint: "Nothing is spent without this",
    chip: "bg-good-tint text-good-ink border-good",
    dot: "bg-good text-white",
    Icon: TapIcon,
  },
};

export function EngineChip({ engine }: { engine: Engine }) {
  const meta = ENGINE_META[engine];
  return (
    <span
      className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-extrabold ${meta.chip}`}
    >
      <meta.Icon size={14} />
      {meta.label}
    </span>
  );
}

/** A key for the four kinds of work. */
export function EngineLegend({ className = "" }: { className?: string }) {
  return (
    <ul className={`grid gap-2 sm:grid-cols-2 ${className}`}>
      {(Object.keys(ENGINE_META) as Engine[]).map((engine) => (
        <li key={engine} className="flex items-center gap-2 text-sm">
          <EngineChip engine={engine} />
          <span className="text-ink-soft">{ENGINE_META[engine].hint}</span>
        </li>
      ))}
    </ul>
  );
}

interface AgentFeedProps {
  events: AgentEvent[];
  /** Show a pulsing "live" dot, for the Watch it work screen */
  live?: boolean;
  className?: string;
}

export function AgentFeed({ events, live = false, className = "" }: AgentFeedProps) {
  if (events.length === 0) {
    return <p className={`text-ink-soft ${className}`}>Waiting for something to happen...</p>;
  }
  return (
    <ol className={className} aria-live={live ? "polite" : undefined} aria-label="GoHome agent log">
      {events.map((event, i) => {
        const meta = ENGINE_META[event.engine];
        const last = i === events.length - 1;
        return (
          <li key={event.id} className="reveal relative flex gap-3 pb-4 last:pb-0">
            {!last && <span aria-hidden="true" className="absolute left-[15px] top-8 h-full w-0.5 bg-line" />}
            <span
              aria-hidden="true"
              className={`z-10 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${meta.dot}`}
            >
              <meta.Icon size={18} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <EngineChip engine={event.engine} />
                <span className="ml-auto text-xs font-bold text-ink-soft">{event.clock}</span>
              </div>
              <p className="mt-1 font-extrabold leading-snug">{event.title}</p>
              <p className="text-sm text-ink-soft">{event.detail}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

/** The trust label that sits next to every number the AI does not set. */
export function PlainCodeNote({ children }: { children?: React.ReactNode }) {
  return (
    <p className="flex items-start gap-2 rounded-xl bg-ink px-3 py-2 text-sm text-cream">
      <CalculatorIcon size={18} />
      <span>
        <strong>Plain code, not AI.</strong>{" "}
        {children ?? "This was calculated from a hand-checked table. The AI reads photos and writes text. It never sets a price, a rule, or the legal cap."}
      </span>
    </p>
  );
}

/** The agent log, folded away by default. Used on screens where it is not the main thing. */
export function AgentLogDetails({
  events,
  summary = "See what GoHome did",
  open = false,
}: {
  events: AgentEvent[];
  summary?: string;
  open?: boolean;
}) {
  if (events.length === 0) return null;
  return (
    <details open={open} className="rounded-2xl border border-line bg-white px-4">
      <summary className="flex min-h-11 cursor-pointer items-center gap-2 font-bold">
        <RobotIcon size={20} /> {summary}
        <span className="ml-1 text-sm font-normal text-ink-soft">{" "}({events.length} steps)</span>
      </summary>
      <div className="pb-4 pt-1">
        <AgentFeed events={events} />
        <div className="mt-3 border-t border-line pt-3">
          <EngineLegend />
        </div>
      </div>
    </details>
  );
}
