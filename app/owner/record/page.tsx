"use client";

import { LifespanBar } from "@/components/Bars";
import { DataPlateDemo } from "@/components/DataPlateDemo";
import { EquipmentEditor } from "@/components/EquipmentEditor";
import { StepShell } from "@/components/StepShell";
import { CheckIcon } from "@/components/icons";
import { Badge, Card, PlaceholderNote } from "@/components/ui";
import { heaterBeforeRepair } from "@/lib/equipment";
import { longDate, monthYear, usd, usdRange } from "@/lib/format";
import { guidesForEquipment } from "@/lib/homeGuides";
import { ageOf, lifeStage } from "@/lib/life";
import { PROPERTY, VENDORS } from "@/lib/seed";
import { useDemo } from "@/lib/store";
import { useEquipment } from "@/lib/useEquipment";
import { useEffect, useRef, useState } from "react";

export default function OwnerRecordPage() {
  const { state, actions } = useDemo();
  const [editing, setEditing] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const replaced = state.jobCompletedAt !== null;
  const old = heaterBeforeRepair(state);
  const equipment = useEquipment();
  const doneVendor = state.approval ? VENDORS.find((v) => v.id === state.approval?.vendorId) : undefined;
  const dialogRef = useRef<HTMLDialogElement>(null);
  const editingItem = equipment.find((e) => e.id === editing);
  // The editor opens in its own panel, so the card it belongs to does not stretch.
  useEffect(() => {
    const d = dialogRef.current;
    if (!d) return;
    if (editing && !d.open) d.showModal();
    if (!editing && d.open) d.close();
  }, [editing]);

  return (
    <StepShell stepId="owner-record">
      <p className="text-lg text-ink-soft">
        Everything in {PROPERTY.address}, in one place. GoHome uses it to give your tenant exact, step-by-step help, and to plan what you will
        need to replace.
      </p>

      <p className="rounded-xl bg-cream px-4 py-2 text-sm text-ink-soft">
        Already filled in for you: brand, model, and serial number were recorded at move-in from each data plate, and new equipment is added automatically
        when an installer finishes a job. If something was misread, tap Edit details on that item.
      </p>

      {replaced && (
        <Card title="History">
          <p className="flex items-start gap-2">
            <CheckIcon size={22} />
            <span>
              <strong>Replaced{state.jobCompletedAt ? ` on ${longDate(state.jobCompletedAt.slice(0, 10))}` : ""}</strong>
              {doneVendor ? ` by ${doneVendor.name}` : ""}
              {doneVendor ? ` for ${usd(doneVendor.total)}` : ""}.{" "}
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
                  {corrected && <Badge tone="info">Corrected by you</Badge>}
                  {item.id === "water-heater" && replaced ? <Badge tone="good">New, added automatically</Badge> : <Badge tone={s.tone}>{s.label}</Badge>}
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
              {item.reminder && (
                <p className="rounded-xl bg-glow-tint p-2 text-sm font-bold">
                  Reminder: {item.reminder}
                </p>
              )}
              <div>
                <LifespanBar ageYears={age} typicalLifeYears={item.typicalLifeYears} tone={s.tone} compact />
                <p className="mt-1 text-xs text-ink-soft">
                  {age === 0 ? `New, about ${item.typicalLifeYears} years of life left` : `${age} of ${item.typicalLifeYears} typical years (${s.percentOfLife}% of life)`}
                  {age > item.typicalLifeYears ? `. ${age - item.typicalLifeYears} ${age - item.typicalLifeYears === 1 ? "year" : "years"} past its typical life.` : ""}
                </p>
              </div>
              <button type="button" className="btn btn-secondary !min-h-10 text-sm" onClick={() => { setEditing(item.id); setSaved(null); }}>
                Edit details
              </button>
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
      <DataPlateDemo />

      <dialog
        ref={dialogRef}
        aria-labelledby="edit-dialog-title"
        onClose={() => setEditing(null)}
        className="m-auto w-full max-w-lg rounded-2xl bg-white p-0 text-ink shadow-2xl backdrop:bg-ink/50"
      >
        {editingItem && (
          <div className="p-5">
            <h2 id="edit-dialog-title" className="mb-3 text-xl font-extrabold">
              Edit the {editingItem.name} details
            </h2>
            <EquipmentEditor
              item={editingItem}
              corrected={Boolean(state.equipmentEdits[editingItem.id])}
              onCancel={() => setEditing(null)}
              onReset={() => {
                actions.saveEquipmentEdit(editingItem.id, null);
                setEditing(null);
                setSaved(`${editingItem.name}: the recorded details are back.`);
              }}
              onSave={(edit) => {
                actions.saveEquipmentEdit(editingItem.id, edit);
                setEditing(null);
                setSaved(`${editingItem.name} updated. Your tenant now sees the corrected details and guides.`);
              }}
            />
          </div>
        )}
      </dialog>
      <p>
        <PlaceholderNote /> <span className="text-sm text-ink-soft">(typical life and replace cost)</span>
      </p>
    </StepShell>
  );
}
