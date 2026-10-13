"use client";

import { useRouter } from "next/navigation";
import { LabelReader } from "@/components/LabelReader";
import { StepShell } from "@/components/StepShell";
import { LabelLocationDiagram } from "@/components/diagrams";
import { Callout, Card } from "@/components/ui";
import { heaterBeforeRepair } from "@/lib/equipment";
import { PROPERTY } from "@/lib/seed";
import { useDemo } from "@/lib/store";

export default function OwnerLabelPage() {
  const router = useRouter();
  const { state, actions } = useDemo();
  const record = heaterBeforeRepair(state);

  return (
    <StepShell stepId="optional-label">
      <Callout tone="info" title="You usually will not need this screen">
        <p>
          Porchlight builds the house record for you. The first label photo comes from the tenant, and new equipment is
          registered by the installer. Use this screen when {PROPERTY.tenant} could not reach a label, for older
          equipment, or to double check a record that looks wrong.
        </p>
      </Callout>

      <Card title="How it works">
        <div className="grid gap-5 md:grid-cols-[1fr_17rem]">
          <div className="space-y-4">
            <p className="text-lg">
              Every piece of equipment has a label with its brand, model, serial number, size, fuel type, and the month it
              was made. Porchlight reads those facts from a photo and compares them with your house record. Or you can
              type them in.
            </p>
            <ol className="space-y-2">
              {[
                "Find the label. On a water heater it is a sticker or metal plate on the side of the tank.",
                "Take a clear photo, or choose \"Type the details in\" if you would rather not.",
                "Check what Porchlight read. Fix anything that is wrong, and tap \"Looks right\" on fields marked Please confirm.",
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
            <p className="text-sm text-ink-soft">
              Do not move or unplug anything just to read a label. Skip it if you cannot reach it safely.
            </p>
          </div>
          <LabelLocationDiagram />
        </div>
      </Card>

      <LabelReader
        audience="owner"
        onFile={record}
        allowTyping
        verified
        saveLabel="Save to the house record"
        source="Checked against a label photo by the owner"
        onSave={(r) => {
          actions.saveHouseRecord(r);
          router.push("/owner/record");
        }}
      />
    </StepShell>
  );
}
