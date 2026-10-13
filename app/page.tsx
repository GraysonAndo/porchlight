"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChartIcon,
  DocIcon,
  HomeIcon,
  KeyIcon,
  RobotIcon,
  ScaleIcon,
  TagIcon,
  WrenchIcon,
} from "@/components/icons";
import { LogoMark } from "@/components/Logo";
import { useDemo } from "@/lib/store";

function RoleButton({
  icon,
  title,
  body,
  steps,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  steps: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="card card-lift group flex min-h-40 w-full cursor-pointer flex-col items-start gap-1 text-left hover:border-ink"
    >
      <span className="mb-1 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-glow-tint text-ink">
        {icon}
      </span>
      <span className="font-display text-2xl font-extrabold">{title}</span>
      <span className="text-ink-soft">{body}</span>
      <span className="text-sm font-bold text-ink-soft">{steps}</span>
      <span className="mt-2 font-bold underline underline-offset-4 group-hover:text-glow-deep">Choose</span>
    </button>
  );
}

const WHO = [
  {
    icon: <KeyIcon size={26} />,
    title: "The tenant",
    body: "Lives in the home. Reports a problem and stays safe. Does not choose or pay for the repair.",
  },
  {
    icon: <HomeIcon size={26} />,
    title: "The owner",
    body: "Owns the home. Reviews the request, compares quotes, and decides what to spend. This is you.",
  },
  {
    icon: <RobotIcon size={26} />,
    title: "Porchlight",
    body: "The AI property manager in the middle. Sorts urgency, keeps the house record, checks quotes, and does the legwork.",
  },
];

const FEATURES = [
  { icon: <WrenchIcon />, title: "Report a repair", body: "Photos in, a clear urgency and safe next steps out." },
  { icon: <HomeIcon />, title: "A house record that fills itself", body: "New installs are recorded automatically, with brand, model, and serial number." },
  { icon: <TagIcon />, title: "Check any quote", body: "See if a price is fair and what to ask the vendor." },
  { icon: <ScaleIcon />, title: "Repair or replace", body: "A simple rule, shown openly, so you can trust it." },
  { icon: <ChartIcon />, title: "Plan 5 years ahead", body: "Know what will wear out and what to set aside." },
  { icon: <DocIcon />, title: "Rent notices", body: "Check the California cap and draft the notice." },
];

export default function HomePage() {
  const router = useRouter();
  const { state, actions } = useDemo();

  return (
    <div className="mx-auto max-w-4xl space-y-10">
      <section className="grid items-center gap-6 pt-2 md:grid-cols-[1fr_auto]">
        <div>
          <p className="eyebrow mb-2">For owners with 1 to 10 rentals</p>
          <h1 className="font-display text-4xl font-extrabold leading-[1.05] sm:text-6xl">Your rental, looked after.</h1>
          <p className="mt-4 max-w-xl text-lg text-ink-soft">
            Porchlight is an AI property manager for small landlords. It keeps a record of everything in the home,
            handles repair requests from your tenant, checks quotes, and helps you plan for big costs, without paying a
            full management company.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link href="/owner" className="btn btn-primary btn-lg" onClick={() => actions.setRole("owner")}>
              Start as the owner
            </Link>
            <a href="#role-heading" className="btn btn-ghost">
              Or choose a role
            </a>
          </div>
        </div>
        <div className="relative hidden h-52 w-52 items-center justify-center md:flex" aria-hidden="true">
          <span className="glow-pulse absolute inset-0 rounded-full bg-glow/30 blur-2xl" />
          <span className="relative">
            <LogoMark size={150} />
          </span>
        </div>
      </section>

      <section aria-labelledby="who-heading" className="space-y-3">
        <h2 id="who-heading" className="font-display text-2xl font-extrabold">
          Who is who
        </h2>
        <ul className="grid gap-3 md:grid-cols-3">
          {WHO.map((w) => (
            <li key={w.title} className="card flex gap-3 !p-4">
              <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-glow-tint">{w.icon}</span>
              <span>
                <span className="block font-extrabold">{w.title}</span>
                <span className="text-sm text-ink-soft">{w.body}</span>
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="role-heading" className="space-y-3">
        <h2 id="role-heading" className="scroll-mt-4 font-display text-2xl font-extrabold">
          Who are you today?
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <RoleButton
            icon={<HomeIcon size={28} />}
            title="I am an owner"
            body="Review a repair request, check the house record, compare a quote, and approve a plumber."
            steps="5 screens, plus planning tools"
            onClick={() => {
              actions.setRole("owner");
              router.push("/owner");
            }}
          />
          <RoleButton
            icon={<KeyIcon size={28} />}
            title="I am a tenant"
            body="Report a problem, get simple safety steps, and follow the progress."
            steps="3 screens"
            onClick={() => {
              actions.setRole("tenant");
              router.push("/tenant/request");
            }}
          />
        </div>
        {state.role && (
          <p className="text-sm font-bold">
            You were last using Porchlight as {state.role === "owner" ? "an owner" : "a tenant"}.{" "}
            <Link
              href={state.role === "owner" ? "/owner" : "/tenant/request"}
              className="underline underline-offset-4"
            >
              Continue as {state.role === "owner" ? "owner" : "tenant"}
            </Link>
          </p>
        )}
        <p className="text-sm text-ink-soft">
          Presenting? A good order: the tenant reports the leak (2 minutes), then switch to the owner to decide. Or start
          as the owner, where a sample request is already waiting. The Demo guide at the top jumps to any screen.
        </p>
      </section>

      <section aria-labelledby="features-heading" className="space-y-4">
        <h2 id="features-heading" className="font-display text-2xl font-extrabold">
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
