"use client";

// Reads an equipment label from a photo (or lets the owner type the details),
// shows what was read, and saves it to the house record. Used by the tenant's
// "One quick photo" screen and by the owner's "Add equipment details" screen.

import { useEffect, useState } from "react";
import { PhotoPicker, PhotoThumb } from "./PhotoPicker";
import { Badge, Callout, Card, Thinking } from "./ui";
import { ai } from "@/lib/ai";
import { yearOf } from "@/lib/equipment";
import { CURRENT_YEAR } from "@/lib/forecast";
import { SAMPLE_LABEL_PHOTO } from "@/lib/seed";
import type { LabelResult, Photo, WaterHeaterRecord } from "@/lib/types";

type FieldKey = "manufacturer" | "model" | "serial" | "capacityGallons" | "fuelType" | "manufactureDate";

interface Fields {
  manufacturer: string;
  model: string;
  serial: string;
  capacityGallons: string;
  fuelType: string;
  manufactureDate: string;
}

const FIELD_LABELS: Record<FieldKey, string> = {
  manufacturer: "Brand",
  model: "Model",
  serial: "Serial number",
  capacityGallons: "Size (gallons)",
  fuelType: "Fuel type",
  manufactureDate: "Month and year made",
};

const FIELD_ORDER: FieldKey[] = ["manufacturer", "model", "serial", "capacityGallons", "fuelType", "manufactureDate"];

const BLANK: Fields = {
  manufacturer: "",
  model: "",
  serial: "",
  capacityGallons: "",
  fuelType: "Natural gas",
  manufactureDate: "",
};

function fieldsFromResult(r: LabelResult): Fields {
  return {
    manufacturer: r.manufacturer,
    model: r.model,
    serial: r.serial,
    capacityGallons: String(r.capacityGallons),
    fuelType: r.fuelType,
    manufactureDate: r.manufactureDate,
  };
}

function fieldsFromRecord(r: WaterHeaterRecord): Fields {
  return {
    manufacturer: r.manufacturer,
    model: r.model,
    serial: r.serial,
    capacityGallons: String(r.capacityGallons),
    fuelType: r.fuelType,
    manufactureDate: r.manufactureDate,
  };
}

const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

interface Reading {
  photo: Photo;
  fields: Fields;
  needsReview: string[];
  confidence: number;
}

export interface LabelReaderProps {
  /** Who is using it. The tenant sees plain wording and no comparison. */
  audience: "tenant" | "owner";
  /** What the house record says now, for the owner's comparison. */
  onFile?: WaterHeaterRecord | null;
  /** Words for the save button */
  saveLabel: string;
  /** Where the details came from, saved on the record */
  source: string;
  /** Mark the record as checked by the owner */
  verified?: boolean;
  /** The owner can type the details instead of using a photo */
  allowTyping?: boolean;
  onSave: (record: WaterHeaterRecord) => void;
}

