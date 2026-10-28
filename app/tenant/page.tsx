"use client";

import Link from "next/link";
import { useState } from "react";
import { AgentPanel } from "@/components/AgentPanel";
import { Thread } from "@/components/Thread";
import { useAgent } from "@/lib/agents/useAgent";
import { requestsFor } from "@/lib/agents/views";
import { useDemo } from "@/lib/store";
import { BILLS, dueStatus, money } from "@/lib/payments";

const STARTERS = [
  { label: "My water heater is leaking", text: "water heater is leaking all over the garage" },
  { label: "I smell gas", text: "I smell gas near the water heater" },
  { label: "The toilet is overflowing", text: "The toilet is clogged and overflowing" },
  { label: "How much is my rent?", text: "How much is my rent?" },
];

export default function TenantPage() {
  const agent = useAgent();
  const msgs = agent.msgsFor("tenant");
  const requests = requestsFor({ ...agent.world, timeline: agent.visible });
  const via = agent.textUpdates.tenant ? "text" : "app";
  const [view, setView] = useState<"chat" | "activity">("chat");
  const { state, hydrated } = useDemo();
  // What the tenant owes, so paying is one tap from the first screen instead of a search through the tabs.
  const paidKinds = new Set(state.payments.map((p) => p.kind));
  if (state.rentPaidAt) paidKinds.add("rent");
  const dueCents = BILLS.filter((b) => !paidKinds.has(b.kind)).reduce((sum, b) => sum + b.cents, 0);
  const rentLate = !paidKinds.has("rent") && dueStatus("rent").overdue;
  const needsTime = agent.world.triage.stage === "booked" && !agent.world.triage.tenantConfirmed;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-extrabold leading-tight sm:text-3xl">Help</h1>
        <p className="mt-1 text-ink-soft">
          How can we help? Tell GoHome what is going on. It has your home on file, gives you safe steps, and handles the rest.{" "}
          <Link href="/tenant/texts" className="font-bold text-brand underline underline-offset-4">
            See how it will feel by text
          </Link>
        </p>
      </div>

      <p className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-2xl border border-urgent/40 bg-urgent-tint px-4 py-2 text-sm font-bold text-ink">
        <span>Fire, gas smell, or someone hurt? Get out first and call</span>
        <a href="tel:911" aria-label="Call 911" className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg bg-urgent px-4 font-extrabold text-white">
          911
        </a>
        <span>. Then tell GoHome.</span>
      </p>

      {hydrated && dueCents > 0 && (
        <section aria-label="What you owe" className={`flex flex-wrap items-center justify-between gap-3 rounded-2xl border-2 px-4 py-3 ${rentLate ? "border-urgent bg-urgent-tint" : "border-line bg-white"}`}>
          <p className="font-bold">
            You owe {money(dueCents)}.{" "}
            <span className={rentLate ? "text-urgent" : "text-ink-soft"}>{rentLate ? `Rent is ${dueStatus("rent").text}` : "Due this month."}</span>
          </p>
          <Link href="/tenant/pay" className="btn btn-primary !min-h-11">
            Pay now
          </Link>
        </section>
      )}

      {requests.length > 0 && (
        <section aria-labelledby="requests-heading" className="card !p-4">
          <h2 id="requests-heading" className="text-lg font-extrabold">
            {requests.length === 1 ? "Where things stand" : "Your requests"}
          </h2>
          <ul className="mt-1 divide-y divide-line" aria-live="polite">
            {requests.map((r) => (
              <li key={r.id} className="flex flex-wrap items-baseline justify-between gap-x-4 py-1.5 text-sm">
                <span className="font-bold">{r.title}</span>
                <span className="font-bold text-ink-soft">{r.status}</span>
              </li>
            ))}
          </ul>
          {needsTime && (
            <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Is the plumber's time good?">
              <button type="button" aria-label="That works: confirm the visit time" className="btn btn-primary !min-h-11" onClick={() => agent.send({ type: "tenant.text", text: "1", shown: "That works" })}>
                That works
              </button>
              <button type="button" aria-label="Another time: ask for a different visit time" className="btn btn-secondary !min-h-11" onClick={() => agent.send({ type: "tenant.text", text: "2", shown: "Another time" })}>
                Another time
              </button>
            </div>
          )}
        </section>
      )}

      <div
        role="tablist"
        aria-label="Chat or activity"
        className="grid grid-cols-2 gap-1 rounded-xl bg-cream-deep p-1 lg:hidden"
        onKeyDown={(e) => {
          if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) return;
          e.preventDefault();
          const next = e.key === "Home" ? "chat" : e.key === "End" ? "activity" : view === "chat" ? "activity" : "chat";
          setView(next);
          e.currentTarget.querySelector<HTMLButtonElement>(`#tenant-tab-${next}`)?.focus();
        }}
      >
        {(["chat", "activity"] as const).map((id) => (
          <button
            key={id}
            id={`tenant-tab-${id}`}
            type="button"
            role="tab"
            aria-selected={view === id}
            tabIndex={view === id ? 0 : -1}
            onClick={() => setView(id)}
            className={`min-h-11 rounded-lg px-3 text-sm font-bold ${view === id ? "bg-white text-ink shadow-sm" : "text-ink-soft"}`}
          >
            {id === "chat" ? "Chat" : agent.pending || agent.waiting ? "What GoHome is doing (working)" : "What GoHome is doing"}
          </button>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className={view === "chat" ? "" : "hidden lg:block"}>
          <Thread
            party="tenant"
            msgs={msgs}
            typing={agent.typingFor("tenant")}
            placeholder="What is wrong?"
            onSend={(text, shown) => agent.send({ type: "tenant.text", text, shown })}
            onPhoto={(photo) => agent.send({ type: "tenant.photo", photo })}
            photoLabels={[["leak", "Photo of the problem"]]}
            suggestions={msgs.length === 0 ? STARTERS : undefined}
            via={via}
            empty="Tap one of the buttons below, or type what is going on. A photo helps."
            heightClass="h-[clamp(13rem,calc(100dvh-34rem),34rem)]"
          />
        </div>
        <div className={view === "activity" ? "" : "hidden lg:block"}>
          <AgentPanel audience="tenant" />
        </div>
      </div>
    </div>
  );
}
