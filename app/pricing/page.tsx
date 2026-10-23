"use client";

import Link from "next/link";
import { ArrowUpIcon, CheckIcon, ClockIcon } from "@/components/icons";
import { Badge, PlaceholderNote } from "@/components/ui";
import { useDemo } from "@/lib/store";
import { useState } from "react";

type Pick = "starter" | "plus" | "pro";

/** A feature is live, planned ("soon"), or a hint about what the next tier adds. */
type Feature = string | { text: string; soon?: true; hint?: true };

const TIERS: { id: Pick; name: string; price: number; line: string; features: Feature[] }[] = [
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
      { text: "Upgrade to Plus for quote checks", hint: true },
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
      "Rent increase checks and notice drafts, ready for you to send (California)",
      "Quote audit with a drafted counter-offer",
      { text: "Updates by text, and a call to you for emergencies", soon: true },
    ],
  },
];

// GoHome is built for owners with 1 to 10 units.
const MIN_UNITS = 1;
const MAX_UNITS = 10;

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
          Pay per unit per month. Month to month, cancel any time. California only, for now. Nothing is charged right now,
          and we are testing which tier makes sense. Tell us which you would pick.
        </p>
        <p className="mt-2">
          <PlaceholderNote />{" "}
          <span className="text-sm text-ink-soft">(prices and what is in each tier, for a pricing test)</span>
        </p>
      </div>

      <section className="card" aria-labelledby="units-heading">
        <h2 id="units-heading" className="text-lg font-extrabold">
          <label htmlFor="units-slider">How many units do you own?</label>
        </h2>
        <div className="mt-2 flex items-center gap-4">
          <div className="w-full max-w-xs">
            <input
              id="units-slider"
              type="range"
              min={MIN_UNITS}
              max={MAX_UNITS}
              step={1}
              value={units}
              onChange={(e) => setUnits(Number(e.target.value))}
              aria-valuetext={`${units} ${units === 1 ? "unit" : "units"}`}
              className="h-11 w-full cursor-pointer accent-brand"
            />
            <div className="-mt-2 flex justify-between text-xs text-ink-soft" aria-hidden="true">
              <span>{MIN_UNITS}</span>
              <span>{MAX_UNITS}</span>
            </div>
          </div>
          <p className="min-w-[5.5rem] whitespace-nowrap text-xl font-extrabold tabular-nums" aria-hidden="true">
            {units} {units === 1 ? "unit" : "units"}
          </p>
        </div>
      </section>

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
              <p className="mt-1 text-sm text-ink-soft">
                <span className="font-bold text-ink tabular-nums">${t.price * units}</span>
                {` a month for ${units} ${units === 1 ? "unit" : "units"}`}
                <span className="block tabular-nums">${(t.price * units * 12).toLocaleString()} a year</span>
              </p>
              <p className="mt-2 text-ink-soft">{t.line}</p>
              <ul className="mt-3 flex-1 space-y-2">
                {t.features.map((f) => {
                  const feature = typeof f === "string" ? { text: f } : f;
                  const soon = "soon" in feature && feature.soon;
                  const hint = "hint" in feature && feature.hint;
                  return (
                    <li key={feature.text} className={`flex items-start gap-2 text-sm ${soon || hint ? "text-ink-soft" : ""}`}>
                      <span className={`mt-0.5 shrink-0 ${soon || hint ? "text-ink-soft" : "text-good-ink"}`}>
                        {soon ? <ClockIcon size={18} /> : hint ? <ArrowUpIcon size={18} /> : <CheckIcon size={18} />}
                      </span>
                      <span>
                        {soon && <Badge tone="neutral" icon={false}>Coming soon</Badge>} {feature.text}
                      </span>
                    </li>
                  );
                })}
              </ul>
              <button
                type="button"
                className={`btn mt-4 ${chosen ? "btn-primary" : "btn-secondary"}`}
                aria-pressed={chosen}
                onClick={() => actions.setPricingPick(t.id)}
              >
                {chosen ? `✓ You picked ${t.name}` : `I would pick ${t.name}`}
              </button>
              {/* The space is always there, so the buttons line up whether or not a tier is picked. */}
              <p className="mt-2 flex min-h-11 flex-wrap items-center gap-2 text-sm">
                {chosen && (
                  <>
                    <Badge tone="good">Saved on this device</Badge>
                    <button type="button" className="inline-flex min-h-11 items-center font-bold underline underline-offset-4" onClick={() => actions.setPricingPick(null)}>
                      Clear my pick
                    </button>
                  </>
                )}
              </p>
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
          Your pick is saved on this device and shows on the{" "}
          <Link href="/feedback" className="font-bold underline underline-offset-4">
            feedback notes
          </Link>{" "}
          page.
        </p>
      </div>
    </div>
  );
}
