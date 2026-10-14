"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ApprovalCard } from "@/components/ApprovalCard";
import { DemoControls } from "@/components/DemoControls";
import { JobStatusTracker } from "@/components/JobStatusTracker";
import { RentCard } from "@/components/RentCard";
import { TextUpdatesToggle } from "@/components/TextUpdates";
import { Thread } from "@/components/Thread";
import { ToolLog } from "@/components/Sms";
import { ChartIcon, CheckIcon, DocIcon, HomeIcon, PlayIcon } from "@/components/icons";
import { sampleRepairEvents, useAgent } from "@/lib/agents/useAgent";
import { buildForecast } from "@/lib/forecast";
import { usd } from "@/lib/format";
import { EQUIPMENT, PROPERTY, VENDORS } from "@/lib/seed";
import { useDemo } from "@/lib/store";
import { useJobStatus } from "@/lib/useJobStatus";

export default function OwnerHomePage() {
  const router = useRouter();
  const { state, actions } = useDemo();
  const agent = useAgent();
  const status = useJobStatus();

  const msgs = agent.msgsFor("owner");
  const open = msgs.filter((m) => m.dir === "out" && m.actions && !m.usedAction);
  const via = agent.textUpdates.owner ? "text" : "app";
  const forecast = buildForecast(EQUIPMENT);
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
      ? "Porchlight already did the work. Check it over, then tap Approve."
      : msgs.length === 0
        ? "Porchlight only texts you when something needs you."
        : status === "booked" || status === "approved"
          ? "The repair is booked. Porchlight is keeping your tenant updated."
          : status === "done"
            ? "The new water heater is in, and your house record updated itself."
            : "Nothing needs you right now. Porchlight will text you if something comes up.";

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div>
        <p className="eyebrow mb-1">Owner view</p>
        <h1 className="font-display text-3xl font-extrabold leading-tight sm:text-4xl">{PROPERTY.address}</h1>
        <p className="mt-1 text-ink-soft">
          {PROPERTY.kind}. Tenant: {PROPERTY.tenant}. Rent {usd(PROPERTY.rent)} per month.
        </p>
      </div>

      <div className="hero-ink">
        <p className="eyebrow !text-cream/70">Today</p>
        <p className="mt-1 text-3xl font-extrabold leading-tight sm:text-5xl">{headline}</p>
        <p className="mt-2 text-lg text-cream/85">{sub}</p>
        {hasRepair && (
          <div className="mt-5 rounded-2xl bg-white p-4 text-ink">
            <p className="mb-3 font-extrabold">Water heater repair</p>
            <JobStatusTracker status={status} />
            {saved > 0 && (
              <p className="mt-3 inline-block rounded-full bg-good px-3 py-1 text-sm font-extrabold text-white">{usd(saved)} saved on this repair</p>
            )}
          </div>
        )}
        {msgs.length === 0 && (
          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              className="btn btn-lg bg-glow font-extrabold text-ink hover:bg-glow-deep"
              onClick={() => actions.agentSendMany(sampleRepairEvents())}
            >
              <PlayIcon size={22} /> Show me a sample repair
            </button>
            <button
              type="button"
              className="btn btn-lg bg-white font-extrabold text-ink"
              onClick={() => {
                actions.setRole("tenant");
                router.push("/tenant");
              }}
            >
              Text Porchlight as the tenant
            </button>
          </div>
        )}
      </div>

      {open.map((m) => (
        <ApprovalCard key={m.id} msg={m} onTap={(msgId, action) => agent.send({ type: "owner.tap", msgId, action })} />
      ))}

      {status === "booked" && !open.some((m) => m.card) && (
        <section aria-label="The repair is booked" className="rounded-3xl border-2 border-good bg-good-tint p-5">
          <p className="flex items-start gap-2 text-lg font-extrabold text-good-ink">
            <CheckIcon size={24} />
            <span>
              Booked: {vendor?.name ?? "your plumber"}, {state.approval?.accessWindow}.
            </span>
          </p>
          <p className="mt-1 text-ink-soft">Your tenant has been told. After the visit, tap Mark done. The new heater goes into your house record on its own.</p>
          <button type="button" className="btn btn-primary btn-lg mt-3 w-full sm:w-auto" onClick={() => agent.send({ type: "owner.markDone" })}>
            Mark done
          </button>
        </section>
      )}

      {status === "approved" && (
        <p className="rounded-2xl bg-good-tint p-4 font-bold text-good-ink" role="status">
          Approved. Confirming with the vendor...
        </p>
      )}

      <section aria-labelledby="texts-heading" className="space-y-2">
        <h2 id="texts-heading" className="font-display text-2xl font-extrabold">
          Texts from Porchlight
        </h2>
        <Thread
          party="owner"
          msgs={msgs}
          typing={agent.typingFor("owner")}
          placeholder="Text Porchlight, for example 1 to approve"
          onSend={(text) => agent.send({ type: "owner.text", text })}
          via={via}
          empty="Nothing yet. When something happens, Porchlight texts you here and by phone."
          heightClass="h-80"
        />
      </section>

      <TextUpdatesToggle party="owner" />
      <RentCard audience="owner" />

      {agent.tools.length > 0 && (
        <details className="rounded-2xl border border-line bg-white px-4">
          <summary className="flex min-h-11 cursor-pointer items-center font-bold">See what Porchlight did for you ({agent.tools.length} steps)</summary>
          <div className="pb-4">
            <ToolLog entries={agent.visible} />
          </div>
        </details>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <Link href="/owner/record" className="card card-lift flex flex-col gap-1 hover:border-ink">
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-ink text-glow">
            <HomeIcon />
          </span>
          <span className="mt-1 text-lg font-extrabold">House record</span>
          <span className="text-sm text-ink-soft">{EQUIPMENT.length} pieces of equipment on file</span>
        </Link>
        <Link href="/owner/forecast" className="card card-lift flex flex-col gap-1 hover:border-ink">
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-ink text-glow">
            <ChartIcon />
          </span>
          <span className="mt-1 text-lg font-extrabold">5-year forecast</span>
          <span className="text-sm text-ink-soft">
            Set aside about {usd(forecast.setAsideLowPerMonth)} to {usd(forecast.setAsideHighPerMonth)} a month
          </span>
        </Link>
        <Link href="/owner/rent" className="card card-lift flex flex-col gap-1 hover:border-ink">
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-ink text-glow">
            <DocIcon />
          </span>
          <span className="mt-1 text-lg font-extrabold">Rent increase check</span>
          <span className="text-sm text-ink-soft">California cap and a notice draft</span>
        </Link>
      </div>

      <DemoControls show={["clock", "quote", "lease"]} />

      <button
        type="button"
        className="btn btn-ghost"
        onClick={() => {
          actions.setRole("tenant");
          router.push("/tenant");
        }}
      >
        Switch to tenant view
      </button>
    </div>
  );
}
