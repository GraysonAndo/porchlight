"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { HomeIcon, KeyIcon, PlayIcon } from "@/components/icons";
import { LogoMark } from "@/components/Logo";
import { story } from "@/lib/story";
import { useDemo } from "@/lib/store";

function RoleCard({
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
      className="card card-lift group flex min-h-44 w-full cursor-pointer flex-col items-start gap-2 text-left"
    >
      <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-brand-tint text-brand">{icon}</span>
      <span className="text-2xl font-extrabold">{title}</span>
      <span className="text-ink-soft">{body}</span>
      <span className="mt-auto inline-flex items-center gap-1 pt-2 font-bold text-brand group-hover:underline">
        Continue <span aria-hidden="true">&rarr;</span>
      </span>
    </button>
  );
}

export default function GatePage() {
  const router = useRouter();
  const { state, actions, hydrated } = useDemo();

  function choose(role: "tenant" | "owner") {
    actions.setRole(role);
    router.push(role === "tenant" ? "/tenant" : "/owner");
  }

  return (
    <div className="flex flex-1 flex-col bg-gradient-to-b from-brand-tint/60 to-cream">
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center px-4 pb-16 pt-10 text-center sm:px-6">
        <LogoMark size={72} />
        <h1 className="mt-5 text-5xl font-extrabold leading-none tracking-tight sm:text-7xl">GoHome</h1>
        <p className="mt-3 text-xl text-ink-soft sm:text-2xl">Your home, made easy.</p>

        {hydrated && state.role && (
          <Link
            href={state.role === "tenant" ? "/tenant" : "/owner"}
            className="btn btn-primary btn-lg mt-8"
          >
            Welcome back. Continue as {state.role === "tenant" ? "a tenant" : "the owner"} <span aria-hidden="true">&rarr;</span>
          </Link>
        )}

        <p className={`${hydrated && state.role ? "mt-6" : "mt-10"} text-sm font-extrabold uppercase tracking-widest text-ink-soft`}>{hydrated && state.role ? "Or switch to" : "I am a"}</p>
        <div className="mt-3 grid w-full gap-4 sm:grid-cols-2">
          <RoleCard
            icon={<KeyIcon size={26} />}
            title="Tenant"
            body="Something needs fixing, or you have a question about your home."
            onClick={() => choose("tenant")}
          />
          <RoleCard
            icon={<HomeIcon size={26} />}
            title="Owner"
            body="See what needs your OK, and let GoHome take care of the rest."
            onClick={() => choose("owner")}
          />
        </div>

        <section aria-labelledby="how-heading" className="mt-8 w-full text-left">
          <h2 id="how-heading" className="text-center text-sm font-extrabold uppercase tracking-widest text-ink-soft">
            How it works
          </h2>
          <ol className="mt-3 grid gap-3 sm:grid-cols-3">
            {[
              ["A tenant texts a problem", "GoHome already knows the home, so it gives safe steps made for the exact equipment."],
              ["GoHome does the legwork", "It lines up plumbers, checks each quote, and sets a spending limit. Nobody waits on a phone call."],
              ["The owner taps once", "Or lets GoHome book small repairs on its own, under a limit the owner picks."],
            ].map(([title, body], i) => (
              <li key={title} className="rounded-2xl border border-line bg-white p-4">
                <span aria-hidden="true" className="mb-2 flex h-8 w-8 items-center justify-center rounded-full bg-brand-tint text-sm font-extrabold text-brand">
                  {i + 1}
                </span>
                <p className="font-extrabold">{title}</p>
                <p className="mt-1 text-sm text-ink-soft">{body}</p>
              </li>
            ))}
          </ol>
        </section>

        <div className="mt-8 w-full rounded-2xl border border-line bg-white p-5">
          <p className="font-extrabold">Just want to see it work?</p>
          <p className="mt-1 text-ink-soft">One button plays a whole repair by itself, switching between the tenant and the owner as it goes.</p>
          <button type="button" className="btn btn-secondary mt-3" onClick={() => story.start()}>
            <PlayIcon size={20} /> Play the whole story
          </button>
        </div>
      </div>

    </div>
  );
}
