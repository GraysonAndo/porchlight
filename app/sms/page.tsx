"use client";

import { useEffect, useState } from "react";
import { EngineLegend } from "@/components/Agent";
import { ContractorInbox, RecordPanel, SmsPhone, ToolLog } from "@/components/Sms";
import { StepShell } from "@/components/StepShell";
import { PauseIcon, PlayIcon, RestartIcon } from "@/components/icons";
import { Badge, Card } from "@/components/ui";
import { autopilotNext } from "@/lib/agents/autopilot";
import { START_CLOCK, advanceTo, clockText, createWorld, isQuietHours, nextTimerAt, recordAt, send } from "@/lib/agents/engine";
import type { Entry, Ev, Msg, PhotoKind, TimerId, ToolCall, World } from "@/lib/agents/types";
import { usd } from "@/lib/format";
import { PLAN } from "@/lib/plan";

type View = "tenant" | "agent" | "owner" | "vendor";

const TIMER_WORDS: Record<TimerId, string> = {
  quotes_in: "the vendor quotes arrive",
  owner_nudge: "Porchlight follows up with the owner",
  job_done: "the plumber finishes the job",
  notice_delivered: "the notice is delivered",
};

function span(minutes: number): string {
  if (minutes >= 1440) return `${Math.round(minutes / 1440)} days`;
  if (minutes >= 60) return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
  return `${minutes} min`;
}

function delayFor(entry: Entry, fast: boolean): number {
  let ms = 450;
  if (entry.kind === "record") ms = 350;
  if (entry.kind === "msg") {
    if (entry.dir === "in") ms = 250;
    else ms = entry.channel === "call" ? 700 : 850 + Math.min(entry.text.length * 7, 900);
  }
  return fast ? Math.round(ms / 3) : ms;
}

const isMsg = (e: Entry): e is Msg => e.kind === "msg";
const isTool = (e: Entry): e is ToolCall => e.kind === "tool";

const TENANT_SUGGESTIONS = [
  { label: "Water heater leak", text: "water heater is leaking all over the garage" },
  { label: "I smell gas", text: "I smell gas near the water heater" },
  { label: "Clogged toilet", text: "The toilet is clogged" },
];

