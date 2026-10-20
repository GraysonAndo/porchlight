"use client";

import Link from "next/link";
import { LifespanBar } from "@/components/Bars";
import { PhotoThumb } from "@/components/PhotoPicker";
import { AgentFeed, EngineLegend } from "@/components/Agent";
import { JobStatusTracker } from "@/components/JobStatusTracker";
import { SafetyChecklist, UrgencyHero } from "@/components/TriageParts";
import { StepShell } from "@/components/StepShell";
import { RobotIcon } from "@/components/icons";
import { Badge, Callout, Card, Thinking } from "@/components/ui";
import { ageOf, lifeStage } from "@/lib/life";
import { equipmentFor, heaterBeforeRepair } from "@/lib/equipment";
import { isHeaterJob, recordEvents, triageEvents } from "@/lib/agentLog";
import { PROPERTY } from "@/lib/seed";
import { useDemo } from "@/lib/store";
import { useJobStatus } from "@/lib/useJobStatus";
import { useTriage } from "@/lib/useTriage";

export default function OwnerRequestPage() {
  const { state } = useDemo();
  const { request, triage } = useTriage();
  const status = useJobStatus();
  const heaterRecord = heaterBeforeRepair(state);
  const heater = equipmentFor(heaterRecord)[0];
  const stage = lifeStage(ageOf(heater), heater.typicalLifeYears);
  const aboutHeater = isHeaterJob(request.description, triage);

  return (
    <StepShell stepId="owner-request">
      <Card
        title={
          <span className="flex flex-wrap items-center gap-2">
            New request from {PROPERTY.tenant}
            {status === "done" ? (
              <Badge tone="good">DONE</Badge>
            ) : status === "approved" || status === "booked" ? (
              <Badge tone="good">APPROVED AND BOOKED</Badge>
            ) : status === "quoted" ? (
              <Badge tone="caution">NEEDS YOUR DECISION</Badge>
            ) : (
              <Badge tone="info">NEW</Badge>
            )}
          </span>
        }
      >
        <div className="mb-3">
          <JobStatusTracker status={status} />
        </div>
        <p className="text-sm text-ink-soft">{PROPERTY.address}</p>
        <p className="mt-2 text-lg">{request.description}</p>
        {request.photos.length > 0 && (
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {request.photos.map((photo, i) => (
              <PhotoThumb key={`${photo.name}-${i}`} photo={photo} className="aspect-[4/3] w-full" />
            ))}
          </div>
        )}
      </Card>

      {!triage ? (
        <Thinking message="Reading the tenant's report and photo..." />
      ) : (
        <>
          <UrgencyHero triage={triage} audience="owner" />

          <Card
            title={
              <span className="flex flex-wrap items-center gap-2">
                <RobotIcon /> What GoHome already did
              </span>
            }
          >
            <p className="mb-4 text-ink-soft">
              You did not have to do any of this. Each step shows who did the work: the AI, plain code, GoHome acting
              inside your limits, or a person.
            </p>
            <AgentFeed
              events={[
                ...triageEvents({ request, triage, record: heaterRecord }),
                ...(aboutHeater ? recordEvents(heaterRecord, false) : []),
              ]}
            />
            <div className="mt-4 border-t border-line pt-3">
              <EngineLegend />
            </div>
          </Card>

          <Card
            title={
              <span className="flex items-center gap-2">
                <RobotIcon /> What GoHome found
              </span>
            }
          >
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="neutral" icon={false}>
                {triage.category}
              </Badge>
              <Badge tone="neutral" icon={false}>
                Suggested: {triage.suggestedTrade}
              </Badge>
            </div>
            <p className="mt-3 text-lg">{triage.summary}</p>
            <h3 className="mt-4 text-lg font-extrabold">Likely cause</h3>
            <p>{triage.likelyCause}</p>
            <p className="mt-4 text-sm font-bold text-ink-soft">
              AI confidence: {Math.round(triage.confidence * 100)}% (sample result)
            </p>
            <div
              className="mt-1 h-2.5 w-full max-w-xs rounded-full bg-cream-deep"
              role="img"
              aria-label={`Confidence ${Math.round(triage.confidence * 100)} percent`}
            >
              <div className="bar-grow h-full rounded-full bg-good" style={{ width: `${Math.round(triage.confidence * 100)}%` }} />
            </div>
          </Card>

          {aboutHeater && (
            <Card title="Equipment involved">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-lg font-extrabold">
                  Water heater: {heaterRecord ? `${heaterRecord.manufacturer} ${heaterRecord.model}` : "details not on file yet"}
                </p>
                <Badge tone={stage.tone}>{stage.label}</Badge>
              </div>
              <p className="mb-3 text-ink-soft">
                {heaterRecord
                  ? `${heaterRecord.fuelType}, ${heaterRecord.capacityGallons} gallons, ${ageOf(heater)} years old, ${heater.location.toLowerCase()}. It was already in your home record.`
                  : `About ${ageOf(heater)} years old.`}
              </p>
              <LifespanBar ageYears={ageOf(heater)} typicalLifeYears={heater.typicalLifeYears} tone={stage.tone} />
              <p className="mt-2 text-sm text-ink-soft">
                Source: {heaterRecord ? heaterRecord.source : heater.source}.{" "}
                <Link href="/owner/record" className="font-bold underline underline-offset-4">
                  Open the home record
                </Link>
              </p>
            </Card>
          )}

          <SafetyChecklist
            steps={triage.safetySteps}
            context={{ manufacturer: heaterRecord?.manufacturer, model: heaterRecord?.model, fuelType: heaterRecord?.fuelType }}
            interactive={false}
          />

          {(status === "new" || status === "quoted") && (
            <Callout tone="info" title="Your decision">
              <p>
                GoHome checks the home record, collects and compares quotes, and books the visit for you. Nothing is booked and
                nothing is spent until you tap Approve in your inbox.
              </p>
            </Callout>
          )}
        </>
      )}
    </StepShell>
  );
}
