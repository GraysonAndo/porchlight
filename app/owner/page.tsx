"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChartIcon, DocIcon, HomeIcon, WrenchIcon } from "@/components/icons";
import { Badge, Card } from "@/components/ui";
import { PROPERTY, EQUIPMENT, SEED_REQUEST_TEXT, VENDORS } from "@/lib/seed";
import { usd } from "@/lib/format";
import { useDemo } from "@/lib/store";

export default function OwnerHomePage() {
  const router = useRouter();
  const { state, actions } = useDemo();

  // A sample request from the sample tenant is always waiting, so the owner demo has something to review.
  const requestText = state.request?.description ?? SEED_REQUEST_TEXT;
  const urgency = state.triage?.urgency;
  const vendor = state.approval ? VENDORS.find((v) => v.id === state.approval?.vendorId) : null;
  const done = state.jobCompletedAt !== null;

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
            <WrenchIcon /> New repair request
            {done ? (
              <Badge tone="good">DONE</Badge>
            ) : state.approval ? (
              <Badge tone="good">BOOKED</Badge>
            ) : (
              <Badge tone="caution">NEEDS YOUR DECISION</Badge>
            )}
          </span>
        }
      >
        <p className="text-sm font-bold text-ink-soft">From {PROPERTY.tenant}</p>
        <p className="mt-1 text-lg font-bold">
          {requestText.length > 120 ? `${requestText.slice(0, 120)}...` : requestText}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {urgency && !state.approval && (
            <Badge tone={urgency === "routine" ? "good" : "urgent"}>{urgency.toUpperCase()}</Badge>
          )}
          {state.tenantAnswers && <Badge tone="good">Tenant answered the questions</Badge>}
          {state.tenantAccess === "confirmed" && <Badge tone="good">Tenant confirmed the time</Badge>}
        </div>
        {vendor && state.approval && (
          <p className="mt-2 text-ink-soft">
            {vendor.name}, {state.approval.accessWindow}. (Simulated, nothing was sent.)
          </p>
        )}
        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <Link href={state.approval ? "/owner/book" : "/owner/request"} className="btn btn-primary">
            {state.approval ? "View the booking" : "Review the request"}
          </Link>
          <Link href="/tenant/status" className="btn btn-secondary">
            See what the tenant sees
          </Link>
        </div>
      </Card>

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
          <span className="text-sm text-ink-soft">What will wear out, and what to set aside</span>
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
