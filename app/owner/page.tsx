"use client";

import { useState } from "react";
import { AgentPanel } from "@/components/AgentPanel";
import { ApprovalCard } from "@/components/ApprovalCard";
import { JobStatusTracker } from "@/components/JobStatusTracker";
import { RentCard } from "@/components/RentCard";
import { Thread } from "@/components/Thread";
import { CheckIcon, PlayIcon } from "@/components/icons";
import { sampleRepairEvents, useAgent } from "@/lib/agents/useAgent";
import { usd } from "@/lib/format";
import { PROPERTY, VENDORS } from "@/lib/seed";
import { useDemo } from "@/lib/store";
import { useJobStatus } from "@/lib/useJobStatus";
import Link from "next/link";

const ASK = [
  { label: "Check my lease dates", text: "Check my lease and rent" },
  { label: "A contractor sent me a quote", text: "A contractor sent me a quote" },
];

export default function OwnerHomePage() {
  const { state, actions } = useDemo();
  const agent = useAgent();
  const status = useJobStatus();
  const [tab, setTab] = useState<"activity" | "texts">("activity");

  const msgs = agent.msgsFor("owner");
  const open = msgs.filter((m) => m.dir === "out" && m.actions && !m.usedAction);
  const via = agent.textUpdates.owner ? "text" : "app";
  const hasRepair = agent.world.triage.stage !== "idle" && agent.world.triage.stage !== "closed" && agent.world.triage.stage !== "emergency";
  const vendor = state.approval ? VENDORS.find((v) => v.id === state.approval?.vendorId) : null;
  const saved = agent.world.stats.saved;

  const headline =
    open.length > 0
      ? `${open.length === 1 ? "1 thing needs" : `${open.length} things need`} your OK`
      : msgs.length === 0
        ? "All quiet"
        : status === "done"
          ? "All done"
          : "You're all caught up";
  const sub =
    open.length > 0
      ? "GoHome already did the work. Check it over, then tap Approve."
      : msgs.length === 0
        ? "GoHome only reaches out when something needs you."
        : status === "booked" || status === "approved"
          ? "The repair is booked. GoHome is keeping your tenant updated."
          : status === "done"
            ? "The new water heater is in, and your home record updated itself."
            : "Nothing needs you right now. GoHome will tell you if something comes up.";

  return (
    <div className="space-y-5">
      <div>
        <p className="eyebrow mb-1">{PROPERTY.kind}</p>
        <h1 className="text-3xl font-extrabold leading-tight sm:text-4xl">{PROPERTY.address}</h1>
        <p className="mt-1 text-ink-soft">
          Tenant: {PROPERTY.tenant}. Rent {usd(PROPERTY.rent)} per month.
        </p>
      </div>

      <div className="grid items-start gap-5 lg:grid-cols-2">
        <div className="space-y-5">
          <div className="hero-ink">
            <p className="eyebrow !text-white/70">Today</p>
            <p className="mt-1 text-3xl font-extrabold leading-tight sm:text-4xl">{headline}</p>
            <p className="mt-2 text-lg text-white/85">{sub}</p>
            {hasRepair && (
              <div className="mt-5 rounded-xl bg-white p-4 text-ink">
                <p className="mb-3 font-extrabold">Water heater repair</p>
                <JobStatusTracker status={status} />
                {saved > 0 && (
                  <p className="mt-3 inline-block rounded-full bg-good px-3 py-1 text-sm font-extrabold text-white">{usd(saved)} saved on this repair</p>
                )}
              </div>
            )}
            {msgs.length === 0 && (
              <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                <button type="button" className="btn btn-lg bg-glow font-extrabold text-ink hover:bg-glow-deep" onClick={() => actions.agentSendMany(sampleRepairEvents())}>
                  <PlayIcon size={22} /> See how GoHome handles a repair
                </button>
              </div>
            )}
          </div>

          {open.map((m) => (
            <ApprovalCard key={m.id} msg={m} onTap={(msgId, action) => agent.send({ type: "owner.tap", msgId, action })} />
          ))}

          {status === "booked" && !open.some((m) => m.card) && (
            <section aria-label="The repair is booked" className="rounded-2xl border-2 border-good bg-good-tint p-5">
              <p className="flex items-start gap-2 text-lg font-extrabold text-good-ink">
                <CheckIcon size={24} />
                <span>
                  Booked: {vendor?.name ?? "your plumber"}, {state.approval?.accessWindow}.
                </span>
              </p>
              <p className="mt-1 text-ink-soft">Your tenant has been told. After the visit, tap Mark done. The new heater goes into your home record on its own.</p>
              <button type="button" className="btn btn-primary btn-lg mt-3 w-full sm:w-auto" onClick={() => agent.send({ type: "owner.markDone" })}>
                Mark done
              </button>
            </section>
          )}

          {status === "approved" && (
            <p className="rounded-xl bg-good-tint p-4 font-bold text-good-ink" role="status">
              Approved. Confirming with the vendor...
            </p>
          )}

          <RentCard />
          <p className="text-sm text-ink-soft">
            Want the details behind a repair? Open any approval and tap &quot;See the details&quot;, or check the{" "}
            <Link href="/owner/record" className="font-bold underline underline-offset-4">
              home record
            </Link>{" "}
            and the{" "}
            <Link href="/owner/forecast" className="font-bold underline underline-offset-4">
              5-year forecast
            </Link>
            .
          </p>
        </div>

        <div className="space-y-3 lg:sticky lg:top-20">
          <div role="tablist" aria-label="Activity or texts" className="grid grid-cols-2 gap-1 rounded-xl bg-cream-deep p-1">
            {(["activity", "texts"] as const).map((id) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={tab === id}
                onClick={() => setTab(id)}
                className={`min-h-11 rounded-lg px-3 text-sm font-bold ${tab === id ? "bg-white text-ink shadow-sm" : "text-ink-soft"}`}
              >
                {id === "activity" ? "What GoHome is doing" : "Texts from GoHome"}
              </button>
            ))}
          </div>
          {tab === "activity" ? (
            <AgentPanel audience="owner" heightClass="h-[28rem] lg:h-[32rem]" />
          ) : (
            <Thread
              party="owner"
              msgs={msgs}
              typing={agent.typingFor("owner")}
              placeholder="Text GoHome, for example 1 to approve"
              onSend={(text) => agent.send({ type: "owner.text", text })}
              suggestions={ASK}
              via={via}
              empty="Nothing yet. When something happens, GoHome texts you here and by phone."
              heightClass="h-[28rem] lg:h-[32rem]"
            />
          )}
        </div>
      </div>
    </div>
  );
}
