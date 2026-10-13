"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CameraIcon,
  ChartIcon,
  DocIcon,
  HomeIcon,
  KeyIcon,
  ScaleIcon,
  TagIcon,
  WrenchIcon,
} from "@/components/icons";
import { LogoMark } from "@/components/Logo";
import { Badge, Card } from "@/components/ui";
import { PROPERTY, EQUIPMENT } from "@/lib/seed";
import { usd } from "@/lib/format";
import { useDemo } from "@/lib/store";

function RoleButton({
  icon,
  title,
  body,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="card card-lift group flex min-h-36 w-full cursor-pointer flex-col items-start gap-1 text-left hover:border-ink"
    >
      <span className="mb-1 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-glow-tint text-ink">
        {icon}
      </span>
      <span className="text-2xl font-extrabold">{title}</span>
      <span className="text-ink-soft">{body}</span>
      <span className="mt-2 font-bold underline underline-offset-4 group-hover:text-glow-deep">Choose</span>
    </button>
  );
}

const FEATURES = [
  { icon: <WrenchIcon />, title: "Report a repair", body: "Photos in, a clear urgency and safe next steps out." },
  { icon: <CameraIcon />, title: "Read equipment labels", body: "Snap the label. Brand, model, and age fill in." },
  { icon: <TagIcon />, title: "Check any quote", body: "See if a price is fair and what to ask the vendor." },
  { icon: <ScaleIcon />, title: "Repair or replace", body: "A simple rule, shown openly, so you can trust it." },
  { icon: <ChartIcon />, title: "Plan 5 years ahead", body: "Know what will wear out and what to set aside." },
  { icon: <DocIcon />, title: "Rent notices", body: "Check the California cap and draft the notice." },
];

function OwnerView() {
  const router = useRouter();
  const { state, actions } = useDemo();
  const request = state.request;
  const urgency = state.triage?.urgency;

  return (
    <div className="reveal space-y-5">
      <Card
        title={
          <span className="flex flex-wrap items-center gap-2">
            Your property <Badge tone="neutral" icon={false}>{PROPERTY.units} unit</Badge>
          </span>
        }
      >
        <div className="flex items-start gap-3">
          <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-glow-tint">
            <HomeIcon />
          </span>
          <div>
            <p className="text-lg font-bold">{PROPERTY.address}</p>
            <p className="text-ink-soft">
              {PROPERTY.kind}. Tenant since {PROPERTY.tenantSince}. Rent {usd(PROPERTY.rent)} per month.
            </p>
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl bg-cream p-4">
            <p className="eyebrow">Open repair request</p>
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

          <div className="rounded-2xl bg-cream p-4">
            <p className="eyebrow">House record</p>
            <p className="mt-1 text-4xl font-extrabold">{EQUIPMENT.length}</p>
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
    <div className="mx-auto max-w-4xl space-y-10">
      <section className="grid items-center gap-6 pt-2 md:grid-cols-[1fr_auto]">
        <div>
          <p className="eyebrow mb-2">For owners with 1 to 10 rentals</p>
          <h1 className="text-4xl font-extrabold leading-[1.05] sm:text-6xl">Your rental, looked after.</h1>
          <p className="mt-4 max-w-xl text-lg text-ink-soft">
            Porchlight is an AI property manager for small landlords. Report a repair, check a quote, plan for big
            costs, and handle rent notices, all in one place, without paying a full management company.
          </p>
          {state.role !== "owner" && (
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link href="/tenant/request" className="btn btn-primary btn-lg">
                Start the 9 step demo
              </Link>
              <a href="#role-heading" className="btn btn-ghost">
                Or choose a role
              </a>
            </div>
          )}
        </div>
        <div className="relative hidden h-52 w-52 items-center justify-center md:flex" aria-hidden="true">
          <span className="glow-pulse absolute inset-0 rounded-full bg-glow/30 blur-2xl" />
          <span className="relative">
            <LogoMark size={150} />
          </span>
        </div>
      </section>

      {state.role === "owner" ? (
        <OwnerView />
      ) : (
        <section aria-labelledby="role-heading" className="space-y-3">
          <h2 id="role-heading" className="scroll-mt-4 text-2xl font-extrabold">
            Who are you today?
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <RoleButton
              icon={<KeyIcon size={28} />}
              title="I am a tenant"
              body="Report a repair with photos and get help right away."
              onClick={() => {
                actions.setRole("tenant");
                router.push("/tenant/request");
              }}
            />
            <RoleButton
              icon={<HomeIcon size={28} />}
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

      <section aria-labelledby="features-heading" className="space-y-4">
        <h2 id="features-heading" className="text-2xl font-extrabold">
          What Porchlight does for you
        </h2>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <li key={f.title} className="card flex gap-3 !p-4">
              <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-ink text-glow">
                {f.icon}
              </span>
              <span>
                <span className="block font-extrabold leading-snug">{f.title}</span>
                <span className="text-sm text-ink-soft">{f.body}</span>
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