export function LabelReader({
  audience,
  onFile = null,
  saveLabel,
  source,
  verified = false,
  allowTyping = false,
  onSave,
}: LabelReaderProps) {
  const [mode, setMode] = useState<"photo" | "type">("photo");
  const [photo, setPhoto] = useState<Photo | null>(null);
  // The reading is stored with the photo it came from, so a new photo never shows an old reading.
  const [reading, setReading] = useState<Reading | null>(null);
  const [edits, setEdits] = useState<Partial<Fields>>({});
  const [confirmed, setConfirmed] = useState<string[]>([]);

  const compare = audience === "owner" && onFile !== null ? fieldsFromRecord(onFile) : null;

  useEffect(() => {
    if (mode !== "photo" || !photo || reading?.photo === photo) return;
    let cancelled = false;
    ai.readLabel({ photo }).then((result) => {
      if (cancelled) return;
      setReading({
        photo,
        fields: fieldsFromResult(result),
        needsReview: result.fieldsNeedingReview,
        confidence: result.confidence,
      });
    });
    return () => {
      cancelled = true;
    };
  }, [mode, photo, reading]);

  function choosePhoto(photos: Photo[]) {
    setPhoto(photos[0] ?? null);
    setReading(null);
    setEdits({});
    setConfirmed([]);
  }

  function chooseMode(next: "photo" | "type") {
    setMode(next);
    setEdits({});
    setConfirmed([]);
  }

  const typing = mode === "type";
  const scanning = !typing && photo !== null && reading?.photo !== photo;
  const ready = typing || (!scanning && reading !== null && photo !== null);
  const base: Fields = typing ? BLANK : (reading?.fields ?? BLANK);
  const values: Fields | null = ready ? { ...base, ...edits } : null;
  const needsReview = typing ? [] : (reading?.needsReview ?? []);

  const isFlagged = (key: FieldKey) => ready && needsReview.includes(key);
  const isConfirmed = (key: FieldKey) => confirmed.includes(key) || key in edits;

  const year = values ? yearOf(values.manufactureDate) : null;
  const ageYears = year !== null ? Math.max(0, CURRENT_YEAR - year) : null;
  const stillUnconfirmed = FIELD_ORDER.filter((k) => isFlagged(k) && !isConfirmed(k));
  const differences = values && compare ? FIELD_ORDER.filter((k) => !same(values[k], compare[k])) : [];

  const complete =
    values !== null &&
    values.manufacturer.trim() !== "" &&
    values.model.trim() !== "" &&
    values.serial.trim() !== "" &&
    Number(values.capacityGallons) > 0 &&
    ageYears !== null;

  function save() {
    if (!values || !complete || ageYears === null) return;
    onSave({
      manufacturer: values.manufacturer.trim(),
      model: values.model.trim(),
      serial: values.serial.trim(),
      capacityGallons: Number(values.capacityGallons) || 0,
      fuelType: values.fuelType,
      manufactureDate: values.manufactureDate,
      ageYears,
      unconfirmed: stillUnconfirmed,
      photo: typing ? null : photo,
      source: typing ? "Typed in by the owner" : source,
      verified: typing ? false : verified,
    });
  }

  const tenant = audience === "tenant";

  return (
    <div className="space-y-5">
      {allowTyping && (
        <div role="radiogroup" aria-label="How to add the details" className="flex flex-wrap gap-2">
          {(
            [
              ["photo", "Use a photo of the label"],
              ["type", "Type the details in"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={mode === id}
              onClick={() => chooseMode(id)}
              className={`btn ${mode === id ? "btn-primary" : "btn-secondary"}`}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {!typing && (
        <Card>
          <PhotoPicker
            label={tenant ? "Photo of the sticker on the water heater" : "Photo of the equipment label"}
            photos={photo ? [photo] : []}
            onChange={choosePhoto}
            sample={SAMPLE_LABEL_PHOTO}
            sampleButtonLabel="Use sample label photo"
            hint="Prototype note: any photo gives the same sample reading."
          />
        </Card>
      )}

      {(typing || photo) && (
        <Card title={scanning ? "Reading the label..." : typing ? "Type the details" : "What Porchlight read"}>
          <div className={typing ? "" : "grid gap-5 md:grid-cols-2"}>
            {!typing && photo && (
              <div className={`relative overflow-hidden rounded-2xl ${scanning ? "scan-frame" : ""}`}>
                <PhotoThumb photo={photo} className="aspect-[3/2] w-full" />
                {scanning && (
                  <>
                    <div className="absolute inset-0 bg-ink/15" aria-hidden="true" />
                    <div className="scan-line" aria-hidden="true" />
                  </>
                )}
              </div>
            )}

            {scanning ? (
              <Thinking message="Reading brand, model, serial, and date..." />
            ) : (
              values && (
                <div className={typing ? "grid gap-4 sm:grid-cols-2" : "space-y-4"}>
                  {!typing && (
                    <p className="text-sm font-bold text-ink-soft">
                      AI confidence: {Math.round((reading?.confidence ?? 0) * 100)}% overall (sample result)
                    </p>
                  )}
                  {FIELD_ORDER.map((key) => {
                    const flagged = isFlagged(key);
                    const done = isConfirmed(key);
                    const matches = compare ? same(values[key], compare[key]) : true;
                    const id = `label-${key}`;
                    return (
                      <div key={key}>
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <label htmlFor={id} className="label !mb-0">
                            {FIELD_LABELS[key]}
                          </label>
                          <span className="flex flex-wrap gap-1">
                            {compare && !typing && (matches ? (
                              <Badge tone="good">Matches the record</Badge>
                            ) : (
                              <Badge tone="caution">Different from the record</Badge>
                            ))}
                            {flagged && !done && <Badge tone="caution">Please confirm</Badge>}
                            {flagged && done && <Badge tone="good">Confirmed</Badge>}
                          </span>
                        </div>
                        {key === "fuelType" ? (
                          <select
                            id={id}
                            className="field mt-1"
                            value={values.fuelType}
                            onChange={(e) => setEdits((p) => ({ ...p, fuelType: e.target.value }))}
                          >
                            <option>Natural gas</option>
                            <option>Propane</option>
                            <option>Electric</option>
                          </select>
                        ) : (
                          <input
                            id={id}
                            className={`field mt-1 ${flagged && !done ? "!border-glow-deep !bg-caution-tint" : ""}`}
                            type={key === "capacityGallons" ? "number" : key === "manufactureDate" ? "month" : "text"}
                            min={key === "capacityGallons" ? 1 : undefined}
                            value={values[key]}
                            onChange={(e) => setEdits((p) => ({ ...p, [key]: e.target.value }))}
                          />
                        )}
                        {compare && !typing && !matches && <p className="hint">The record says: {compare[key]}</p>}
                        {key === "manufactureDate" && !tenant && (
                          <p className="hint">
                            Check this against the label. The age, forecast, and repair or replace answer all depend on this
                            year.
                          </p>
                        )}
                        {flagged && !done && (
                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            <p className="text-sm text-caution-ink">
                              {tenant
                                ? "This part was hard to read. Does it match the sticker?"
                                : "The photo is a little smudged here. Check it against the label."}
                            </p>
                            <button
                              type="button"
                              className="btn btn-secondary !min-h-11 text-sm"
                              onClick={() => setConfirmed((p) => [...p, key])}
                            >
                              Looks right
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {!tenant && (
                    <div className="rounded-xl bg-cream p-3 sm:col-span-2">
                      <p className="font-bold">Age: {ageYears === null ? "unknown" : `${ageYears} years`}</p>
                      <p className="text-sm text-ink-soft">Worked out from the manufacture date and {CURRENT_YEAR}.</p>
                    </div>
                  )}
                </div>
              )
            )}
          </div>

          {ready && (
            <div className="mt-4 space-y-3">
              {compare && !typing && (
                differences.length === 0 ? (
                  <Callout tone="good" title="✓ Everything matches the house record">
                    <p>Saving will mark the record as checked against a label photo.</p>
                  </Callout>
                ) : (
                  <Callout
                    tone="caution"
                    title={`${differences.length} field${differences.length === 1 ? "" : "s"} differ from the record`}
                  >
                    <p>Saving will update the record with what you see here.</p>
                  </Callout>
                )
              )}
              {stillUnconfirmed.length > 0 && (
                <Callout tone="caution" title="One field still needs a check">
                  {tenant
                    ? "Check it against the sticker and tap \"Looks right\", or fix it. You can also send it as is and the owner will confirm."
                    : "You can save now and confirm later, or tap \"Looks right\" after checking the photo."}
                </Callout>
              )}
              {typing && !complete && (
                <p className="text-sm text-ink-soft">Fill in the brand, model, serial number, size, and the month it was made.</p>
              )}
              <button type="button" className="btn btn-primary btn-lg w-full sm:w-auto" disabled={!complete} onClick={save}>
                {saveLabel}
              </button>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
