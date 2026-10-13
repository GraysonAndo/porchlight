"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { StepShell } from "@/components/StepShell";
import { PhotoPicker, PhotoThumb } from "@/components/PhotoPicker";
import { LabelLocationDiagram } from "@/components/diagrams";
import { Badge, Callout, Card, Thinking } from "@/components/ui";
import { ai } from "@/lib/ai";
import { heaterBeforeRepair, yearOf } from "@/lib/equipment";
import { CURRENT_YEAR } from "@/lib/forecast";
import { SAMPLE_LABEL_PHOTO } from "@/lib/seed";
import { useDemo } from "@/lib/store";
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
  manufacturer: "Manufacturer",
  model: "Model",
  serial: "Serial number",
  capacityGallons: "Capacity (gallons)",
  fuelType: "Fuel type",
  manufactureDate: "Manufacture date",
};

const FIELD_ORDER: FieldKey[] = ["manufacturer", "model", "serial", "capacityGallons", "fuelType", "manufactureDate"];

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

export default function OwnerLabelPage() {
  const router = useRouter();
  const { state, actions } = useDemo();
  const onFile = fieldsFromRecord(heaterBeforeRepair(state));

  const [photo, setPhoto] = useState<Photo | null>(null);
  // The reading is stored with the photo it came from, so a new photo never shows an old reading.
  const [reading, setReading] = useState<Reading | null>(null);
  const [edits, setEdits] = useState<Partial<Fields>>({});
  const [confirmed, setConfirmed] = useState<string[]>([]);

  useEffect(() => {
    if (!photo || reading?.photo === photo) return;
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
  }, [photo, reading]);

  function choosePhoto(photos: Photo[]) {
    setPhoto(photos[0] ?? null);
    setReading(null);
    setEdits({});
    setConfirmed([]);
  }

  const scanning = photo !== null && reading?.photo !== photo;
  const ready = !scanning && reading !== null && photo !== null;
  const values: Fields | null = ready ? { ...reading.fields, ...edits } : null;

  function isFlagged(key: FieldKey): boolean {
    return ready && reading.needsReview.includes(key);
  }
  function isConfirmed(key: FieldKey): boolean {
    return confirmed.includes(key) || key in edits;
  }

  const year = values ? yearOf(values.manufactureDate) : null;
  const ageYears = year !== null ? Math.max(0, CURRENT_YEAR - year) : null;
  const stillUnconfirmed = FIELD_ORDER.filter((k) => isFlagged(k) && !isConfirmed(k));
  const differences = values ? FIELD_ORDER.filter((k) => !same(values[k], onFile[k])) : [];

  function save() {
    if (!values || ageYears === null) return;
    actions.saveHouseRecord({
      manufacturer: values.manufacturer,
      model: values.model,
      serial: values.serial,
      capacityGallons: Number(values.capacityGallons) || 0,
      fuelType: values.fuelType,
      manufactureDate: values.manufactureDate,
      ageYears,
      unconfirmed: stillUnconfirmed,
      photo,
      source: "Checked against a label photo by the owner",
      verified: true,
    });
    router.push("/owner/record");
  }

  return (
    <StepShell
      stepId="optional-label"
      nextLabel="Save to the house record"
      onNext={save}
      nextDisabled={!ready || ageYears === null}
      skipLabel="Cancel"
      skipHref="/owner/record"
    >
      <Callout tone="info" title="You usually will not need this screen">
        <p>
          Porchlight records new equipment automatically when it is installed: brand, model, serial number, and install
          date come straight from the installer. There is nothing to type or photograph. Use this screen only for
          older equipment that was installed before Porchlight, or to double check a record that looks wrong.
        </p>
      </Callout>

      <Card title="How it works">
        <div className="grid gap-5 md:grid-cols-[1fr_17rem]">
          <div className="space-y-4">
            <p className="text-lg">
              Every piece of equipment has a label with its brand, model, serial number, size, fuel type, and the month
              it was made. Porchlight reads those facts from a photo and compares them with your house record.
            </p>

            <div>
              <h3 className="font-extrabold">What to do (about 1 minute)</h3>
              <ol className="mt-2 space-y-2">
                {[
                  "Find the label. On a water heater it is a sticker or metal plate on the side of the tank.",
                  "Take a clear photo. Stand close, hold still, and avoid flash glare. All the small print should be readable.",
                  "Add the photo below. Choose a file, or use the sample label photo to try it.",
                  "Check what we read against the record. Fix anything that is wrong, and tap \"Looks right\" on fields marked Please confirm.",
                  "Save to the house record.",
                ].map((text, i) => (
                  <li key={text} className="flex gap-3">
                    <span
                      aria-hidden="true"
                      className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-ink text-sm font-extrabold text-cream"
                    >
                      {i + 1}
                    </span>{" "}
                    <span>{text}</span>
                  </li>
                ))}
              </ol>
            </div>

            <p className="text-sm text-ink-soft">
              Do not move or unplug anything just to read a label. Skip it if you cannot reach it safely.
            </p>
          </div>

          <LabelLocationDiagram />
        </div>
      </Card>

      <Card>
        <PhotoPicker
          label="Photo of the equipment label"
          photos={photo ? [photo] : []}
          onChange={choosePhoto}
          sample={SAMPLE_LABEL_PHOTO}
          sampleButtonLabel="Use sample label photo"
          hint="Prototype note: any photo gives the same sample reading."
        />
      </Card>

      {photo && (
        <Card title={scanning ? "Scanning the label..." : "What we read"}>
          <div className="grid gap-5 md:grid-cols-2">
            <div className={`relative overflow-hidden rounded-2xl ${scanning ? "scan-frame" : ""}`}>
              <PhotoThumb photo={photo} className="aspect-[3/2] w-full" />
              {scanning && (
                <>
                  <div className="absolute inset-0 bg-ink/15" aria-hidden="true" />
                  <div className="scan-line" aria-hidden="true" />
                </>
              )}
            </div>

            {scanning ? (
              <Thinking message="Reading brand, model, serial, and date..." />
            ) : (
              values && (
                <div className="space-y-4">
                  <p className="text-sm font-bold text-ink-soft">
                    AI confidence: {Math.round((reading?.confidence ?? 0) * 100)}% overall (sample result)
                  </p>
                  {FIELD_ORDER.map((key) => {
                    const flagged = isFlagged(key);
                    const done = isConfirmed(key);
                    const matches = same(values[key], onFile[key]);
                    const id = `label-${key}`;
                    return (
                      <div key={key}>
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <label htmlFor={id} className="label !mb-0">
                            {FIELD_LABELS[key]}
                          </label>
                          <span className="flex flex-wrap gap-1">
                            {matches ? (
                              <Badge tone="good">Matches your record</Badge>
                            ) : (
                              <Badge tone="caution">Different from your record</Badge>
                            )}
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
                        {!matches && <p className="hint">Your record says: {onFile[key]}</p>}
                        {key === "manufactureDate" && (
                          <p className="hint">
                            Check this against the label. The age, forecast, and repair or replace answer all depend on this
                            year.
                          </p>
                        )}
                        {flagged && !done && (
                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            <p className="text-sm text-caution-ink">
                              The photo is a little smudged here. Check it against the label.
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

                  <div className="rounded-xl bg-cream p-3">
                    <p className="font-bold">Age: {ageYears === null ? "unknown" : `${ageYears} years`}</p>
                    <p className="text-sm text-ink-soft">Worked out from the manufacture date and {CURRENT_YEAR}.</p>
                  </div>
                </div>
              )
            )}
          </div>

          {ready && (
            <div className="mt-4 space-y-3">
              {differences.length === 0 ? (
                <Callout tone="good" title="✓ Everything matches your house record">
                  <p>Saving will mark the record as checked against a label photo.</p>
                </Callout>
              ) : (
                <Callout tone="caution" title={`${differences.length} field${differences.length === 1 ? "" : "s"} differ from your record`}>
                  <p>Saving will update the record with what you see here.</p>
                </Callout>
              )}
              {stillUnconfirmed.length > 0 && (
                <Callout tone="caution" title="One field still needs a check">
                  You can save now and confirm later, or tap &quot;Looks right&quot; after checking the photo.
                </Callout>
              )}
            </div>
          )}
        </Card>
      )}
    </StepShell>
  );
}
