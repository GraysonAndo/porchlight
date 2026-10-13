"use client";

import { StepShell } from "@/components/StepShell";
import { Badge, Callout, Card, PlaceholderNote } from "@/components/ui";
import { decideRepairOrReplace } from "@/lib/decision";
import { equipmentFor } from "@/lib/equipment";
import { usd, usdRange } from "@/lib/format";
import { ageOf } from "@/lib/life";
import { BAYSIDE_QUOTE, REPAIR_ESTIMATE, WATER_HEATER_JOB } from "@/lib/seed";
import { useDemo } from "@/lib/store";

export default function DecidePage() {
  const { state } = useDemo();
  const heater = equipmentFor(state.houseRecord)[0];

  // Inputs for the rule. The failure mode comes from the triage on screen 2.
  const result = decideRepairOrReplace({
    item: heater.name,
    ageYears: ageOf(heater),
    typicalLifeYears: heater.typicalLifeYears,
    repairCost: REPAIR_ESTIMATE,
    replaceCost: BAYSIDE_QUOTE.total,
    failureMode: "tank leak",
  });

  const replace = result.recommendation === "replace";
  const maxCost = Math.max(result.numbers.repairCost, result.numbers.replaceCost);

  return (
    <StepShell step={6}>
      <Card className={replace ? "!border-ink" : ""}>
        <p className="text-sm font-bold uppercase tracking-wide text-ink-soft">Our recommendation</p>
        <div className="mt-1 flex flex-wrap items-center gap-3">
          <p className="text-4xl font-extrabold">{replace ? "Replace it" : "Repair it"}</p>
          <Badge tone={replace ? "urgent" : "good"}>{replace ? "REPLACE" : "REPAIR"}</Badge>
        </div>
        <ul className="mt-3 list-disc space-y-1 pl-6 text-lg">
          {result.reasons.map((reason) => (
            <li key={reason}>{reason}</li>
          ))}
        </ul>
      </Card>

      <Card title="How we decided">
        <p className="mb-3 text-ink-soft">
          Replace if any one of these three rules is true. These are the actual rules, with the real numbers.
        </p>
        <ol className="space-y-3">
          {result.checks.map((check, i) => (
            <li key={check.id} className="flex gap-3 rounded-xl bg-cream p-3">
              <span
                aria-hidden="true"
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ink text-sm font-extrabold text-cream"
              >
                {i + 1}
              </span>
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

      <Card title="Cost comparison">
        <div className="space-y-4">
          <div>
            <div className="flex items-baseline justify-between gap-3">
              <p className="font-bold">Repair estimate</p>
              <p className="text-lg font-extrabold">{usd(result.numbers.repairCost)}</p>
            </div>
            <div className="mt-1 h-5 rounded-full bg-cream-deep" role="img" aria-label={`Repair ${usd(result.numbers.repairCost)}`}>
              <div
                className="h-full rounded-full bg-glow"
                style={{ width: `${(result.numbers.repairCost / maxCost) * 100}%` }}
              />
            </div>
            <p className="hint">
              A leaking tank cannot really be fixed, so this is a short-term patch at best.
            </p>
          </div>
          <div>
            <div className="flex items-baseline justify-between gap-3">
              <p className="font-bold">Replace (Bayside quote)</p>
              <p className="text-lg font-extrabold">{usd(result.numbers.replaceCost)}</p>
            </div>
            <div className="mt-1 h-5 rounded-full bg-cream-deep" role="img" aria-label={`Replace ${usd(result.numbers.replaceCost)}`}>
              <div
                className="h-full rounded-full bg-ink"
                style={{ width: `${(result.numbers.replaceCost / maxCost) * 100}%` }}
              />
            </div>
            <p className="hint">
              Typical price range for this job: {usdRange(WATER_HEATER_JOB.marketTotal.low, WATER_HEATER_JOB.marketTotal.high)}.
            </p>
          </div>
        </div>
        <p className="mt-3">
          <PlaceholderNote /> <span className="text-sm text-ink-soft">(repair estimate, quote, and typical range)</span>
        </p>
      </Card>

      <Callout tone="info" title="You decide">
        <p>Porchlight recommends. The owner decides. You can still ask for a second opinion or a second quote.</p>
      </Callout>
    </StepShell>
  );
}
