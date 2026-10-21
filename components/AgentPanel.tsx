"use client";

// "What GoHome is doing": the agent's work as a live list of steps, beside the chat. The owner sees every step, with who did it
// (AI, plain rules, GoHome acting, or a person tapping). The tenant sees only the steps that matter to them, in plain words.

import { useEffect, useRef } from "react";
import { EngineChip } from "./Agent";
import { CheckIcon } from "./icons";
import { activityFor } from "@/lib/agents/views";
import { useAgent } from "@/lib/agents/useAgent";

const ALWAYS_ON = {
  tenant: ["Emergency safety checks, any hour", "Your home record and how-to guides", "Keeping your landlord in the loop"],
  owner: ["Equipment age and warranty, all 6 items", "Lease dates and California rent rules", "Quotes checked against typical prices"],
};

export function AgentPanel({ audience, className = "", heightClass = "h-[clamp(13rem,calc(100dvh-34rem),34rem)]" }: { audience: "tenant" | "owner"; className?: string; heightClass?: string }) {
  const agent = useAgent();
  const items = activityFor(audience, agent.visible);
  // Steps are grouped by job, in the order each job started. Only the latest job is open, so finished ones fold away.
  const groups: { job: string; items: typeof items }[] = [];
  for (const it of items) {
    const g = groups.find((x) => x.job === it.job);
    if (g) g.items.push(it);
    else groups.push({ job: it.job, items: [it] });
  }
  // The job with the newest step goes last, so it is the one left open.
  const lastJob = items.length > 0 ? items[items.length - 1].job : null;
  if (lastJob) groups.sort((a, b) => Number(a.job === lastJob) - Number(b.job === lastJob));
  const working = agent.pending || agent.waiting;
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = box.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [items.length, working]);

  return (
    <section aria-label="What GoHome is doing" className={`flex flex-col overflow-hidden rounded-2xl border border-line bg-white ${className}`}>
      <div className="flex items-center gap-3 border-b border-line bg-cream px-4 py-3">
        <span className="relative inline-flex h-3 w-3" aria-hidden="true">
          <span className={`absolute inline-flex h-full w-full rounded-full ${working ? "bg-glow glow-pulse" : "bg-good"}`} />
        </span>
        <div className="min-w-0">
          <h2 className="font-extrabold leading-tight">What GoHome is doing</h2>
          <p className="text-xs font-bold text-ink-soft" role="status">
            {working ? "Working on it..." : items.length === 0 ? "Standing by" : "Up to date. Watching your home."}
          </p>
        </div>
      </div>
      <div ref={box} className={`${heightClass} overflow-y-auto p-4`} tabIndex={0} aria-label="GoHome activity, scrollable">
        {items.length === 0 && !working ? (
          <div className="flex h-full flex-col justify-center">
            <p className="font-bold">
              {audience === "tenant" ? "Nothing to do right now." : "All quiet. Nothing needs you."}
            </p>
            <p className="mt-1 text-sm text-ink-soft">
              {audience === "tenant"
                ? "When you report a problem or ask a question, you will see GoHome work on it here, step by step."
                : "When something happens, you will see exactly what GoHome checked and did here, step by step."}
            </p>
            <p className="eyebrow mb-1 mt-5">Always watching</p>
            <ul className="space-y-1.5 text-sm">
              {ALWAYS_ON[audience].map((line) => (
                <li key={line} className="flex items-start gap-2">
                  <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-good-tint text-good-ink">
                    <CheckIcon size={13} />
                  </span>
                  {line}
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="space-y-3">
            {groups.map((g, gi) => (
              <details key={g.job} open={gi === groups.length - 1 || audience === "tenant"} className="rounded-xl border border-line">
                <summary className="flex min-h-11 cursor-pointer items-center justify-between gap-2 px-3 font-extrabold">
                  <span>{g.job}</span>
                  <span className="text-xs font-bold text-ink-soft">{g.items.length} {g.items.length === 1 ? "step" : "steps"}{gi < groups.length - 1 ? ", finished" : ""}</span>
                </summary>
                <ol className="space-y-3 px-3 pb-3">
                  {g.items.map((item) => (
                    <li key={item.id} className="reveal flex gap-3">
                      <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-good text-white">
                        <CheckIcon size={14} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="font-bold leading-snug">{item.title}</p>
                        {item.detail && <p className="mt-0.5 text-sm text-ink-soft">{item.detail}</p>}
                        <p className="mt-1 flex flex-wrap items-center gap-2 text-xs font-bold text-ink-soft">
                          {item.engine && <EngineChip engine={item.engine} />}
                          <span>{item.clock}</span>
                        </p>
                      </div>
                    </li>
                  ))}
                </ol>
              </details>
            ))}
            {working && (
              <p className="flex items-center gap-3 text-sm font-bold text-ink-soft" aria-label="GoHome is working">
                <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center">
                  <span className="think-dot !h-2.5 !w-2.5" />
                </span>
                {agent.pending ? "Working on the next step..." : audience === "tenant" ? "Finding the right plumber for you..." : "Waiting for plumbers to send quotes..."}
              </p>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
