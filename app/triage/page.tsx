"use client";

import { useEffect, useState } from "react";
import { StepShell } from "@/components/StepShell";
import { PhotoThumb } from "@/components/PhotoPicker";
import { AlertIcon, CheckIcon, ShieldIcon } from "@/components/icons";
import { Badge, Callout, Card, Thinking } from "@/components/ui";
import { ai } from "@/lib/ai";
import { PROPERTY, SEED_REQUEST } from "@/lib/seed";
import { useDemo } from "@/lib/store";
import type { Urgency } from "@/lib/types";

const URGENCY_LABEL: Record<Urgency, string> = {
  emergency: "EMERGENCY",
  urgent: "URGENT",
  routine: "ROUTINE",
};

const URGENCY_NOTE: Record<Urgency, string> = {
  emergency: "Act now. Follow the safety steps and call for help.",
  urgent: "Needs a professional soon, but not an emergency.",
  routine: "Can wait for a normal visit.",
};

export default function TriagePage() {
  const { state, actions, hydrated } = useDemo();
  const request = state.request ?? SEED_REQUEST;
  const triage = state.triage;
  const [checked, setChecked] = useState<boolean[]>([]);

  // Run the mock AI once per request. The result is saved, so coming back is instant.
  useEffect(() => {
    if (!hydrated || triage) return;
    let cancelled = false;
    ai.triageRequest({ description: request.description, photos: request.photos }).then((result) => {
      if (!cancelled) actions.setTriage(result);
    });
    return () => {
      cancelled = true;
    };
  }, [hydrated, triage, request.description, request.photos, actions]);

  const tone = triage?.urgency === "routine" ? "good" : "urgent";

  return (
    <StepShell
      step={2}
      nextLabel="Read the equipment label"
      skipLabel="Skip"
      skipHref="/record"
      nextDisabled={!triage}
    >
      <Card title="Your request">
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
          <div
            className={`reveal flex items-center gap-4 rounded-3xl border-2 p-5 sm:p-6 ${
              tone === "good" ? "border-good bg-good-tint" : "border-urgent bg-urgent-tint"
            }`}
          >
            <span
              className={`inline-flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white ${
                tone === "good" ? "text-good-ink" : "text-urgent"
              }`}
            >
              {tone === "good" ? <CheckIcon size={34} /> : <AlertIcon size={34} />}
            </span>
            <div>
              <p className="eyebrow">Urgency</p>
              <p className={`text-4xl font-extrabold leading-none ${tone === "good" ? "text-good-ink" : "text-urgent"}`}>
                {URGENCY_LABEL[triage.urgency]}
              </p>
              <p className="mt-1 font-bold text-ink">{URGENCY_NOTE[triage.urgency]}</p>
            </div>
          </div>

          <Card>
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="neutral" icon={false}>
                {triage.category}
              </Badge>
              <Badge tone="neutral" icon={false}>
                Suggested: {triage.suggestedTrade}
              </Badge>
            </div>
            <p className="mt-3 text-lg">{triage.summary}</p>

            <h3 className="mt-5 text-lg font-extrabold">Likely cause</h3>
            <p>{triage.likelyCause}</p>

            <div className="mt-5">
              <p className="text-sm font-bold text-ink-soft">
                AI confidence: {Math.round(triage.confidence * 100)}% (sample result)
              </p>
              <div
                className="mt-1 h-2.5 w-full max-w-xs rounded-full bg-cream-deep"
                role="img"
                aria-label={`Confidence ${Math.round(triage.confidence * 100)} percent`}
              >
                <div
                  className="bar-grow h-full rounded-full bg-good"
                  style={{ width: `${Math.round(triage.confidence * 100)}%` }}
                />
              </div>
            </div>
          </Card>

          <Card
            title={
              <span className="flex items-center gap-2">
                <ShieldIcon /> Safety steps for the tenant
              </span>
            }
          >
            <p className="mb-2 text-ink-soft">Check each one off as it is done.</p>
            <ul className="space-y-1">
              {triage.safetySteps.map((step, i) => (
                <li key={step}>
                  <label className="flex min-h-11 cursor-pointer items-start gap-3 rounded-lg py-1.5">
                    <input
                      type="checkbox"
                      className="mt-1 h-6 w-6 shrink-0 accent-[#2e7d5b]"
                      checked={checked[i] ?? false}
                      onChange={(e) =>
                        setChecked((prev) => {
                          const next = [...prev];
                          next[i] = e.target.checked;
                          return next;
                        })
                      }
                    />
                    <span className={checked[i] ? "text-ink-soft line-through" : ""}>{step}</span>
                  </label>
                </li>
              ))}
            </ul>
          </Card>

          <Card title="Questions we sent the tenant">
            <ol className="list-decimal space-y-2 pl-6">
              {triage.tenantQuestions.map((q) => (
                <li key={q}>{q}</li>
              ))}
            </ol>
          </Card>

          <Callout tone="good" title="✓ Owner notified" role="status">
            <p>
              {PROPERTY.owner} was told about this request and the urgency. (Simulated. Nothing was actually
              sent.)
            </p>
          </Callout>
        </>
      )}
    </StepShell>
  );
}
