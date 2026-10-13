"use client";

import Link from "next/link";
import { LifespanBar } from "@/components/Bars";
import { PhotoThumb } from "@/components/PhotoPicker";
import { StepShell } from "@/components/StepShell";
import { BoxIcon, CheckIcon } from "@/components/icons";
import { Badge, Callout, Card, PlaceholderNote } from "@/components/ui";
import { currentHeater, equipmentFor, heaterBeforeRepair } from "@/lib/equipment";
import { monthYear, usdRange } from "@/lib/format";
import { ageOf, lifeStage } from "@/lib/life";
import { PROPERTY } from "@/lib/seed";
import { useDemo } from "@/lib/store";

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-cream p-3">
      <dt className="text-sm font-bold text-ink-soft">{label}</dt>
      <dd className="text-lg font-bold">{children}</dd>
    </div>
  );
}

export default function OwnerRecordPage() {
  const { state } = useDemo();
  const record = currentHeater(state);
  const replaced = state.jobCompletedAt !== null;
  const old = heaterBeforeRepair(state);
  const equipment = equipmentFor(record);
  const heater = equipment[0];
  const others = equipment.slice(1);
  const heaterAge = ageOf(heater);
  const stage = lifeStage(heaterAge, heater.typicalLifeYears);

  return (
    <StepShell stepId="owner-record">
      <Callout tone="info" title="You do not have to type any of this">
        <p>
          Porchlight builds this record for you. The first label photo (from your tenant, or from you) fills in the
          brand, model, serial number, size, and fuel type. After that, new equipment is registered by the installer
          automatically, so the record keeps itself up to date.
        </p>
      </Callout>

      <Card
        title={
          <span className="flex flex-wrap items-center gap-3">
            Water heater
            <Badge tone={stage.tone}>{stage.label}</Badge>
            {replaced && <Badge tone="good">New, added automatically</Badge>}
            {!replaced && record && record.verified && <Badge tone="good">Checked against a label</Badge>}
            {!record && <Badge tone="caution">Details missing</Badge>}
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
                <p className="hint">The label photo this was read from.</p>
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-2xl bg-caution-tint/70 p-4">
            <p className="text-lg font-extrabold">Brand, model, and serial number are not on file yet</p>
            <p className="mt-1">
              The home inspection only says &quot;water heater, about {heater.installYear}&quot;.{" "}
              {state.tenantSkippedLabel
                ? `${PROPERTY.tenant} could not reach the label, so please add the details yourself.`
                : state.request
                  ? `Porchlight asked ${PROPERTY.tenant} for a photo of the label. It will appear here once they send it.`
                  : "A photo of the label fills this in. Porchlight asks the tenant for it the first time something goes wrong."}
            </p>
            <Link href="/owner/label" className="btn btn-secondary mt-3">
              Add the details myself
            </Link>
          </div>
        )}

        <p className="mt-3 flex items-start gap-2 text-sm text-ink-soft">
          <BoxIcon size={20} />
          <span>
            <strong className="text-ink">How we know this:</strong> {record ? record.source : heater.source}
          </span>
        </p>

        <div className="mt-5">
          <h3 className="text-lg font-extrabold">How old is it?</h3>
          <p className="mb-3">
            <strong>{heaterAge === 0 ? "Brand new" : `${heaterAge} years old${record ? "" : " (estimate)"}`}</strong>, against a typical
            life of {heater.typicalLifeYears} years ({stage.percentOfLife}% of typical life).
          </p>
          <LifespanBar ageYears={heaterAge} typicalLifeYears={heater.typicalLifeYears} tone={stage.tone} />
          <p className="mt-2">
            <PlaceholderNote /> <span className="text-sm text-ink-soft">(typical life)</span>
          </p>
        </div>
      </Card>

      {replaced && (
        <Card title="History">
          <p className="flex items-start gap-2">
            <CheckIcon size={22} />
            <span>
              {old
                ? `The old water heater (${old.manufacturer} ${old.model}, serial ${old.serial}, made ${monthYear(old.manufactureDate)})`
                : "The old water heater (about 2015, brand and model were never recorded)"}{" "}
              was replaced. It was marked replaced automatically, and the 5-year forecast was updated.
            </span>
          </p>
        </Card>
      )}

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
                    Installed {item.installYear}. Age {age} years. Typical life {item.typicalLifeYears} years. Replace{" "}
                    {usdRange(item.replaceLow, item.replaceHigh)}.
                  </p>
                  <p className="text-sm text-ink-soft">Source: {item.source}.</p>
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

      <Card title="Something missing or wrong?">
        <p>
          Equipment installed before Porchlight, or installed without a registration, may not be in the record. For
          those, you can photograph the label (or type the details in) and Porchlight will add it or check it against
          what is on file.
        </p>
        <Link href="/owner/label" className="btn btn-secondary mt-3">
          Add or check equipment details
        </Link>
      </Card>
    </StepShell>
  );
}
