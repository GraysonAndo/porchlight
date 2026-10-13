"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Badge, Card } from "@/components/ui";
import { PROPERTY, EQUIPMENT } from "@/lib/seed";
import { usd } from "@/lib/format";
import { useDemo } from "@/lib/store";

function RoleButton({
  title,
  body,
  onClick,
}: {
  title: string;
  body: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="card flex min-h-28 w-full cursor-pointer flex-col items-start gap-1 text-left transition-colors hover:border-ink hover:bg-glow-tint/50"
    >
      <span className="text-2xl font-extrabold">{title}</span>
      <span className="text-ink-soft">{body}</span>
      <span className="mt-2 font-bold underline underline-offset-4">Choose</span>
    </button>
  );
}

function OwnerView() {
  const router = useRouter();
  const { state, actions } = useDemo();
  const request = state.request;
  const urgency = state.triage?.urgency;

  return (
    <div className="space-y-5">
      <Card
        title={
          <span className="flex flex-wrap items-center gap-2">
            Your property <Badge tone="neutral" icon={false}>{PROPERTY.units} unit</Badge>
          </span>
        }
      >
        <p className="text-lg font-bold">{PROPERTY.address}</p>
        <p className="text-ink-soft">
          {PROPERTY.kind}. Tenant since {PROPERTY.tenantSince}. Rent {usd(PROPERTY.rent)} per month.
        </p>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl bg-cream p-4">
            <p className="text-sm font-bold uppercase tracking-wide text-ink-soft">Open repair request</p>
            {request ? (
              <>
                <p className="mt-1 font-bold">
                  {request.description.length > 90 ? `${request.description.slice(0, 90)}...` : request.description}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {urgency ? (
                    <Badge tone={urgency === "routine" ? "good" : "urgent"}>{urgency.toUpperCase()}</Badge>
                  ) : (
                    <Badge tone="neutral">Waiting for triage</Badge>
                  )}
                  <Link href="/triage" className="btn btn-secondary !min-h-11 text-sm">
                    Review request
                  </Link>
                </div>
              </>
            ) : (
              <>
                <p className="mt-1">No open requests yet.</p>
                <Link href="/tenant/request" className="btn btn-secondary mt-2 text-sm">
                  Start with a sample repair
                </Link>
              </>
            )}
          </div>

          <div className="rounded-xl bg-cream p-4">
            <p className="text-sm font-bold uppercase tracking-wide text-ink-soft">House record</p>
            <p className="mt-1 text-3xl font-extrabold">{EQUIPMENT.length}</p>
            <p className="text-ink-soft">pieces of equipment tracked</p>
            <Link href="/record" className="btn btn-secondary mt-2 text-sm">
              Open house record
            </Link>
          </div>
        </div>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2">
        <Link href="/forecast" className="btn btn-secondary btn-lg">
          5-year forecast
        </Link>
        <Link href="/rent" className="btn btn-secondary btn-lg">
          Rent increase check
        </Link>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Link href="/tenant/request" className="btn btn-primary btn-lg">
          Start the 9 step demo
        </Link>
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
    </div>
  );
}

export default function HomePage() {
  const router = useRouter();
  const { state, actions } = useDemo();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <section>
        <h1 className="text-3xl font-extrabold leading-tight sm:text-5xl">
          Your rental, looked after.
        </h1>
        <p className="mt-3 text-lg text-ink-soft">
          Porchlight is an AI property manager for owners with 1 to 10 rental units. Report a repair, check a
          quote, plan for big costs, and handle rent notices, all in one place.
        </p>
      </section>

      {state.role === "owner" ? (
        <OwnerView />
      ) : (
        <section aria-labelledby="role-heading" className="space-y-3">
          <h2 id="role-heading" className="text-xl font-extrabold">
            Who are you today?
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <RoleButton
              title="I am a tenant"
              body="Report a repair with photos and get help right away."
              onClick={() => {
                actions.setRole("tenant");
                router.push("/tenant/request");
              }}
            />
            <RoleButton
              title="I am an owner"
              body="See your property, review requests, and plan ahead."
              onClick={() => actions.setRole("owner")}
            />
          </div>
          <p className="text-sm text-ink-soft">
            Presenting the demo? Open the Demo guide at the top to jump to any of the 9 screens.
          </p>
        </section>
      )}
    </div>
  );
}