export default function SmsPage() {
  const [world, setWorld] = useState<World>(createWorld);
  const [revealed, setRevealed] = useState(0);
  const [autoplay, setAutoplay] = useState(false);
  const [fast, setFast] = useState(false);
  const [view, setView] = useState<View>("tenant");

  const timeline = world.timeline;
  const upto = Math.min(revealed, timeline.length);
  const shown = timeline.slice(0, upto);
  const nextEntry = upto < timeline.length ? timeline[upto] : null;
  const nextId = nextEntry ? nextEntry.id : null;
  const delay = nextEntry ? delayFor(nextEntry, fast) : 0;
  const typingParty = nextEntry && isMsg(nextEntry) && nextEntry.dir === "out" ? nextEntry.party : null;
  const idle = upto >= timeline.length;

  // Replay the timeline at a human pace, so it reads like a live conversation.
  useEffect(() => {
    if (nextId === null) return;
    const t = setTimeout(() => setRevealed(upto + 1), delay);
    return () => clearTimeout(t);
  }, [upto, nextId, delay]);

  // The autopilot waits until everything has been shown, then does the next thing a person would do.
  useEffect(() => {
    if (!autoplay || !idle) return;
    const t = setTimeout(
      () => {
        const step = autopilotNext(world);
        if (!step) {
          setAutoplay(false);
        } else if ("jump" in step) {
          setWorld((w) => {
            const at = nextTimerAt(w);
            return at === null ? w : advanceTo(w, at);
          });
        } else {
          setWorld((w) => send(w, step.ev));
        }
      },
      fast ? 450 : 1400,
    );
    return () => clearTimeout(t);
  }, [autoplay, idle, world, fast]);

  const act = (ev: Ev) => setWorld((w) => send(w, ev));
  const skipAhead = () =>
    setWorld((w) => {
      const at = nextTimerAt(w);
      return at === null ? w : advanceTo(w, at);
    });

  function reset() {
    setAutoplay(false);
    setWorld(createWorld());
    setRevealed(0);
  }

  const msgsFor = (party: Msg["party"]) => shown.filter(isMsg).filter((m) => m.party === party);
  const tools = shown.filter(isTool);
  const rec = recordAt(timeline, upto);
  const last = shown[shown.length - 1];
  const clock = clockText(last ? last.at : START_CLOCK);
  const quiet = isQuietHours(last ? last.at : START_CLOCK);

  const counts = { ai: 0, code: 0, action: 0, human: 0 };
  for (const t of tools) counts[t.engine] += 1;
  const taps = tools.filter((t) => t.tool === "approval_gate").length;
  const saved = tools.some((t) => t.tool === "book_vendor") ? PLAN.savedVsHighest : 0;

  const nextTimer = world.pending[0];
  const stage = world.triage.stage;

  const tabs: { id: View; label: string }[] = [
    { id: "tenant", label: "Tenant" },
    { id: "agent", label: "Agent" },
    { id: "owner", label: "Owner" },
    { id: "vendor", label: "Vendor" },
  ];

  return (
    <StepShell stepId="live-sms" nextLabel="Try the full prototype as the owner" nextHref="/owner">
      <Card>
        <div className="flex flex-wrap items-center gap-3">
          {autoplay ? (
            <button type="button" className="btn btn-primary min-w-40" onClick={() => setAutoplay(false)}>
              <PauseIcon size={20} /> Pause
            </button>
          ) : (
            <button type="button" className="btn btn-primary min-w-40" onClick={() => setAutoplay(true)}>
              <PlayIcon size={20} /> {timeline.length === 0 ? "Play the full demo" : "Keep playing"}
            </button>
          )}
          <button
            type="button"
            className="btn btn-secondary"
            onClick={skipAhead}
            disabled={!nextTimer}
            title={nextTimer ? `Jump the clock to when ${TIMER_WORDS[nextTimer.id]}` : "Nothing is scheduled right now"}
          >
            {nextTimer ? `Skip ahead ${span(nextTimer.at - world.clock)}: ${TIMER_WORDS[nextTimer.id]}` : "Nothing scheduled"}
          </button>
          <button type="button" className="btn btn-ghost !px-3" onClick={reset}>
            <RestartIcon size={20} /> Start over
          </button>
          <label className="flex min-h-11 cursor-pointer items-center gap-2 rounded-xl px-2 text-sm font-bold">
            <input type="checkbox" className="h-5 w-5 accent-[#2e7d5b]" checked={fast} onChange={(e) => setFast(e.target.checked)} />
            Faster
          </label>
        </div>

        <div className="mt-4 rounded-2xl bg-cream p-3">
          <p className="text-sm font-extrabold">Make something happen (the audience can try these)</p>
          <div className="mt-2 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap" role="group" aria-label="Things that can happen">
            <button type="button" className="btn btn-secondary !min-h-11 text-sm" disabled={stage !== "asked_photo"} onClick={() => act({ type: "tenant.photo", photo: "blurry" as PhotoKind })} title="Only when Porchlight is waiting for the label photo">
              Tenant sends a blurry photo
            </button>
            <button type="button" className="btn btn-secondary !min-h-11 text-sm" disabled={stage !== "decision_sent"} onClick={() => setWorld((w) => advanceTo(w, w.clock + 45))} title="Only when a decision is waiting on the owner">
              Owner stays asleep (+45 min)
            </button>
            <button type="button" className="btn btn-secondary !min-h-11 text-sm" disabled={world.quote.stage !== "idle"} onClick={() => act({ type: "contractor.quote" })}>
              Contractor emails a quote
            </button>
            <button type="button" className="btn btn-secondary !min-h-11 text-sm" disabled={world.quote.stage !== "sent"} onClick={() => act({ type: "contractor.counter", total: 2650 })} title="Only after the owner sent the counter">
              Contractor counters at $2,650
            </button>
            <button type="button" className="btn btn-secondary !min-h-11 text-sm" disabled={world.quote.stage !== "sent"} onClick={() => act({ type: "contractor.counter", total: 2550 })} title="Only after the owner sent the counter">
              Contractor counters at $2,550
            </button>
            <button type="button" className="btn btn-secondary !min-h-11 text-sm" disabled={world.sentinel.stage !== "idle" && world.sentinel.stage !== "held"} onClick={() => act({ type: "cron.lease" })}>
              Run the Monday lease check
            </button>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl bg-ink p-3 text-cream" aria-label="Scoreboard">
          <span className="rounded-full bg-glow px-3 py-0.5 text-sm font-extrabold text-ink">{clock}</span>
          <span className="text-sm font-bold">{counts.ai} by AI</span>
          <span className="text-sm font-bold">{counts.code} by plain code</span>
          <span className="text-sm font-bold">{counts.action} {counts.action === 1 ? "action" : "actions"}</span>
          <span className="text-sm font-bold">{taps} owner {taps === 1 ? "tap" : "taps"}</span>
          {saved > 0 && <span className="rounded-full bg-good px-3 py-0.5 text-sm font-extrabold text-white">{usd(saved)} saved</span>}
          <span className="ml-auto text-sm text-cream/80">Nothing here is sent. All names, prices, and times are fictional samples.</span>
        </div>
      </Card>

      <div className="flex gap-2 lg:hidden" role="tablist" aria-label="Which screen to show">
        {tabs.map((tab) => (
          <button key={tab.id} type="button" role="tab" aria-selected={view === tab.id} onClick={() => setView(tab.id)} className={`btn flex-1 !px-2 text-sm ${view === tab.id ? "btn-primary" : "btn-secondary"}`}>
            {tab.label}
          </button>
        ))}
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)_minmax(0,1fr)]">
        <div className={view === "tenant" ? "block" : "hidden lg:block"}>
          <h2 className="mb-2 text-center text-lg font-extrabold">Tenant&apos;s texts</h2>
          <SmsPhone
            party="tenant"
            title="Tenant"
            label="Tenant's phone"
            msgs={msgsFor("tenant")}
            typing={typingParty === "tenant"}
            clock={clock}
            placeholder="Text Porchlight"
            onSend={(text) => act({ type: "tenant.text", text })}
            onPhoto={(photo) => act({ type: "tenant.photo", photo })}
            suggestions={timeline.length === 0 ? TENANT_SUGGESTIONS : undefined}
          />
        </div>

        <div className={view === "agent" ? "block" : "hidden lg:block"}>
          <h2 className="mb-2 text-center text-lg font-extrabold">What Porchlight is doing</h2>
          <Card>
            {tools.length === 0 ? <p className="py-24 text-center text-ink-soft">Waiting for something to happen...</p> : <ToolLog entries={shown} />}
            <div className="mt-3 border-t border-line pt-3">
              <EngineLegend className="!grid-cols-1" />
            </div>
          </Card>
        </div>

        <div className={view === "owner" ? "block" : "hidden lg:block"}>
          <h2 className="mb-2 text-center text-lg font-extrabold">Owner&apos;s texts</h2>
          <SmsPhone
            party="owner"
            title="Owner"
            label="Owner's phone"
            msgs={msgsFor("owner")}
            typing={typingParty === "owner"}
            clock={clock}
            quiet={quiet}
            placeholder="Reply to Porchlight"
            onSend={(text) => act({ type: "owner.text", text })}
            onTap={(msgId, action) => act({ type: "owner.tap", msgId, action })}
          />
          <p className="mt-2 text-center text-sm text-ink-soft">Tap a button, or type 1, 2, or 3.</p>
        </div>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-2">
        <div className={view === "agent" ? "block" : "hidden lg:block"}>
          <Card title="House record">
            <p className="mb-3 text-sm text-ink-soft">What Porchlight knows. It writes here by itself, and the changed field flashes.</p>
            <RecordPanel view={rec} />
          </Card>
        </div>
        <div className={view === "vendor" ? "block" : "hidden lg:block"}>
          <Card
            title={
              <span className="flex flex-wrap items-center gap-2">
                Contractor&apos;s inbox <Badge tone="neutral" icon={false}>Harbor View Plumbing</Badge>
              </span>
            }
          >
            <ContractorInbox msgs={msgsFor("contractor")} />
          </Card>
        </div>
      </div>
    </StepShell>
  );
}
