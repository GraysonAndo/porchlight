"use client";

import { useState } from "react";
import { PhotoThumb } from "@/components/PhotoPicker";
import { SafetyChecklist, UrgencyHero } from "@/components/TriageParts";
import { StepShell } from "@/components/StepShell";
import { BellIcon, PeopleIcon } from "@/components/icons";
import { Badge, Callout, Card, Thinking } from "@/components/ui";
import { heaterBeforeRepair } from "@/lib/equipment";
import { PROPERTY } from "@/lib/seed";
import { useDemo } from "@/lib/store";
import { useTriage } from "@/lib/useTriage";

/** The follow-up questions, with a box for each answer. */
function Questions({ questions }: { questions: string[] }) {
  const { state, actions } = useDemo();
  const saved = state.tenantAnswers;
  const [draft, setDraft] = useState<string[]>(saved ?? questions.map(() => ""));
  const [editing, setEditing] = useState(saved === null);

  return (
    <Card title="A few questions from Porchlight">
      <p className="mb-3 text-ink-soft">Your answers go to {PROPERTY.owner} so the right help is sent.</p>
      {editing ? (
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            actions.setTenantAnswers(draft);
            setEditing(false);
          }}
        >
          {questions.map((q, i) => (
            <div key={q}>
              <label htmlFor={`answer-${i}`} className="label">
                {i + 1}. {q}
              </label>
              <input
                id={`answer-${i}`}
                className="field"
                value={draft[i] ?? ""}
                onChange={(e) =>
                  setDraft((prev) => {
                    const next = [...prev];
                    next[i] = e.target.value;
                    return next;
                  })
                }
              />
            </div>
          ))}
          <button type="submit" className="btn btn-primary">
            Send my answers
          </button>
        </form>
      ) : (
        <div role="status">
          <Badge tone="good">Answers sent to {PROPERTY.owner}</Badge>
          <ol className="mt-3 space-y-2">
            {questions.map((q, i) => (
              <li key={q}>
                <p className="font-bold">{q}</p>
                <p className="text-ink-soft">{(saved ?? draft)[i]?.trim() || "(no answer)"}</p>
              </li>
            ))}
          </ol>
          <button type="button" className="btn btn-ghost mt-2" onClick={() => setEditing(true)}>
            Change my answers
          </button>
        </div>
      )}
    </Card>
  );
}

export default function TenantSafetyPage() {
  const { state } = useDemo();
  const { request, triage } = useTriage();
  const heater = heaterBeforeRepair(state);

  return (
    <StepShell stepId="tenant-safety" nextLabel="See request status" nextDisabled={!triage}>
      <Card title="Your report">
        <p className="text-lg">{request.description}</p>
        {request.photos.length > 0 && (
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {request.photos.map((photo, i) => (
              <PhotoThumb key={`${photo.name}-${i}`} photo={photo} className="aspect-[4/3] w-full" />
            ))}
          </div>
        )}
      </Card>

      {!triage ? (
        <Thinking message="Reading your request and photo..." />
      ) : (
        <>
          <UrgencyHero triage={triage} audience="tenant" />

          <Callout tone="info" title="Who handles the repair?">
            <p className="flex items-start gap-2">
              <PeopleIcon size={22} />
              <span>
                <strong>{PROPERTY.owner}</strong> arranges and pays for the repair. You do not need to call a plumber.
                Your part: stay safe, answer the questions below, and be home when the plumber comes.
              </span>
            </p>
          </Callout>

          <Card title="What we think is happening">
            <p className="text-lg">{triage.summary}</p>
          </Card>

          <SafetyChecklist
            steps={triage.safetySteps}
            context={{ manufacturer: heater.manufacturer, model: heater.model, fuelType: heater.fuelType }}
            interactive
          />

          <Questions questions={triage.tenantQuestions} />

          <Callout tone="good" title="✓ Owner notified" role="status">
            <p className="flex items-start gap-2">
              <BellIcon size={22} />
              <span>
                {PROPERTY.owner} was told about this request and the urgency. (Simulated. Nothing was actually
                sent.)
              </span>
            </p>
          </Callout>
        </>
      )}
    </StepShell>
  );
}
