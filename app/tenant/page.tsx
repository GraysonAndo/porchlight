"use client";

import Link from "next/link";
import { useState } from "react";
import { AgentPanel } from "@/components/AgentPanel";
import { Thread } from "@/components/Thread";
import { useAgent } from "@/lib/agents/useAgent";
import { requestsFor } from "@/lib/agents/views";

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

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-3xl font-extrabold leading-tight sm:text-4xl">Help</h1>
        <p className="mt-1 text-lg text-ink-soft">
          How can we help? Tell GoHome what is going on. It has your home on file, gives you safe steps, and handles the rest.{" "}
          <Link href="/tenant/texts" className="font-bold text-brand underline underline-offset-4">
            See how it will feel by text
          </Link>
        </p>
      </div>

      {requests.length > 0 && (
        <section aria-labelledby="requests-heading" className="card !p-4">
          <h2 id="requests-heading" className="text-lg font-extrabold">
            Your requests
          </h2>
          <ul className="mt-1 divide-y divide-line">
            {requests.map((r) => (
              <li key={r.id} className="flex flex-wrap items-baseline justify-between gap-x-4 py-1.5 text-sm">
                <span className="font-bold">{r.title}</span>
                <span className="text-ink-soft">{r.status}</span>
              </li>
            ))}
          </ul>
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
            placeholder="Tell GoHome what is wrong"
            onSend={(text, shown) => agent.send({ type: "tenant.text", text, shown })}
            onPhoto={(photo) => agent.send({ type: "tenant.photo", photo })}
            photoLabels={[["leak", "Photo of the problem"]]}
            suggestions={msgs.length === 0 ? STARTERS : undefined}
            via={via}
            empty="Tap one of the buttons below, or type what is going on. A photo helps."
            heightClass="h-[26rem] lg:h-[34rem]"
          />
        </div>
        <div className={view === "activity" ? "" : "hidden lg:block"}>
          <AgentPanel audience="tenant" />
        </div>
      </div>
    </div>
  );
}
