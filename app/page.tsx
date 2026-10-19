"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { HomeIcon, KeyIcon } from "@/components/icons";
import { Logo, LogoMark } from "@/components/Logo";
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
  const { actions } = useDemo();

  function choose(role: "tenant" | "owner") {
    actions.setRole(role);
    router.push(role === "tenant" ? "/tenant" : "/owner");
  }

  return (
    <div className="flex flex-1 flex-col bg-gradient-to-b from-brand-tint/60 to-cream">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-4 sm:px-6">
        <Logo />
        <nav aria-label="More about GoHome" className="flex gap-1 text-sm font-bold">
          <Link href="/about" className="inline-flex min-h-11 items-center rounded-lg px-3 text-ink-soft hover:bg-white hover:text-ink">
            About
          </Link>
          <Link href="/pricing" className="inline-flex min-h-11 items-center rounded-lg px-3 text-ink-soft hover:bg-white hover:text-ink">
            Pricing
          </Link>
        </nav>
      </header>

      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center px-4 pb-16 pt-6 text-center sm:px-6">
        <LogoMark size={72} />
        <h1 className="mt-5 text-5xl font-extrabold leading-none tracking-tight sm:text-7xl">GoHome</h1>
        <p className="mt-3 text-xl text-ink-soft sm:text-2xl">Your home, made easy.</p>

        <p className="mt-10 text-sm font-extrabold uppercase tracking-widest text-ink-soft">I am a</p>
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
      </div>

      <p className="px-4 pb-6 text-center text-xs text-ink-soft">
        GoHome is a student project. All names and numbers are sample data.
      </p>
    </div>
  );
}
