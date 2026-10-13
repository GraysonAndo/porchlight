"use client";

import Link from "next/link";
import { LifespanBar } from "@/components/Bars";
import { PhotoThumb } from "@/components/PhotoPicker";
import { StepShell } from "@/components/StepShell";
import { Badge, Card, PlaceholderNote } from "@/components/ui";
import { equipmentFor } from "@/lib/equipment";
import { monthYear, usdRange } from "@/lib/format";
import { ageOf, lifeStage } from "@/lib/life";
import { useDemo } from "@/lib/store";

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-cream p-3">
      <dt className="text-sm font-bold text-ink-soft">{label}</dt>
      <dd className="text-lg font-bold">{children}</dd>
    </div>
  );
}

export default function RecordPage() {
  const { state } = useDemo();
  const record = state.houseRecord;
  const equipment = equipmentFor(record);
  const heater = equipment[0];
  const others = equipment.slice(1);
  const heaterAge = ageOf(heater);
  const stage = lifeStage(heaterAge, heater.typicalLifeYears);

  return (
    <StepShell step={4}>
      <Card
        title={
          <span className="flex flex-wrap items-center gap-3">
            Water heater
            <Badge tone={stage.tone}>{stage.label}</Badge>
          </span>
        }
      >
        {record ? (
          <div className="grid gap-5 md:grid-cols-[1fr_16rem]">
            <dl className="grid gap-3 sm:grid-cols-2">
              <Fact label="Manufacturer">{record.manufacturer}</Fact>
              <Fact label="Model">{record.model}</Fact>
              <Fact label="Serial number">
                {record.serial}
                {record.unconfirmed.includes("serial") && (
                  <span className="ml-2 align-middle">
                    <Badge tone="caution">Not confirmed</Badge>
                  </span>
                )}
              </Fact>
              <Fact label="Capacity">{record.capacityGallons} gallons</Fact>
              <Fact label="Fuel type">{record.fuelType}</Fact>
              <Fact label="Manufactured">{monthYear(record.manufactureDate)}</Fact>
            </dl>
            {record.photo && (
              <div>
                <PhotoThumb photo={record.photo} className="aspect-[3/2] w-full" />
                <p className="hint">The label photo you saved.</p>
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-xl bg-cream p-4">
            <p className="font-bold">The label has not been read yet.</p>
            <p className="text-ink-soft">
              We only know the sample install year ({heater.installYear}). Read the label to fill in the brand,
              model, and serial number.
            </p>
            <Link href="/label" className="btn btn-secondary mt-3">
              Read the equipment label
            </Link>
          </div>
        )}

        <div className="mt-5">
          <h3 className="text-lg font-extrabold">How old is it?</h3>
          <p className="mb-3">
            <strong>{heaterAge} years old</strong>, against a typical life of {heater.typicalLifeYears} years (
            {stage.percentOfLife}% of typical life).
          </p>
          <LifespanBar ageYears={heaterAge} typicalLifeYears={heater.typicalLifeYears} tone={stage.tone} />
          <p className="mt-2">
            <PlaceholderNote /> <span className="text-sm text-ink-soft">(typical life)</span>
          </p>
        </div>
      </Card>

      <Card title="Everything else in the house">
        <ul className="divide-y divide-line">
          {others.map((item) => {
            const age = ageOf(item);
            const s = lifeStage(age, item.typicalLifeYears);
            return (
              <li key={item.id} className="grid gap-2 py-3 sm:grid-cols-[1fr_12rem_auto] sm:items-center sm:gap-4">
                <div>
                  <p className="font-bold">{item.name}</p>
                  <p className="text-sm text-ink-soft">
                    Installed {item.installYear}. Age {age} years. Typical life {item.typicalLifeYears} years.
                    Replace {usdRange(item.replaceLow, item.replaceHigh)}.
                  </p>
                </div>
                <LifespanBar ageYears={age} typicalLifeYears={item.typicalLifeYears} tone={s.tone} compact />
                <Badge tone={s.tone}>{s.label}</Badge>
              </li>
            );
          })}
        </ul>
        <p className="mt-3">
          <PlaceholderNote /> <span className="text-sm text-ink-soft">(typical life and replace cost)</span>
        </p>
      </Card>
    </StepShell>
  );
}
