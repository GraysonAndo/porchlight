"use client";

import { LifespanBar } from "@/components/Bars";
import { StepShell } from "@/components/StepShell";
import { CheckIcon } from "@/components/icons";
import { Badge, Callout, Card, PlaceholderNote } from "@/components/ui";
import { currentHeater, equipmentFor, heaterBeforeRepair } from "@/lib/equipment";
import { monthYear, usdRange } from "@/lib/format";
import { guidesForEquipment } from "@/lib/homeGuides";
import { ageOf, lifeStage } from "@/lib/life";
import { PROPERTY } from "@/lib/seed";
import { useDemo } from "@/lib/store";

export default function OwnerRecordPage() {
  const { state } = useDemo();
  const record = currentHeater(state);
  const replaced = state.jobCompletedAt !== null;
  const old = heaterBeforeRepair(state);
  const equipment = equipmentFor(record);

  return (
    <StepShell stepId="owner-record">
      <p className="text-lg text-ink-soft">
        Everything in {PROPERTY.address}, in one place. GoHome uses it to give your tenant exact, step-by-step help, and to plan what you will
        need to replace.
      </p>

      <Callout tone="info" title="You never have to type any of this">
        <p>
          Brand, model, and serial number were recorded at move-in from each data plate. When an installer finishes a job, the new equipment is
          added automatically.
        </p>
      </Callout>

      {replaced && (
        <Card title="History">
          <p className="flex items-start gap-2">
            <CheckIcon size={22} />
            <span>
              {old
                ? `The old water heater (${old.manufacturer} ${old.model}, serial ${old.serial}, made ${monthYear(old.manufactureDate)})`
                : "The old water heater"}{" "}
              was replaced. The new one was added automatically, and the 5-year forecast was updated.
            </span>
          </p>
        </Card>
      )}

      <ul className="grid gap-4 md:grid-cols-2">
        {equipment.map((item) => {
          const age = ageOf(item);
          const s = lifeStage(age, item.typicalLifeYears);
          const guides = guidesForEquipment(item.id);
          return (
            <li key={item.id} className="card space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-xl font-extrabold">{item.name}</p>
                  <p className="font-bold text-brand">
                    {item.brand} {item.model}
                  </p>
                </div>
                <span className="flex flex-wrap gap-1.5">
                  {item.id === "water-heater" && replaced && <Badge tone="good">New, added automatically</Badge>}
                  <Badge tone={s.tone}>{s.label}</Badge>
                </span>
              </div>
              <dl className="grid grid-cols-[6.5rem_1fr] gap-y-1 text-sm">
                <dt className="font-bold text-ink-soft">What</dt>
                <dd>{item.summary}</dd>
                <dt className="font-bold text-ink-soft">Where</dt>
                <dd>{item.location}</dd>
                <dt className="font-bold text-ink-soft">Serial</dt>
                <dd>{item.serial}</dd>
                <dt className="font-bold text-ink-soft">Installed</dt>
                <dd>
                  {item.installYear} ({age === 0 ? "brand new" : `${age} years old`})
                </dd>
                <dt className="font-bold text-ink-soft">Replace</dt>
                <dd>{usdRange(item.replaceLow, item.replaceHigh)}</dd>
              </dl>
              <div>
                <LifespanBar ageYears={age} typicalLifeYears={item.typicalLifeYears} tone={s.tone} compact />
                <p className="mt-1 text-xs text-ink-soft">
                  {age === 0 ? "New" : `${age} of ${item.typicalLifeYears} typical years`} ({s.percentOfLife}% of life)
                </p>
              </div>
              <p className="text-sm text-ink-soft">
                <strong className="text-ink">How we know:</strong> {item.source}.{" "}
                {guides.length > 0
                  ? `Your tenant has ${guides.length} picture ${guides.length === 1 ? "guide" : "guides"} for this item.`
                  : "No tenant guide needed."}
              </p>
            </li>
          );
        })}
      </ul>
      <p>
        <PlaceholderNote /> <span className="text-sm text-ink-soft">(typical life and replace cost)</span>
      </p>
    </StepShell>
  );
}
