"use client";

import Link from "next/link";
import { AgentLogDetails } from "@/components/Agent";
import { LabelReader } from "@/components/LabelReader";
import { StepShell } from "@/components/StepShell";
import { LabelLocationDiagram } from "@/components/diagrams";
import { CameraIcon, CheckIcon } from "@/components/icons";
import { Badge, Callout, Card } from "@/components/ui";
import { recordIsComplete } from "@/lib/equipment";
import { monthYear } from "@/lib/format";
import { isHeaterJob, recordEvents } from "@/lib/agentLog";
import { PROPERTY, SEED_REQUEST } from "@/lib/seed";
import { useDemo } from "@/lib/store";

export default function TenantLabelPage() {
  const { state, actions } = useDemo();
  const request = state.request ?? SEED_REQUEST;
  const record = state.houseRecord;
  const aboutHeater = isHeaterJob(request.description, state.triage);
  const known = recordIsComplete(record);
  const skipped = state.tenantSkippedLabel;

  return (
    <StepShell stepId="tenant-label" nextLabel="See request status">
      {!aboutHeater ? (
        <Callout tone="good" title="✓ No photo needed this time">
          <p>
            Porchlight does not need anything else from you for this problem. If it ever needs a photo of a label, it
            will ask you here, once.
          </p>
        </Callout>
      ) : known && record ? (
        <>
          <Callout tone="good" title="✓ Porchlight has what it needs" role="status">
            <p className="flex items-start gap-2">
              <CheckIcon size={22} />
              <span>
                Your water heater is on file: <strong>{record.manufacturer} {record.model}</strong>, made{" "}
                {monthYear(record.manufactureDate)}. {PROPERTY.owner} can see it and will use it to get the right
                part and the right plumber. You do not need to do anything else.
              </span>
            </p>
          </Callout>
          <Card title="What was saved">
            <ul className="space-y-1">
              <li><strong>Brand:</strong> {record.manufacturer}</li>
              <li><strong>Model:</strong> {record.model}</li>
              <li>
                <strong>Serial number:</strong> {record.serial}{" "}
                {record.unconfirmed.includes("serial") && <Badge tone="caution">{PROPERTY.owner} will confirm</Badge>}
              </li>
              <li><strong>Size:</strong> {record.capacityGallons} gallons, {record.fuelType.toLowerCase()}</li>
            </ul>
            <p className="hint">Source: {record.source}.</p>
          </Card>
          <AgentLogDetails events={recordEvents(record, false)} />
        </>
      ) : skipped ? (
        <>
          <Callout tone="neutral" title="That is okay" role="status">
            <p>
              {PROPERTY.owner} was asked to add the details instead, by photo or by typing them in. You do not need to
              do anything else.
            </p>
          </Callout>
          <AgentLogDetails events={recordEvents(null, true)} />
        </>
      ) : (
        <>
          <Callout tone="info" title="Why Porchlight is asking">
            <p className="flex items-start gap-2">
              <CameraIcon size={22} />
              <span>
                Porchlight keeps a record of what is in the home. For the water heater, the record only says &quot;about
                2015&quot;. One photo of the sticker lets Porchlight fill in the brand, model, and serial number, so the
                right plumber and the right part are sent. It takes about 30 seconds, and you only do it once.
              </span>
            </p>
          </Callout>

          <Card title="How to take the photo">
            <div className="grid gap-5 md:grid-cols-[1fr_17rem]">
              <ol className="space-y-2">
                {[
                  "Look on the side of the water heater tank for a white or silver sticker covered in small print.",
                  "Hold your phone close and still. Turn off the flash if it makes a glare. The small print should be readable.",
                  "Add the photo below. Do not move anything or touch the heater, and skip this if the floor is wet near it.",
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
              <LabelLocationDiagram />
            </div>
          </Card>

          <LabelReader
            audience="tenant"
            saveLabel="Send to Porchlight"
            source={`Read from a label photo sent by the tenant (${PROPERTY.tenant})`}
            onSave={(r) => actions.saveHouseRecord(r)}
          />

          <Card>
            <p className="font-bold">Can you not reach it, or is it not safe?</p>
            <p className="text-ink-soft">No problem. {PROPERTY.owner} will add the details instead.</p>
            <button type="button" className="btn btn-secondary mt-3" onClick={() => actions.skipTenantLabel()}>
              I cannot reach it
            </button>
          </Card>
        </>
      )}

      <p className="text-sm text-ink-soft">
        Only you and {PROPERTY.owner} see this photo.{" "}
        <Link href="/tenant/safety" className="font-bold underline underline-offset-4">
          Back to the safety steps
        </Link>
      </p>
    </StepShell>
  );
}
