"use client";

import { LifespanBar } from "@/components/Bars";
import { EquipmentEditor } from "@/components/EquipmentEditor";
import { StepShell } from "@/components/StepShell";
import { CheckIcon } from "@/components/icons";
import { Badge, Callout, Card, PlaceholderNote } from "@/components/ui";
import { heaterBeforeRepair } from "@/lib/equipment";
import { monthYear, usdRange } from "@/lib/format";
import { guidesForEquipment } from "@/lib/homeGuides";
import { ageOf, lifeStage } from "@/lib/life";
import { PROPERTY } from "@/lib/seed";
import { useDemo } from "@/lib/store";
import { useEquipment } from "@/lib/useEquipment";
import { useState } from "react";

export default function OwnerRecordPage() {
  const { state, actions } = useDemo();
  const [editing, setEditing] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const replaced = state.jobCompletedAt !== null;
  const old = heaterBeforeRepair(state);
  const equipment = useEquipment();

  return (
    <StepShell stepId="owner-record">
      <p className="text-lg text-ink-soft">
        Everything in {PROPERTY.address}, in one place. GoHome uses it to give your tenant exact, step-by-step help, and to plan what you will
        need to replace.
      </p>

      <Callout tone="info" title="Already filled in for you">
        <p>
          Brand, model, and serial number were recorded at move-in from each data plate, and new equipment is added automatically when an
          installer finishes a job. If something was misread, tap Edit on that item to correct it.
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
          const guides = guidesForEquipment(item.id, equipment);
          const corrected = Boolean(state.equipmentEdits[item.id]);
          return (
            <li key={item.id} className="card space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-xl font-extrabold">{item.name}</p>
                  <p className="font-bold text-ink">
                    {item.brand} {item.model}
                  </p>
                </div>
                <span className="flex flex-wrap gap-1.5">
                  {item.id === "water-heater" && replaced && <Badge tone="good">New, added automatically</Badge>}
                  {corrected && <Badge tone="info">Corrected by you</Badge>}
                  <Badge tone={s.tone}>{s.label}</Badge>
                </span>
              </div>
              <dl className="grid grid-cols-[6.5rem_1fr] gap-y-1 text-sm">
                <dt className="font-bold text-ink-soft">What</dt>
                <dd>{item.summary}</dd>
                <dt className="font-bold text-ink-soft">Where</dt>
                <dd>{item.location}</dd>
                <dt className="font-bold text-ink-soft">{/^lot\b/i.test(item.serial) ? "Lot number" : "Serial"}</dt>
                <dd>{item.serial.replace(/^lot\s*/i, "")}</dd>
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
              {editing === item.id ? (
                <EquipmentEditor
                  item={item}
                  corrected={corrected}
                  onCancel={() => setEditing(null)}
                  onReset={() => {
                    actions.saveEquipmentEdit(item.id, null);
                    setEditing(null);
                    setSaved(`${item.name}: the recorded details are back.`);
                  }}
                  onSave={(edit) => {
                    actions.saveEquipmentEdit(item.id, edit);
                    setEditing(null);
                    setSaved(`${item.name} updated. Your tenant now sees the corrected details and guides.`);
                  }}
                />
              ) : (
                <button type="button" className="btn btn-secondary !min-h-10 text-sm" onClick={() => { setEditing(item.id); setSaved(null); }}>
                  Edit details
                </button>
              )}
              {saved?.startsWith(item.name) && (
                <p role="status" className="text-sm font-bold text-good-ink">
                  {saved}
                </p>
              )}
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
