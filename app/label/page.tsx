"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { StepShell } from "@/components/StepShell";
import { PhotoPicker, PhotoThumb } from "@/components/PhotoPicker";
import { Badge, Callout, Card, Thinking } from "@/components/ui";
import { ai } from "@/lib/ai";
import { CURRENT_YEAR } from "@/lib/forecast";
import { yearOf } from "@/lib/equipment";
import { monthYear } from "@/lib/format";
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

interface Reading {
  photo: Photo;
  fields: Fields;
  needsReview: string[];
  confidence: number;
}

function LabelBody({ saved }: { saved: WaterHeaterRecord | null }) {
  const router = useRouter();
  const { actions } = useDemo();

  const [photo, setPhoto] = useState<Photo | null>(saved?.photo ?? null);
  // The reading is stored with the photo it came from, so a new photo never shows an old reading.
  const [reading, setReading] = useState<Reading | null>(
    saved?.photo
      ? { photo: saved.photo, fields: fieldsFromRecord(saved), needsReview: saved.unconfirmed, confidence: 0.86 }
      : null,
  );
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
    });
    router.push("/record");
  }

  return (
    <StepShell
      step={3}
      nextLabel="Save to house record"
      onNext={save}
      nextDisabled={!ready || ageYears === null}
      skipLabel="Skip"
      skipHref="/record"
    >
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
            <div className="relative overflow-hidden rounded-xl">
              <PhotoThumb photo={photo} className="aspect-[3/2] w-full" />
              {scanning && <div className="scan-line" aria-hidden="true" />}
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
                    const id = `label-${key}`;
                    return (
                      <div key={key}>
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <label htmlFor={id} className="label !mb-0">
                            {FIELD_LABELS[key]}
                          </label>
                          {flagged && !done && <Badge tone="caution">Please confirm</Badge>}
                          {flagged && done && <Badge tone="good">Confirmed</Badge>}
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
                    <p className="font-bold">
                      Age: {ageYears === null ? "unknown" : `${ageYears} years`}
                    </p>
                    <p className="text-sm text-ink-soft">
                      Worked out from the manufacture date
                      {values.manufactureDate ? ` (${monthYear(values.manufactureDate)})` : ""} and {CURRENT_YEAR}.
                    </p>
                  </div>
                </div>
              )
            )}
          </div>

          {ready && stillUnconfirmed.length > 0 && (
            <div className="mt-4">
              <Callout tone="caution" title="One field still needs a check">
                You can save now and confirm later, or tap &quot;Looks right&quot; after checking the photo.
              </Callout>
            </div>
          )}
        </Card>
      )}
    </StepShell>
  );
}

export default function LabelPage() {
  const { state, hydrated } = useDemo();

  if (!hydrated) {
    return (
      <StepShell step={3} nextLabel="Save to house record" nextDisabled>
        <p className="text-ink-soft">Loading...</p>
      </StepShell>
    );
  }
  return <LabelBody saved={state.houseRecord} />;
}
