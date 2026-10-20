"use client";

import Link from "next/link";
import { CheckIcon } from "@/components/icons";
import { Badge, PlaceholderNote } from "@/components/ui";
import { useDemo } from "@/lib/store";
import { useState } from "react";

type Pick = "starter" | "plus" | "pro";

const TIERS: { id: Pick; name: string; price: number; line: string; features: string[] }[] = [
  {
    id: "starter",
    name: "Starter",
    price: 4,
    line: "Know your home, and handle problems the same night.",
    features: [
      "A home record with the model of everything, kept up to date",
      "Tenant repair reports with photos",
      "Triage with emergency rules and safe steps",
      "Tenant questions answered from the record and lease",
    ],
  },
  {
    id: "plus",
    name: "Plus",
    price: 6,
    line: "Spend with confidence, in one tap.",
    features: [
      "Everything in Starter",
      "Quote check: fair, high, or low, with the range",
      "Repair or replace recommendation, with the rule shown",
      "One-tap approve and booking",
      "5-year forecast with a monthly set-aside",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    price: 8,
    line: "GoHome watches the details for you.",
    features: [
      "Everything in Plus",
      "Rent increase checks, notice drafts, and sending the notice (California)",
      "Quote audit with a drafted counter-offer",
      "Coming in the full product: updates by text, and a call to you for emergencies",
    ],
  },
];

export default function PricingPage() {
  const { state, actions } = useDemo();
  const pick = state.pricingPick;
  // Landlords have 1 to 10 units, so the price is also shown for the whole portfolio.
  const [units, setUnits] = useState(1);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <p className="eyebrow mb-2">Pricing</p>
        <h1 className="font-display text-4xl font-extrabold leading-tight sm:text-5xl">Simple pricing, per unit</h1>
        <p className="mt-3 max-w-2xl text-lg text-ink-soft">
          Pay per unit, per month. Month to month, cancel any time. California only, for now. Nothing is charged right now,
          and we are testing which tier makes sense. Tell us which you would pick.
        </p>
        <p className="mt-2">
          <PlaceholderNote />{" "}
          <span className="text-sm text-ink-soft">(prices and what is in each tier, for a pricing test)</span>
        </p>
      </div>

      <fieldset className="card">
        <legend className="label px-1">How many units do you own?</legend>
        <div className="flex flex-wrap gap-2" role="radiogroup">
          {[1, 5, 10].map((n) => (
            <label
              key={n}
              className={`flex min-h-11 cursor-pointer items-center rounded-xl border-2 px-4 font-bold has-[:focus-visible]:outline has-[:focus-visible]:outline-[3px] has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ink ${
                units === n ? "border-ink bg-glow" : "border-line bg-white"
              }`}
            >
              <input type="radio" name="units" className="sr-only" checked={units === n} onChange={() => setUnits(n)} />
              {n} {n === 1 ? "unit" : "units"}
            </label>
          ))}
        </div>
      </fieldset>

      <ul className="grid gap-4 md:grid-cols-3">
        {TIERS.map((t) => {
          const chosen = pick === t.id;
          return (
            <li key={t.id} className={`card flex flex-col ${chosen ? "!border-ink ring-4 ring-glow" : ""}`}>
              <h2 className="font-display text-2xl font-extrabold">{t.name}</h2>
              <p className="mt-1">
                <span className="text-4xl font-extrabold">${t.price}</span>
                <span className="text-ink-soft">{" per unit per month"}</span>
              </p>
              {units > 1 && (
                <p className="mt-1 font-bold">
                  ${t.price * units} a month for {units} units (${t.price * units * 12} a year)
                </p>
              )}
              {units === 1 && <p className="mt-1 text-sm text-ink-soft">${t.price * 12} a year for one unit</p>}
              <p className="mt-2 text-ink-soft">{t.line}</p>
              <ul className="mt-3 flex-1 space-y-2">
                {t.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm">
                    <span className="mt-0.5 shrink-0 text-good-ink">
                      <CheckIcon size={18} />
                    </span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                className={`btn mt-4 ${chosen ? "btn-primary" : "btn-secondary"}`}
                aria-pressed={chosen}
                onClick={() => actions.setPricingPick(t.id)}
              >
                {chosen ? "✓ I would pick this" : `I would pick ${t.name}`}
              </button>
              {chosen && (
                <p className="mt-2 flex flex-wrap items-center gap-2 text-sm">
                  <Badge tone="good">Saved on this device</Badge>
                  <button type="button" className="inline-flex min-h-11 items-center font-bold underline underline-offset-4" onClick={() => actions.setPricingPick(null)}>
                    Clear my pick
                  </button>
                </p>
              )}
            </li>
          );
        })}
      </ul>

      <div className="card">
        <p className="font-bold">None of these feel right?</p>
        <p className="text-ink-soft">That is useful to know. Say so, and tell us what would be worth paying for.</p>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button
            type="button"
            className={`btn ${pick === "none" ? "btn-primary" : "btn-secondary"}`}
            aria-pressed={pick === "none"}
            onClick={() => actions.setPricingPick("none")}
          >
            {pick === "none" ? "✓ None of these" : "None of these"}
          </button>
          {pick === "none" && (
            <>
              <Badge tone="good">Saved on this device</Badge>
              <button type="button" className="btn btn-ghost" onClick={() => actions.setPricingPick(null)}>
                Clear my pick
              </button>
            </>
          )}
        </div>
        <p className="mt-3 text-sm text-ink-soft">
          Your pick shows up on the{" "}
          <Link href="/feedback" className="font-bold underline underline-offset-4">
            feedback notes
          </Link>{" "}
          page. Use the &quot;Send feedback&quot; link at the bottom of the page to say why.
        </p>
      </div>
    </div>
  );
}
