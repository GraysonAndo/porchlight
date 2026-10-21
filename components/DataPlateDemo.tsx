"use client";

// "Snap the data plate": how new equipment gets into the home record. The photo is a drawing and the reading is a sample, but the path
// is the real one. GoHome only fills in what the plate shows (brand, model, serial, month and year). Anything it is guessing is
// labeled as a guess, and anything the plate does not show is left for the owner to fill in. Nothing is saved until the owner confirms.

import { useEffect, useState } from "react";
import { CameraIcon, CheckIcon } from "./icons";
import { Badge, Thinking } from "./ui";
import { useDemo } from "@/lib/store";
import type { EquipmentItem } from "@/lib/types";

/** What is printed on the sample plate, and nothing else. */
const PLATE = { brand: "Brightwell", model: "BW-WA7", serial: "20W118-M", made: "March 2020", electrical: "120V 60Hz", year: 2020 };

const KINDS: { value: string; label: string; life: number; low: number; high: number }[] = [
  { value: "Clothes washer", label: "Clothes washer", life: 11, low: 700, high: 1300 },
  { value: "Clothes dryer", label: "Clothes dryer", life: 13, low: 600, high: 1200 },
  { value: "Other appliance", label: "Something else", life: 12, low: 500, high: 1500 },
];

function Plate() {
  return (
    <svg viewBox="0 0 320 170" role="img" aria-label="The sample data plate that was photographed" className="h-auto w-full rounded-2xl bg-cream">
      <rect x="0" y="0" width="320" height="170" fill="#e8eefb" />
      <rect x="22" y="22" width="276" height="126" rx="10" fill="#dbe5f5" stroke="#0f2552" strokeWidth="3" />
      <circle cx="38" cy="38" r="4" fill="#9db0d3" />
      <circle cx="282" cy="38" r="4" fill="#9db0d3" />
      <circle cx="38" cy="132" r="4" fill="#9db0d3" />
      <circle cx="282" cy="132" r="4" fill="#9db0d3" />
      <text x="160" y="56" textAnchor="middle" fontSize="16" fontWeight="800" fill="#0f2552">{PLATE.brand.toUpperCase()}</text>
      <text x="48" y="84" fontSize="12" fontWeight="700" fill="#0f2552">MODEL  {PLATE.model}</text>
      <text x="48" y="104" fontSize="12" fontWeight="700" fill="#0f2552">SERIAL  {PLATE.serial}</text>
      <text x="48" y="124" fontSize="12" fontWeight="700" fill="#0f2552">MFD  03/2020    {PLATE.electrical}</text>
    </svg>
  );
}

