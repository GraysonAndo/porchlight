"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { EngineChip } from "@/components/Agent";
import { JobStatusTracker } from "@/components/JobStatusTracker";
import { RentCard } from "@/components/RentCard";
import { ChartIcon, CheckIcon, DocIcon, HomeIcon, MoonIcon, PlayIcon, TapIcon, WrenchIcon } from "@/components/icons";
import { Badge, Card } from "@/components/ui";
import { ACCESS_WINDOWS, PROPERTY, EQUIPMENT, SEED_REQUEST_TEXT, VENDORS } from "@/lib/seed";
import { usd } from "@/lib/format";
import { isHeaterJob, triageEvents } from "@/lib/agentLog";
import { URGENCY_LABEL } from "@/lib/triage";
import { buildForecast } from "@/lib/forecast";
import { PLAN } from "@/lib/plan";
import type { Engine } from "@/lib/scenario";
import { useDemo } from "@/lib/store";
import { useJobStatus } from "@/lib/useJobStatus";

export default function OwnerHomePage() {
  const router = useRouter();
  const { state, actions } = useDemo();

  // A sample request from the sample tenant is always waiting, so the owner demo has something to review.
  const requestText = state.request?.description ?? SEED_REQUEST_TEXT;
  const urgency = state.triage?.urgency;
  const vendor = state.approval ? VENDORS.find((v) => v.id === state.approval?.vendorId) : null;
  const done = state.jobCompletedAt !== null;
  const status = useJobStatus();
  const forecast = buildForecast(EQUIPMENT);
  const triage = state.triage;
  const heaterJob = !state.request || isHeaterJob(state.request.description, triage);
  const work: [Engine, string][] = heaterJob
    ? [
        ["ai", "Read the tenant's photo and sorted the urgency"],
        ["code", "Checked the emergency rules (not an emergency, so no 4 AM call)"],
        ["ai", "Asked the tenant for a photo of the heater label"],
        ["action", `Collected ${PLAN.skipped.length + 1} quotes and checked each one`],
        ["code", `Picked ${PLAN.vendorName} at ${usd(PLAN.total)}`],
        state.approval
          ? ["action", "Booked the visit and told the tenant"]
          : ["human", "Waiting for your tap to approve"],
      ]
    : state.request && triage
      ? triageEvents({ request: state.request, triage, record: state.houseRecord }).map((e): [Engine, string] => [e.engine, e.title])
      : [];

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <p className="eyebrow mb-2">Owner home</p>
        <h1 className="font-display text-4xl font-extrabold leading-tight sm:text-5xl">Your property</h1>
      </div>

      <Card>
        <div className="flex items-start gap-3">
          <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-glow-tint">
            <HomeIcon size={28} />
          </span>
          <div>
            <p className="text-lg font-bold">{PROPERTY.address}</p>
            <p className="text-ink-soft">
              {PROPERTY.kind}, {PROPERTY.units} unit. Tenant: {PROPERTY.tenant}, since {PROPERTY.tenantSince}. Rent{" "}
              {usd(PROPERTY.rent)} per month.
            </p>
          </div>
        </div>
      </Card>

      <Card
        title={
          <span className="flex flex-wrap items-center gap-2">
            <WrenchIcon /> Repair request
            {status === "done" ? (
              <Badge tone="good">DONE</Badge>
            ) : status === "booked" ? (
              <Badge tone="good">BOOKED</Badge>
            ) : status === "approved" ? (
              <Badge tone="good">APPROVED</Badge>
            ) : status === "quoted" ? (
              <Badge tone="caution">READY FOR YOUR OK</Badge>
            ) : (
              <Badge tone="neutral" icon={false}>NEW</Badge>
            )}
            {urgency && status !== "done" && status !== "booked" && status !== "approved" && (
              <Badge tone={urgency === "routine" ? "good" : "urgent"}>{URGENCY_LABEL[urgency]}</Badge>
            )}
          </span>
        }
      >
        <p className="text-sm font-bold text-ink-soft">From {PROPERTY.tenant}</p>
        <p className="mt-1 text-lg font-bold">
          {requestText.length > 120 ? `${requestText.slice(0, 120)}...` : requestText}
        </p>

        <div className="mt-4">
          <JobStatusTracker status={status} />
        </div>

        {status === "quoted" && heaterJob && (
          <div className="mt-4 rounded-2xl bg-glow-tint p-4">
            <p className="eyebrow">Porchlight&apos;s plan, already done for you</p>
            <p className="mt-1 text-xl font-extrabold leading-snug">
              Replace the water heater with {PLAN.vendorName} for {usd(PLAN.total)}.
            </p>
            <p className="mt-1">
              Fair price, license on file, saves you {usd(PLAN.savedVsHighest)}. Limit {usd(PLAN.notToExceed)}. Visit{" "}
              {ACCESS_WINDOWS[0].toLowerCase()}. The tenant and the vendor are told for you.
            </p>
            <button
              type="button"
              className="btn btn-primary btn-lg mt-3 w-full sm:w-auto"
              onClick={() =>
                actions.approve({
                  vendorId: PLAN.vendorId,
                  notToExceed: PLAN.notToExceed,
                  accessWindow: ACCESS_WINDOWS[0],
                  sentAt: new Date().toISOString(),
                })
              }
            >
              <TapIcon size={22} /> Approve
            </button>
            <p className="mt-2 text-sm text-ink-soft">
              One tap. Nothing is spent until you tap. Want to change something?{" "}
              <Link href="/owner/book" className="font-bold underline underline-offset-4">
                Pick another vendor or limit
              </Link>
              {" or "}
              <Link href="/owner/quote" className="font-bold underline underline-offset-4">
                see the quotes
              </Link>
              .
            </p>
          </div>
        )}

        {(status === "approved" || status === "booked") && vendor && state.approval && (
          <div className="mt-4 rounded-2xl bg-good-tint p-4" role="status">
            <p className="flex items-start gap-2 font-extrabold text-good-ink">
              <CheckIcon size={22} />
              <span>
                {status === "approved" ? "Approved. Confirming with the vendor..." : "Booked."} {vendor.name},{" "}
                {state.approval.accessWindow}.
              </span>
            </p>
            <p className="mt-1 text-sm text-ink-soft">Limit {usd(state.approval.notToExceed)}. (Simulated, nothing was sent.)</p>
            {status === "booked" && (
              <>
                <button type="button" className="btn btn-primary mt-3" onClick={() => actions.completeJob()}>
                  Mark done
                </button>
                <p className="mt-1 text-sm text-ink-soft">
                  Tap this after the visit. The installer&apos;s details go into your house record on their own.
                </p>
              </>
            )}
          </div>
        )}

        {status === "done" && (
          <p className="mt-4 flex items-start gap-2 rounded-2xl bg-good-tint p-4 font-bold text-good-ink" role="status">
            <CheckIcon size={22} />
            <span>
              Done. The new water heater is in your{" "}
              <Link href="/owner/record" className="underline underline-offset-4">
                house record
              </Link>
              .
            </span>
          </p>
        )}

        <div className="mt-3 flex flex-wrap items-center gap-2">
          {state.tenantAnswers && <Badge tone="good">Tenant answered the questions</Badge>}
          {state.tenantAccess === "confirmed" && <Badge tone="good">Tenant confirmed the time</Badge>}
        </div>

        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <Link href={state.approval ? "/owner/book" : "/owner/request"} className="btn btn-secondary">
            {state.approval ? "View the booking" : "See the details"}
          </Link>
          <Link href="/tenant/status" className="btn btn-ghost">
            See what the tenant sees
          </Link>
        </div>
      </Card>

      <RentCard audience="owner" />

      <div className="hero-ink">
        <p className="eyebrow !text-cream/70 flex items-center gap-2">
          <MoonIcon size={18} /> While you were away
        </p>
        <p className="mt-2 text-2xl font-extrabold leading-snug sm:text-4xl">
          {!heaterJob
            ? triage?.alertOwnerNow
              ? "Porchlight sorted a new request and called you, because it cannot wait."
              : "Porchlight sorted a new request for you."
            : done
              ? "The new heater is in and the house record updated itself."
              : state.approval
                ? "Booked. Porchlight is watching the visit for you."
                : "Porchlight handled the leak. It needs one tap from you."}
        </p>
        <ul className="mt-4 grid gap-2 sm:grid-cols-2">
          {work.map(([engine, text]) => (
            <li key={text} className="flex items-start gap-2 rounded-2xl bg-white/10 p-3 text-cream">
              <span className="mt-0.5 shrink-0">
                <EngineChip engine={engine} />
              </span>
              <span>{text}</span>
            </li>
          ))}
        </ul>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          {heaterJob && (
            <span className="rounded-2xl bg-glow px-4 py-2 font-extrabold text-ink">
              {usd(PLAN.savedVsHighest)} {state.approval ? "saved" : "to save"} on this repair
            </span>
          )}
          <Link href="/live" className="btn btn-lg bg-white font-extrabold text-ink">
            <PlayIcon size={20} /> Watch how it went
          </Link>
        </div>
      </div>

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
          <span className="text-sm text-ink-soft">What will wear out. Set aside about {usd(forecast.setAsideLowPerMonth)} to {usd(forecast.setAsideHighPerMonth)} a month</span>
        </Link>
        <Link href="/owner/rent" className="card card-lift flex flex-col gap-1 hover:border-ink">
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-ink text-glow">
            <DocIcon />
          </span>
          <span className="mt-1 text-lg font-extrabold">Rent increase check</span>
          <span className="text-sm text-ink-soft">California cap and a notice draft</span>
        </Link>
      </div>

      <button
        type="button"
        className="btn btn-ghost"
        onClick={() => {
          actions.setRole("tenant");
          router.push("/tenant/request");
        }}
      >
        Switch to tenant view
      </button>
    </div>
  );
}
