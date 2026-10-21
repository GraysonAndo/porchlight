"use client";

import Link from "next/link";
import { CheckIcon } from "@/components/icons";
import { PlainCodeNote } from "@/components/Agent";
import { StepShell } from "@/components/StepShell";
import { Badge, Callout, Card, NumberField, PlaceholderNote } from "@/components/ui";
import { decideRepairOrReplace } from "@/lib/decision";
import { equipmentFor, heaterBeforeRepair } from "@/lib/equipment";
import { usd, usdRange } from "@/lib/format";
import { ageOf } from "@/lib/life";
import { TYPICAL_REPLACE_COST } from "@/lib/plan";
import { REPAIR_ESTIMATE, WATER_HEATER_JOB } from "@/lib/seed";
import { useDemo } from "@/lib/store";
import { useState } from "react";

export default function DecidePage() {
  const { state } = useDemo();
  const record = heaterBeforeRepair(state);
  const heater = equipmentFor(record, state.equipmentEdits)[0];
  // A repair price the owner was actually quoted can replace the sample one, to see if the advice changes.
  const [repair, setRepair] = useState(REPAIR_ESTIMATE);
  const [repairBad, setRepairBad] = useState(false);

  // Inputs for the rule. The failure mode comes from the triage on screen 2.
  const result = decideRepairOrReplace({
    item: heater.name,
    ageYears: ageOf(heater),
    typicalLifeYears: heater.typicalLifeYears,
    repairCost: repairBad ? REPAIR_ESTIMATE : repair,
    replaceCost: TYPICAL_REPLACE_COST,
    failureMode: state.request && state.request.photos.length === 0 ? "unknown leak" : "tank leak",
  });

  const replace = result.recommendation === "replace";
  const maxCost = Math.max(result.numbers.repairCost, result.numbers.replaceCost);

  return (
    <StepShell stepId="owner-decide">
      <div className="hero-ink">
        <p className="eyebrow !text-cream/70">Our recommendation</p>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <p className="text-5xl font-extrabold leading-none sm:text-6xl">{replace ? "Replace it" : "Repair it"}</p>
          <Badge tone={replace ? "urgent" : "good"}>{replace ? "REPLACE" : "REPAIR"}</Badge>
        </div>
        <ul className="mt-5 space-y-3 text-lg">
          {result.reasons.map((reason) => (
            <li key={reason} className="flex items-start gap-3">
              <span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-glow text-ink">
                <CheckIcon size={16} />
              </span>
              <span>{reason}</span>
            </li>
          ))}
        </ul>
      </div>

      <Card title="How we decided">
        <p className="mb-3 text-ink-soft">
          Replace if any one of these three rules is true. These are the actual rules, with the real numbers.
        </p>
        <div className="mb-3">
          <PlainCodeNote>This is arithmetic on the numbers below. The AI did not make this call.</PlainCodeNote>
        </div>
        <ol className="space-y-3">
          {result.checks.map((check, i) => (
            <li key={check.id} className="flex gap-3 rounded-xl bg-cream p-3">
              <span
                aria-hidden="true"
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ink text-sm font-extrabold text-cream"
              >
                {i + 1}
              </span>{" "}
              <div>
                <p className="font-bold">{check.rule}</p>
                <p>{check.detail}</p>
                <p className="mt-1">
                  <Badge tone={check.triggered ? "urgent" : "good"}>
                    {check.triggered ? "Triggered" : "Not triggered"}
                  </Badge>
                </p>
              </div>
            </li>
          ))}
        </ol>
        <p className="mt-3">
          <PlaceholderNote /> <span className="text-sm text-ink-soft">(typical life of {heater.typicalLifeYears} years)</span>
        </p>
      </Card>

      <Card title="Try your own repair price">
        <NumberField
          id="repair-estimate"
          label="Repair price you were quoted"
          prefix="$"
          step="any"
          min={1}
          value={repair}
          onChange={(v) => setRepair(Math.round(v * 100) / 100)}
          onEmptyChange={setRepairBad}
          validate={(v) => (v <= 0 ? "Enter more than $0." : v > 50000 ? "That is more than $50,000. Check the number." : null)}
          hint={<>Starts at the sample estimate of {usd(REPAIR_ESTIMATE)}. The three rules above update as you type.</>}
        />
      </Card>

      <Card title="Cost comparison">
        <div className="space-y-4">
          <div>
            <div className="flex items-baseline justify-between gap-3">
              <p className="font-bold">Repair estimate</p>
              <p className="text-lg font-extrabold">{usd(result.numbers.repairCost)}</p>
            </div>
            <div className="mt-1 h-5 rounded-full bg-cream-deep" role="img" aria-label={`Repair ${usd(result.numbers.repairCost)}`}>
              <div
                className="bar-grow h-full rounded-full bg-glow"
                style={{ width: `${(result.numbers.repairCost / maxCost) * 100}%` }}
              />
            </div>
            <p className="hint">
              A leaking tank cannot really be fixed, so this is a short-term patch at best.
            </p>
          </div>
          <div>
            <div className="flex items-baseline justify-between gap-3">
              <p className="font-bold">Replace (typical price, before any vendor is picked)</p>
              <p className="text-lg font-extrabold">{usd(result.numbers.replaceCost)}</p>
            </div>
            <div className="mt-1 h-5 rounded-full bg-cream-deep" role="img" aria-label={`Replace ${usd(result.numbers.replaceCost)}`}>
              <div
                className="bar-grow h-full rounded-full bg-ink"
                style={{ width: `${(result.numbers.replaceCost / maxCost) * 100}%` }}
              />
            </div>
            <p className="hint">
              Typical price range for this job: {usdRange(WATER_HEATER_JOB.marketTotal.low, WATER_HEATER_JOB.marketTotal.high)}.
            </p>
          </div>
        </div>
      </Card>

      <Callout tone="info" title="You decide">
        <p>GoHome recommends. The owner decides. Not sure about the numbers?</p>
        <p className="mt-2 flex flex-wrap gap-x-5 gap-y-1 font-bold">
          <Link href="/owner/quote" className="underline underline-offset-4">
            Add another quote (paste one you have)
          </Link>
          <Link href="/owner/record" className="underline underline-offset-4">
            Correct the heater&apos;s age in the home record
          </Link>
        </p>
      </Callout>
    </StepShell>
  );
}
