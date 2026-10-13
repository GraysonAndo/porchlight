"use client";

import Link from "next/link";
import { LifespanBar } from "@/components/Bars";
import { PhotoThumb } from "@/components/PhotoPicker";
import { SafetyChecklist, UrgencyHero } from "@/components/TriageParts";
import { StepShell } from "@/components/StepShell";
import { RobotIcon } from "@/components/icons";
import { Badge, Callout, Card, Thinking } from "@/components/ui";
import { ageOf, lifeStage } from "@/lib/life";
import { equipmentFor, heaterBeforeRepair } from "@/lib/equipment";
import { PROPERTY } from "@/lib/seed";
import { useDemo } from "@/lib/store";
import { useTriage } from "@/lib/useTriage";

export default function OwnerRequestPage() {
  const { state } = useDemo();
  const { request, triage } = useTriage();
  const answers = state.tenantAnswers;
  const heaterRecord = heaterBeforeRepair(state);
  const heater = equipmentFor(heaterRecord)[0];
  const stage = lifeStage(ageOf(heater), heater.typicalLifeYears);
  const aboutHeater = /heater|hot water/i.test(request.description);

  return (
    <StepShell stepId="owner-request" nextDisabled={!triage}>
      <Card
        title={
          <span className="flex flex-wrap items-center gap-2">
            New request from {PROPERTY.tenant}
            <Badge tone="caution">NEEDS YOUR DECISION</Badge>
          </span>
        }
      >
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
              <span className="flex items-center gap-2">
                <RobotIcon /> What Porchlight found
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
                  Water heater: {heaterRecord.manufacturer} {heaterRecord.model}
                </p>
                <Badge tone={stage.tone}>{stage.label}</Badge>
              </div>
              <p className="mb-3 text-ink-soft">
                {heaterRecord.fuelType}, {heaterRecord.capacityGallons} gallons, {ageOf(heater)} years old. Already in
                your house record, no photo needed.
              </p>
              <LifespanBar ageYears={ageOf(heater)} typicalLifeYears={heater.typicalLifeYears} tone={stage.tone} />
              <p className="mt-2 text-sm text-ink-soft">
                Source: {heaterRecord.source}.{" "}
                <Link href="/owner/record" className="font-bold underline underline-offset-4">
                  Open the house record
                </Link>
              </p>
            </Card>
          )}

          <SafetyChecklist
            steps={triage.safetySteps}
            context={{ manufacturer: heaterRecord.manufacturer, model: heaterRecord.model, fuelType: heaterRecord.fuelType }}
            interactive={false}
          />

          <Card title={`${PROPERTY.tenant}'s answers`}>
            {answers ? (
              <ol className="space-y-2">
                {triage.tenantQuestions.map((q, i) => (
                  <li key={q}>
                    <p className="font-bold">{q}</p>
                    <p className="text-ink-soft">{answers[i]?.trim() || "(no answer)"}</p>
                  </li>
                ))}
              </ol>
            ) : (
              <>
                <p className="text-ink-soft">Waiting for the tenant to answer these questions:</p>
                <ol className="mt-2 list-decimal space-y-1 pl-6">
                  {triage.tenantQuestions.map((q) => (
                    <li key={q}>{q}</li>
                  ))}
                </ol>
                <p className="mt-2 text-sm text-ink-soft">
                  You do not need to wait for the answers to keep going.{" "}
                  <Link href="/tenant/safety" className="font-bold underline underline-offset-4">
                    See the tenant&apos;s screen
                  </Link>
                </p>
              </>
            )}
          </Card>

          <Callout tone="info" title="Your decision">
            <p>
              Porchlight can check the house record, compare the vendor&apos;s quote, and book the visit for you. Nothing is
              booked and nothing is spent until you approve it on the last step.
            </p>
          </Callout>
        </>
      )}
    </StepShell>
  );
}
