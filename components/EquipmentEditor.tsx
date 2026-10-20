"use client";

// A small form for correcting a detail in the home record, such as a model number that was misread from a data plate.

import { useState } from "react";
import type { EquipmentItem } from "@/lib/types";

const FIELDS: { key: "brand" | "model" | "serial" | "location"; label: string; max: number }[] = [
  { key: "brand", label: "Brand", max: 40 },
  { key: "model", label: "Model", max: 40 },
  { key: "serial", label: "Serial number", max: 30 },
  { key: "location", label: "Where it is", max: 60 },
];

export function EquipmentEditor({
  item,
  corrected,
  onSave,
  onReset,
  onCancel,
}: {
  item: EquipmentItem;
  corrected: boolean;
  onSave: (edit: { brand: string; model: string; serial: string; location: string }) => void;
  onReset: () => void;
  onCancel: () => void;
}) {
  const [v, setV] = useState({ brand: item.brand, model: item.model, serial: item.serial, location: item.location });
  const [tried, setTried] = useState(false);
  const empty = FIELDS.filter((f) => v[f.key].trim() === "");

  return (
    <form
      noValidate
      aria-label={`Edit the ${item.name} details`}
      className="space-y-3 rounded-xl border border-brand bg-brand-tint/30 p-3"
      onSubmit={(e) => {
        e.preventDefault();
        setTried(true);
        if (empty.length > 0) return;
        onSave({ brand: v.brand.trim(), model: v.model.trim(), serial: v.serial.trim(), location: v.location.trim() });
      }}
    >
      {FIELDS.map((f) => {
        const id = `edit-${item.id}-${f.key}`;
        const bad = tried && v[f.key].trim() === "";
        return (
          <div key={f.key}>
            <label htmlFor={id} className="label">
              {f.label}
            </label>
            <input
              id={id}
              className={`field ${bad ? "!border-urgent" : ""}`}
              value={v[f.key]}
              maxLength={f.max}
              aria-invalid={bad ? true : undefined}
              aria-describedby={bad ? `${id}-error` : undefined}
              onChange={(e) => setV((prev) => ({ ...prev, [f.key]: e.target.value }))}
            />
            {bad && (
              <p id={`${id}-error`} role="alert" className="mt-1 text-sm font-bold text-urgent">
                {f.label} cannot be empty.
              </p>
            )}
          </div>
        );
      })}
      <p className="hint">Your tenant and GoHome use the corrected details right away, including the how-to guides.</p>
      <div className="flex flex-wrap gap-2">
        <button type="submit" className="btn btn-primary !min-h-10 text-sm">
          Save
        </button>
        <button type="button" className="btn btn-secondary !min-h-10 text-sm" onClick={onCancel}>
          Cancel
        </button>
        {corrected && (
          <button type="button" className="btn btn-ghost !min-h-10 text-sm" onClick={onReset}>
            Put the recorded details back
          </button>
        )}
      </div>
    </form>
  );
}