export function DataPlateDemo() {
  const { state, actions } = useDemo();
  const added = state.extraEquipment.some((e) => e.id === "washer");
  const [stage, setStage] = useState<"idle" | "reading" | "done">("idle");
  const [kind, setKind] = useState(KINDS[0].value);
  const [where, setWhere] = useState("");
  const [checked, setChecked] = useState(false);
  const [tried, setTried] = useState(false);

  useEffect(() => {
    if (stage !== "reading") return;
    const t = setTimeout(() => setStage("done"), 1600);
    return () => clearTimeout(t);
  }, [stage]);

  if (added) {
    return (
      <p role="status" className="flex items-center gap-2 rounded-xl bg-good-tint p-3 font-bold text-good-ink">
        <CheckIcon size={20} /> Added from its data plate. It is in the list below, the forecast, and your tenant&apos;s My home.
      </p>
    );
  }

  function save() {
    setTried(true);
    if (where.trim() === "" || !checked) return;
    const k = KINDS.find((x) => x.value === kind) ?? KINDS[0];
    const item: EquipmentItem = {
      id: "washer",
      name: k.value,
      source: "Read from a photo of the data plate; type and place confirmed by the owner",
      brand: PLATE.brand,
      model: PLATE.model,
      serial: PLATE.serial,
      location: where.trim(),
      summary: "Not provided",
      installYear: PLATE.year,
      typicalLifeYears: k.life,
      replaceLow: k.low,
      replaceHigh: k.high,
    };
    actions.addEquipment(item);
  }

  return (
    <section aria-labelledby="plate-heading" className="card space-y-3">
      <h2 id="plate-heading" className="text-xl font-extrabold">
        Add something: snap its data plate
      </h2>
      <p className="text-ink-soft">
        That is how the record above was filled in. Photograph the sticker on the back or side. GoHome reads only what is printed on it: brand, model, serial number, and the month and year. You fill in the rest.
      </p>
      {stage === "idle" && (
        <>
          <div className="max-w-sm">
            <Plate />
          </div>
          <button type="button" className="btn btn-primary" onClick={() => setStage("reading")}>
            <CameraIcon size={20} /> Snap the data plate
          </button>
          <p className="hint">Sample: this uses a drawn plate. The reading step is where a real photo would be read.</p>
        </>
      )}
      {stage === "reading" && <Thinking message="Reading the data plate..." />}
      {stage === "done" && (
        <div className="grid gap-5 md:grid-cols-[minmax(0,18rem)_1fr]">
          <div>
            <Plate />
            <p className="hint">Your photo, kept here so you can check the reading against it.</p>
          </div>
          <form
            noValidate
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              save();
            }}
          >
            <dl className="grid grid-cols-[7rem_1fr] items-center gap-y-1.5 text-sm">
              <dt className="font-bold text-ink-soft">Brand</dt>
              <dd className="flex flex-wrap items-center gap-2">
                {PLATE.brand} <Badge tone="good">Read from the plate</Badge>
              </dd>
              <dt className="font-bold text-ink-soft">Model</dt>
              <dd className="flex flex-wrap items-center gap-2">
                {PLATE.model} <Badge tone="good">Read from the plate</Badge>
              </dd>
              <dt className="font-bold text-ink-soft">Serial</dt>
              <dd className="flex flex-wrap items-center gap-2">
                {PLATE.serial} <Badge tone="good">Read from the plate</Badge>
              </dd>
              <dt className="font-bold text-ink-soft">Made</dt>
              <dd className="flex flex-wrap items-center gap-2">
                {PLATE.made} <Badge tone="good">Read from the plate</Badge>
              </dd>
            </dl>
            <div>
              <label htmlFor="plate-kind" className="label">
                What is it?
              </label>
              <select id="plate-kind" className="field" value={kind} onChange={(e) => setKind(e.target.value)}>
                {KINDS.map((k) => (
                  <option key={k.value} value={k.value}>
                    {k.label}
                  </option>
                ))}
              </select>
              <p className="hint">The plate does not say. Our guess from the model is a clothes washer, so please confirm.</p>
            </div>
            <div>
              <label htmlFor="plate-where" className="label">
                Where is it?
              </label>
              <input id="plate-where" className={`field ${tried && where.trim() === "" ? "!border-urgent" : ""}`} value={where} maxLength={60} onChange={(e) => setWhere(e.target.value)} aria-invalid={tried && where.trim() === "" ? true : undefined} />
              {tried && where.trim() === "" && (
                <p role="alert" className="mt-1 text-sm font-bold text-urgent">
                  Say where it is, for example the laundry closet. The plate cannot tell us.
                </p>
              )}
            </div>
            <label className="flex min-h-11 cursor-pointer items-start gap-3 py-1">
              <input type="checkbox" className="mt-1 h-6 w-6 shrink-0 accent-[var(--color-brand)]" checked={checked} onChange={(e) => setChecked(e.target.checked)} />
              <span>I checked the brand, model, serial number, and year against the plate.</span>
            </label>
            {tried && !checked && (
              <p role="alert" className="text-sm font-bold text-urgent">
                Check the reading against the plate first.
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              <button type="submit" className="btn btn-primary">
                Add to my home record
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => setStage("idle")}>
                Start over
              </button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}
