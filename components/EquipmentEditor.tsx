"use client";

// A small form for correcting a detail in the home record, such as a model number that was misread from a data plate.

import { useState } from "react";
import type { EquipmentItem } from "@/lib/types";

type TextKey = "brand" | "model" | "serial" | "location" | "summary";

const FIELDS: { key: TextKey; label: string; max: number; hint?: string }[] = [
  { key: "brand", label: "Brand", max: 40 },
  { key: "model", label: "Model", max: 40 },
  { key: "serial", label: "Serial number", max: 30 },
  { key: "location", label: "Where it is", max: 60 },
  { key: "summary", label: "What it is", max: 60, hint: "For example: 40 gallon, natural gas, tank type." },
];

const THIS_YEAR = 2026;

export function EquipmentEditor({
  item,
  corrected,
  onSave,
  onReset,
  onCancel,
}: {
  item: EquipmentItem;
  corrected: boolean;
  onSave: (edit: { brand: string; model: string; serial: string; location: string; summary: string; installYear: number }) => void;
  onReset: () => void;
  onCancel: () => void;
}) {
  const [v, setV] = useState({ brand: item.brand, model: item.model, serial: item.serial, location: item.location, summary: item.summary });
  const [year, setYear] = useState(String(item.installYear));
  const [tried, setTried] = useState(false);
  const empty = FIELDS.filter((f) => v[f.key].trim() === "");
  const yearNum = Number(year);
  const yearBad = !/^\d{4}$/.test(year.trim()) || yearNum < 1950 || yearNum > THIS_YEAR;

  return (
    <form
      noValidate
      aria-label={`Edit the ${item.name} details`}
      className="space-y-3 rounded-xl border border-brand bg-brand-tint/30 p-3"
      onSubmit={(e) => {
        e.preventDefault();
        setTried(true);
        if (empty.length > 0 || yearBad) return;
        onSave({ brand: v.brand.trim(), model: v.model.trim(), serial: v.serial.trim(), location: v.location.trim(), summary: v.summary.trim(), installYear: yearNum });
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
            {f.hint && !bad && <p className="hint">{f.hint}</p>}
            {bad && (
              <p id={`${id}-error`} role="alert" className="mt-1 text-sm font-bold text-urgent">
                {f.label} cannot be empty.
              </p>
            )}
          </div>
        );
      })}
      <div>
        <label htmlFor={`edit-${item.id}-year`} className="label">
          Installed (year)
        </label>
        <input
          id={`edit-${item.id}-year`}
          className={`field ${tried && yearBad ? "!border-urgent" : ""}`}
          inputMode="numeric"
          value={year}
          maxLength={4}
          aria-invalid={tried && yearBad ? true : undefined}
          aria-describedby={tried && yearBad ? `edit-${item.id}-year-error` : undefined}
          onChange={(e) => setYear(e.target.value.replace(/\D/g, ""))}
        />
        {tried && yearBad && (
          <p id={`edit-${item.id}-year-error`} role="alert" className="mt-1 text-sm font-bold text-urgent">
            Enter a four digit year between 1950 and {THIS_YEAR}.
          </p>
        )}
        <p className="hint">The year sets its age, the 5-year forecast, and the repair or replace advice.</p>
      </div>
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
