"use client";

// "Snap the data plate": how new equipment gets into the home record. The photo is a drawing and the reading is a sample, but the
// path is the real one: photograph the plate, GoHome fills in the card, and the owner checks it before it is saved.

import { useEffect, useState } from "react";
import { CameraIcon, CheckIcon } from "./icons";
import { Badge, Thinking } from "./ui";
import { useDemo } from "@/lib/store";
import type { EquipmentItem } from "@/lib/types";

const READING: EquipmentItem = {
  id: "washer",
  name: "Clothes washer",
  source: "Read from a photo of the data plate",
  brand: "Brightwell",
  model: "BW-WA7",
  serial: "20W118-M",
  location: "Laundry closet, off the hallway",
  summary: "Front load, 4.5 cubic feet",
  installYear: 2020,
  typicalLifeYears: 11,
  replaceLow: 700,
  replaceHigh: 1300,
};

function Plate() {
  return (
    <svg viewBox="0 0 320 170" role="img" aria-label="A sample data plate on the back of a washer" className="h-auto w-full rounded-2xl bg-cream">
      <rect x="0" y="0" width="320" height="170" fill="#e8eefb" />
      <rect x="22" y="22" width="276" height="126" rx="10" fill="#dbe5f5" stroke="#0f2552" strokeWidth="3" />
      <circle cx="38" cy="38" r="4" fill="#9db0d3" />
      <circle cx="282" cy="38" r="4" fill="#9db0d3" />
      <circle cx="38" cy="132" r="4" fill="#9db0d3" />
      <circle cx="282" cy="132" r="4" fill="#9db0d3" />
      <text x="160" y="56" textAnchor="middle" fontSize="16" fontWeight="800" fill="#0f2552">BRIGHTWELL</text>
      <text x="48" y="84" fontSize="12" fontWeight="700" fill="#0f2552">MODEL  BW-WA7</text>
      <text x="48" y="104" fontSize="12" fontWeight="700" fill="#0f2552">SERIAL  20W118-M</text>
      <text x="48" y="124" fontSize="12" fontWeight="700" fill="#0f2552">MFD  03/2020    120V 60Hz</text>
    </svg>
  );
}

export function DataPlateDemo() {
  const { state, actions } = useDemo();
  const added = state.extraEquipment.some((e) => e.id === READING.id);
  const [stage, setStage] = useState<"idle" | "reading" | "done">("idle");

  useEffect(() => {
    if (stage !== "reading") return;
    const t = setTimeout(() => setStage("done"), 1600);
    return () => clearTimeout(t);
  }, [stage]);

  if (added) {
    return (
      <p role="status" className="flex items-center gap-2 rounded-xl bg-good-tint p-3 font-bold text-good-ink">
        <CheckIcon size={20} /> Clothes washer added from its data plate. It is in the list below, the forecast, and your tenant&apos;s My home.
      </p>
    );
  }

  return (
    <section aria-labelledby="plate-heading" className="card space-y-3">
      <h2 id="plate-heading" className="text-xl font-extrabold">
        Add something: snap its data plate
      </h2>
      <p className="text-ink-soft">
        That is how the record above was filled in. Photograph the sticker on the back or side, and GoHome reads the brand, model, serial number, and year.
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
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-lg font-extrabold">
              {READING.name}: {READING.brand} {READING.model}
            </p>
            <Badge tone="good">Read from the photo</Badge>
          </div>
          <dl className="grid grid-cols-[7rem_1fr] gap-y-1 text-sm">
            <dt className="font-bold text-ink-soft">Serial</dt>
            <dd>{READING.serial}</dd>
            <dt className="font-bold text-ink-soft">Made</dt>
            <dd>March 2020</dd>
            <dt className="font-bold text-ink-soft">What</dt>
            <dd>{READING.summary}</dd>
            <dt className="font-bold text-ink-soft">Where</dt>
            <dd>{READING.location}</dd>
          </dl>
          <p className="hint">Check it against the plate. You can correct anything after it is added.</p>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn btn-primary" onClick={() => actions.addEquipment(READING)}>
              Add to my home record
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => setStage("idle")}>
              Start over
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
