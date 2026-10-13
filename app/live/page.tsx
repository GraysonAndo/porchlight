"use client";

import { useEffect, useRef, useState } from "react";
import { AgentFeed, EngineLegend } from "@/components/Agent";
import { OwnerFeed, PhoneFrame, TenantThread } from "@/components/Phones";
import { StepShell } from "@/components/StepShell";
import { BackIcon, ForwardIcon, MoonIcon, PauseIcon, PlayIcon, RestartIcon, RobotIcon, ShieldIcon, PeopleIcon } from "@/components/icons";
import { Badge, Card } from "@/components/ui";
import { usd } from "@/lib/format";
import { SCENARIOS, sceneAt, scenarioById, statsFor } from "@/lib/scenario";

type View = "tenant" | "agent" | "owner";

const STEP_MS = 3400;

function minutesText(n: number): string {
  if (n <= 0) return "under a minute";
  return n === 1 ? "1 minute" : `${n} minutes`;
}

export default function LivePage() {
  const [scenarioId, setScenarioId] = useState<"leak" | "gas">("leak");
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [fast, setFast] = useState(false);
  const [view, setView] = useState<View>("tenant");

  const scenario = scenarioById(scenarioId);
  const scene = sceneAt(scenario, index);
  const total = scenario.steps.length;
  const running = playing && !scene.done;
  const stats = statsFor(scenario);

  // Advance the story on a timer while playing.
  useEffect(() => {
    if (!running) return;
    const timer = setTimeout(() => setIndex((i) => i + 1), fast ? STEP_MS / 2 : STEP_MS);
    return () => clearTimeout(timer);
  }, [running, index, fast]);

  // Keep the newest agent event in view.
  const agentScroll = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = agentScroll.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [scene.agent.length]);

  function chooseScenario(id: "leak" | "gas") {
    setScenarioId(id);
    setIndex(0);
    setPlaying(false);
  }

  function approve() {
    const target = scenario.steps.findIndex((s) => s.id === "approve");
    if (target >= 0) setIndex(target);
  }

  const tabs: { id: View; label: string }[] = [
    { id: "tenant", label: "Tenant phone" },
    { id: "agent", label: "Agent log" },
    { id: "owner", label: "Owner phone" },
  ];

  return (
    <StepShell stepId="live-watch" nextLabel="Try it yourself as the owner" nextHref="/owner">
      <Card>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div role="radiogroup" aria-label="Choose a story" className="flex flex-wrap gap-2">
            {SCENARIOS.map((s) => (
              <button
                key={s.id}
                type="button"
                role="radio"
                aria-checked={s.id === scenarioId}
                onClick={() => chooseScenario(s.id)}
                className={`btn text-sm ${s.id === scenarioId ? "btn-primary" : "btn-secondary"}`}
              >
                {s.title}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Playback controls">
            <button type="button" className="btn btn-secondary !px-3" onClick={() => setIndex((i) => Math.max(0, i - 1))} disabled={index === 0} aria-label="Back one step">
              <BackIcon size={20} />
            </button>
            {running ? (
              <button type="button" className="btn btn-primary min-w-28" onClick={() => setPlaying(false)} aria-label="Pause">
                <PauseIcon size={20} /> Pause
              </button>
            ) : (
              <button
                type="button"
                className="btn btn-primary min-w-28"
                onClick={() => {
                  if (scene.done) setIndex(0);
                  setPlaying(true);
                }}
                aria-label={scene.done ? "Play again" : "Play"}
              >
                <PlayIcon size={20} /> {scene.done ? "Play again" : index === 0 ? "Play" : "Resume"}
              </button>
            )}
            <button type="button" className="btn btn-secondary !px-3" onClick={() => setIndex((i) => Math.min(total - 1, i + 1))} disabled={scene.done} aria-label="Next step">
              <ForwardIcon size={20} />
            </button>
            <button
              type="button"
              className="btn btn-ghost !px-3"
              onClick={() => {
                setIndex(0);
                setPlaying(false);
              }}
              aria-label="Restart"
            >
              <RestartIcon size={20} /> Restart
            </button>
            <label className="flex min-h-11 cursor-pointer items-center gap-2 rounded-xl px-2 text-sm font-bold">
              <input type="checkbox" className="h-5 w-5 accent-[#2e7d5b]" checked={fast} onChange={(e) => setFast(e.target.checked)} />
              Faster
            </label>
          </div>
        </div>

        <div className="mt-4 rounded-2xl bg-ink p-4 text-cream" aria-live="polite">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-glow px-3 py-0.5 text-sm font-extrabold text-ink">{scene.step.clock}</span>
            <span className="text-sm font-bold opacity-80">
              Step {scene.index + 1} of {total}
            </span>
            {scene.ownerAsleep && (
              <span className="inline-flex items-center gap-1 rounded-full bg-cream/15 px-3 py-0.5 text-sm font-bold">
                <MoonIcon size={16} /> Owner asleep
              </span>
            )}
          </div>
          <p className="mt-2 text-lg font-extrabold leading-snug sm:text-xl">{scene.step.headline}</p>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-cream/20" role="progressbar" aria-valuemin={1} aria-valuemax={total} aria-valuenow={scene.index + 1} aria-label="Story progress">
            <div className="h-full rounded-full bg-glow transition-all" style={{ width: `${((scene.index + 1) / total) * 100}%` }} />
          </div>
        </div>
      </Card>

      <div className="flex gap-2 lg:hidden" role="tablist" aria-label="Which screen to show">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={view === tab.id}
            onClick={() => setView(tab.id)}
            className={`btn flex-1 !px-2 text-sm ${view === tab.id ? "btn-primary" : "btn-secondary"}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)_minmax(0,1fr)]">
        <div className={view === "tenant" ? "block" : "hidden lg:block"}>
          <h2 className="mb-2 text-center text-lg font-extrabold">What the tenant sees</h2>
          <PhoneFrame title="Tenant" clock={scene.step.clock.replace(/^Next day, /, "")} scrollKey={scene.tenant.length} label="Tenant's phone">
            <TenantThread items={scene.tenant} />
          </PhoneFrame>
        </div>

        <div className={view === "agent" ? "block" : "hidden lg:block"}>
          <h2 className="mb-2 flex items-center justify-center gap-2 text-center text-lg font-extrabold">
            <RobotIcon /> What Porchlight does
          </h2>
          <div className="card !p-4">
            <div ref={agentScroll} className="max-h-[540px] overflow-y-auto pr-1">
              <AgentFeed events={scene.agent} live />
            </div>
          </div>
        </div>

        <div className={view === "owner" ? "block" : "hidden lg:block"}>
          <h2 className="mb-2 text-center text-lg font-extrabold">What the owner sees</h2>
          <PhoneFrame title="Owner" clock={scene.step.clock.replace(/^Next day, /, "")} scrollKey={scene.owner.length} label="Owner's phone" stickToBottom={false}>
            <OwnerFeed items={scene.owner} asleep={scene.ownerAsleep} clock={scene.step.clock} onApprove={scenarioId === "leak" ? approve : undefined} />
          </PhoneFrame>
        </div>
      </div>

      {scene.done && (
        <Card title="What just happened">
          {scenarioId === "leak" ? (
            <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Stat label="Tenant got safe steps in" value={minutesText(stats.tenantWaitMinutes)} />
              <Stat label="Quotes checked by plain code" value={String(stats.quotesChecked)} />
              <Stat label="Owner taps needed" value={String(stats.ownerTaps)} note={`about ${minutesText(stats.ownerMinutes)} of the owner's time`} />
              <Stat label="Saved vs the highest quote" value={usd(stats.saved)} />
            </dl>
          ) : (
            <dl className="grid gap-3 sm:grid-cols-3">
              <Stat label="Tenant told to get out in" value={minutesText(stats.tenantWaitMinutes)} />
              <Stat label="Owner's phone" value="Rang through" note="Do Not Disturb does not stop an emergency" />
              <Stat label="Money spent" value="$0" note="Nobody is booked until the home is cleared" />
            </dl>
          )}
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <p className="flex items-center gap-2 font-extrabold">
            <ShieldIcon /> It works inside limits
          </p>
          <p className="mt-1 text-sm text-ink-soft">
            Porchlight can triage, ask questions, collect quotes, and prepare a plan on its own. It cannot book or spend
            until the owner taps. Emergencies skip fix steps and ring the owner.
          </p>
        </Card>
        <Card>
          <p className="flex items-center gap-2 font-extrabold">
            <PeopleIcon /> Two views, one truth
          </p>
          <p className="mt-1 text-sm text-ink-soft">
            The tenant sees safety steps, questions, and who is coming when. The owner sees urgency, the record, the
            money, and one decision. The tenant never sees prices.
          </p>
        </Card>
        <Card>
          <p className="font-extrabold">Who did each piece of work</p>
          <EngineLegend className="mt-2 !grid-cols-1" />
        </Card>
      </div>

      <Badge tone="neutral" icon={false}>
        All names, prices, and times here are fictional samples
      </Badge>
    </StepShell>
  );
}

function Stat({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="rounded-2xl bg-cream p-4">
      <dt className="text-sm font-bold text-ink-soft">{label}</dt>
      <dd className="text-3xl font-extrabold leading-tight">{value}</dd>
      {note && <p className="text-xs text-ink-soft">{note}</p>}
    </div>
  );
}
