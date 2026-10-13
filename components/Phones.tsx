"use client";

// The two phones in "Watch it work". The tenant's phone is a chat with Porchlight.
// The owner's phone is a lock screen with alerts and one decision card.
// They show different things on purpose: the tenant never sees prices or decisions.

import { useEffect, useRef, type ReactNode } from "react";
import { Badge } from "./ui";
import { LogoMark } from "./Logo";
import { BellIcon, CalendarIcon, CheckIcon, MoonIcon, PhoneCallIcon, TapIcon } from "./icons";
import { usd } from "@/lib/format";
import type { OwnerItem, TenantItem } from "@/lib/scenario";

export function PhoneFrame({
  title,
  clock,
  statusNote,
  children,
  scrollKey,
  label,
  stickToBottom = true,
  footer,
}: {
  title: string;
  clock: string;
  statusNote?: string;
  children: ReactNode;
  /** Changes whenever new content arrives, so the screen scrolls to it */
  scrollKey: number;
  label: string;
  stickToBottom?: boolean;
  /** Pinned under the scrolling screen, for example a message box */
  footer?: ReactNode;
}) {
  const screen = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = screen.current;
    if (!el) return;
    el.scrollTo({ top: stickToBottom ? el.scrollHeight : 0, behavior: "smooth" });
  }, [scrollKey, stickToBottom]);

  return (
    <section
      aria-label={label}
      className="mx-auto w-full max-w-[340px] overflow-hidden rounded-[2.4rem] border-[10px] border-ink bg-ink shadow-2xl"
    >
      <div className="flex items-center justify-between px-5 pb-1 pt-2 text-xs font-bold text-cream">
        <span>{clock}</span>
        <span className="rounded-full bg-cream/15 px-2 py-0.5">{title}</span>
        <span>{statusNote ?? "5G"}</span>
      </div>
      <div className="flex h-[540px] flex-col overflow-hidden rounded-[1.6rem] bg-cream">
        <div ref={screen} className="min-h-0 flex-1 overflow-y-auto p-3">
          {children}
        </div>
        {footer}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Tenant
// ---------------------------------------------------------------------------

function Bubble({ from, children, time }: { from: "tenant" | "agent"; children: ReactNode; time: string }) {
  const tenant = from === "tenant";
  return (
    <div className={`reveal flex ${tenant ? "justify-end" : "justify-start gap-2"}`}>
      {!tenant && (
        <span className="mt-1 shrink-0">
          <LogoMark size={26} />
        </span>
      )}
      <div
        className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm shadow-sm ${
          tenant ? "rounded-br-sm bg-glow text-ink" : "rounded-bl-sm border border-line bg-white"
        }`}
      >
        {children}
        <p className="mt-1 text-right text-[11px] font-bold opacity-60">{time}</p>
      </div>
    </div>
  );
}

const PHOTO_SRC = { leak: "/sample/leaking-heater.svg", label: "/sample/equipment-label.svg" } as const;
const PHOTO_ALT = {
  leak: "Photo sent by the tenant: a water heater leaking at the base, with a puddle on the garage floor",
  label: "Photo sent by the tenant: the label on the water heater",
} as const;

export function TenantThread({ items }: { items: TenantItem[] }) {
  if (items.length === 0) {
    return <p className="mt-24 text-center text-sm font-bold text-ink-soft">No messages yet.</p>;
  }
  return (
    <div className="space-y-3">
      {items.map((item) => {
        if (item.kind === "photo" && item.photo) {
          return (
            <Bubble key={item.id} from="tenant" time={item.clock}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={PHOTO_SRC[item.photo]} alt={PHOTO_ALT[item.photo]} className="w-48 rounded-lg border border-ink/20" />
            </Bubble>
          );
        }
        if (item.kind === "tap") {
          return (
            <Bubble key={item.id} from="tenant" time={item.clock}>
              <span className="flex items-center gap-1 font-bold">
                <CheckIcon size={16} /> {item.text}
              </span>
            </Bubble>
          );
        }
        if (item.kind === "steps") {
          return (
            <Bubble key={item.id} from="agent" time={item.clock}>
              {item.urgency && (
                <p className="mb-1">
                  <Badge tone={item.urgency === "routine" ? "good" : "urgent"}>{item.urgency.toUpperCase()}</Badge>
                </p>
              )}
              <p>{item.text}</p>
              {item.steps && item.steps.length > 0 && (
                <ol className="mt-2 space-y-1.5">
                  {item.steps.map((step, i) => (
                    <li key={step} className="flex gap-2">
                      <span
                        aria-hidden="true"
                        className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-ink text-[11px] font-extrabold text-cream"
                      >
                        {i + 1}
                      </span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ol>
              )}
            </Bubble>
          );
        }
        if (item.kind === "photo-request") {
          return (
            <Bubble key={item.id} from="agent" time={item.clock}>
              <p>{item.text}</p>
              <p className="mt-2 inline-flex items-center rounded-lg bg-ink px-3 py-1.5 text-xs font-extrabold text-cream">
                Take a photo
              </p>
            </Bubble>
          );
        }
        if (item.kind === "booking") {
          return (
            <Bubble key={item.id} from="agent" time={item.clock}>
              <p className="flex items-start gap-1.5">
                <CalendarIcon size={18} />
                <span>{item.text}</span>
              </p>
            </Bubble>
          );
        }
        return (
          <Bubble key={item.id} from={item.from} time={item.clock}>
            {item.text}
          </Bubble>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Owner
// ---------------------------------------------------------------------------

function OwnerCard({ item, tapped, canApprove, onApprove }: { item: OwnerItem; tapped: boolean; canApprove: boolean; onApprove?: () => void }) {
  if (item.kind === "call") {
    return (
      <div className="reveal rounded-2xl border-2 border-urgent bg-urgent-tint p-3 text-sm">
        <p className="flex items-center gap-2 font-extrabold text-urgent">
          <PhoneCallIcon size={20} /> Incoming call from Porchlight
        </p>
        <p className="mt-1 font-bold">{item.title}</p>
        <p>{item.text}</p>
        <p className="mt-1 text-right text-[11px] font-bold opacity-60">{item.clock}</p>
      </div>
    );
  }
  if (item.kind === "push") {
    return (
      <div className="reveal rounded-2xl border border-line bg-white p-3 text-sm shadow-sm">
        <p className="flex items-center gap-2 font-extrabold">
          <BellIcon size={18} /> {item.title}
          <span className="ml-auto rounded-full bg-cream-deep px-2 py-0.5 text-[11px] font-bold">Silent</span>
        </p>
        <p className="mt-1">{item.text}</p>
        <p className="mt-1 text-right text-[11px] font-bold opacity-60">{item.clock}</p>
      </div>
    );
  }
  if (item.kind === "decision" && item.decision) {
    const d = item.decision;
    return (
      <div className="reveal rounded-2xl border-2 border-ink bg-white p-3 text-sm shadow-md">
        <p className="font-extrabold">{item.title}</p>
        <p className="mt-1 text-ink-soft">{item.text}</p>

        <div className="mt-3 rounded-xl bg-cream p-3">
          <p className="eyebrow">Porchlight&apos;s plan</p>
          <p className="font-extrabold">{d.vendorName}</p>
          <p className="text-2xl font-extrabold">{usd(d.total)}</p>
          <p className="text-xs font-bold text-ink-soft">
            Spending limit {usd(d.limit)}. {d.window}.
          </p>
          <p className="mt-1">
            <Badge tone="good">Saves {usd(d.saved)} vs the highest quote</Badge>
          </p>
        </div>

        <ul className="mt-2 list-disc space-y-0.5 pl-5 text-xs">
          {d.reasons.slice(0, 2).map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
        {d.skipped.length > 0 && (
          <p className="mt-2 text-xs text-ink-soft">
            <strong className="text-ink">Skipped:</strong> {d.skipped.join(" ")}
          </p>
        )}

        {tapped ? (
          <p className="mt-3 flex items-center gap-1 rounded-xl bg-good-tint px-3 py-2 font-extrabold text-good-ink">
            <CheckIcon size={18} /> Approved
          </p>
        ) : (
          <div className="mt-3 grid grid-cols-[1fr_auto] gap-2">
            <button
              type="button"
              className="btn btn-primary !min-h-12"
              onClick={onApprove}
              disabled={!canApprove}
            >
              <TapIcon size={20} /> Approve
            </button>
            <span className="btn btn-secondary !min-h-12 !px-3 text-sm" aria-hidden="true">
              Change
            </span>
          </div>
        )}
        <p className="mt-1 text-right text-[11px] font-bold opacity-60">{item.clock}</p>
      </div>
    );
  }
  if (item.kind === "tap") {
    return (
      <div className="reveal rounded-2xl bg-good-tint p-3 text-sm text-good-ink">
        <p className="flex items-center gap-1 font-extrabold">
          <CheckIcon size={18} /> {item.title}
        </p>
        <p>{item.text}</p>
      </div>
    );
  }
  if (item.kind === "done") {
    return (
      <div className="reveal rounded-2xl border-2 border-good bg-good-tint p-3 text-sm text-good-ink">
        <p className="flex items-center gap-1 font-extrabold">
          <CheckIcon size={18} /> {item.title}
        </p>
        <p className="mt-1">{item.text}</p>
        <p className="mt-1 text-right text-[11px] font-bold opacity-60">{item.clock}</p>
      </div>
    );
  }
  return (
    <div className="reveal rounded-2xl border border-line bg-white p-3 text-sm shadow-sm">
      <p className="font-extrabold">{item.title}</p>
      <p className="mt-1">{item.text}</p>
      <p className="mt-1 text-right text-[11px] font-bold opacity-60">{item.clock}</p>
    </div>
  );
}

export function OwnerFeed({
  items,
  asleep,
  clock,
  onApprove,
}: {
  items: OwnerItem[];
  asleep: boolean;
  clock: string;
  onApprove?: () => void;
}) {
  const tapped = items.some((i) => i.kind === "tap");
  const decisionShowing = items.some((i) => i.kind === "decision") && !tapped;
  // Newest first, like a lock screen.
  const ordered = [...items].reverse();

  return (
    <div className="space-y-3">
      {asleep && (
        <div className="rounded-2xl bg-ink p-3 text-center text-cream">
          <p className="flex items-center justify-center gap-2 text-sm font-extrabold">
            <MoonIcon size={20} /> Do Not Disturb
          </p>
          <p className="text-3xl font-extrabold">{clock.replace(/^Next day, /, "")}</p>
          <p className="text-xs opacity-80">Only emergencies ring through.</p>
        </div>
      )}
      {ordered.length === 0 && !asleep && <p className="mt-24 text-center text-sm font-bold text-ink-soft">Nothing yet.</p>}
      {ordered.length === 0 && asleep && (
        <p className="pt-2 text-center text-sm font-bold text-ink-soft">Nothing needs you. Porchlight is working.</p>
      )}
      {ordered.map((item) => (
        <OwnerCard key={item.id} item={item} tapped={tapped} canApprove={decisionShowing} onApprove={onApprove} />
      ))}
    </div>
  );
}
