"use client";

import { useState } from "react";
import { AlertIcon, CheckIcon, ShieldIcon } from "./icons";
import { SafetyGuideCard } from "./SafetyGuideCard";
import { Card } from "./ui";
import { guideForStep, type HouseContext } from "@/lib/safetyGuides";
import { URGENCY_LABEL } from "@/lib/triage";
import type { TriageResult, Urgency } from "@/lib/types";

export { URGENCY_LABEL };

const NOTE: Record<"tenant" | "owner", Record<Urgency, string>> = {
  tenant: {
    emergency: "Act now. Follow the safety steps below, then call for help.",
    urgent: "This needs a professional soon. Do the steps below while the owner arranges the visit.",
    routine: "This can wait for a normal visit. The owner will arrange it.",
  },
  owner: {
    emergency: "Treat this as an emergency. The tenant was told to get safe and call for help.",
    urgent: "Get a plumber out soon. The tenant has been given safety steps.",
    routine: "This can wait for a normal visit. Nothing needs to happen today.",
  },
};

function noteFor(triage: TriageResult, audience: "tenant" | "owner"): string {
  if (triage.alertOwnerNow && triage.safetySteps.length === 0) {
    return audience === "tenant"
      ? "This needs a professional soon. Your owner is being called right now. There is nothing for you to fix."
      : "GoHome called you because this cannot wait. The tenant was given no fix steps.";
  }
  if (triage.alertOwnerNow && triage.urgency !== "emergency") {
    return audience === "tenant"
      ? "This needs fast attention. Your owner is being called right now."
      : "GoHome alerted you right away because this cannot wait.";
  }
  return NOTE[audience][triage.urgency];
}

/** The big urgency banner at the top of a triage result. */
export function UrgencyHero({ triage, audience }: { triage: TriageResult; audience: "tenant" | "owner" }) {
  const good = triage.urgency === "routine";
  return (
    <div
      className={`reveal flex items-center gap-4 rounded-3xl border-2 p-5 sm:p-6 ${
        good ? "border-good bg-good-tint" : "border-urgent bg-urgent-tint"
      }`}
    >
      <span
        className={`inline-flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white ${
          good ? "text-good-ink" : "text-urgent"
        }`}
      >
        {good ? <CheckIcon size={34} /> : <AlertIcon size={34} />}
      </span>
      <div>
        <p className="eyebrow">Urgency</p>
        <p className={`text-4xl font-extrabold leading-none ${good ? "text-good-ink" : "text-urgent"}`}>
          {URGENCY_LABEL[triage.urgency]}
        </p>
        <p className="mt-1 font-bold text-ink">{noteFor(triage, audience)}</p>
      </div>
    </div>
  );
}

/** Which kinds of equipment the safety steps are about, for the house record strip. */
function aboutHeater(steps: string[]): boolean {
  return steps.some((step) => /water supply valve|gas valve/i.test(step));
}

interface SafetyChecklistProps {
  steps: string[];
  context: HouseContext;
  /** The tenant checks steps off. The owner only reads them. */
  interactive: boolean;
}

/** Safety steps with a "How to do this" guide under each one. */
export function SafetyChecklist({ steps, context, interactive }: SafetyChecklistProps) {
  const [checked, setChecked] = useState<boolean[]>([]);
  if (steps.length === 0) {
    return (
      <Card
        title={
          <span className="flex items-center gap-2">
            <ShieldIcon /> {interactive ? "Safety steps for you" : "What the tenant was told to do"}
          </span>
        }
      >
        <p className="text-lg font-bold">
          {interactive
            ? "There is nothing for you to fix. Please do not try to repair this yourself."
            : "No fix steps were given. GoHome does not ask tenants to repair this kind of problem."}
        </p>
        <p className="mt-1 text-ink-soft">
          {interactive
            ? "Your owner has been told and will send a professional. Keep warm, keep clear of the area, and stay reachable by phone."
            : "The tenant was told to stay clear and keep their phone on."}
        </p>
      </Card>
    );
  }
  const heater = aboutHeater(steps);
  const recordName = [context.manufacturer, context.model].filter(Boolean).join(" ");

  return (
    <Card
      title={
        <span className="flex items-center gap-2">
          <ShieldIcon /> {interactive ? "Safety steps for you" : "What the tenant was told to do"}
        </span>
      }
    >
      <p className="mb-3 text-ink-soft">
        {interactive ? (
          <>
            Check each one off as it is done. Tap <strong className="text-ink">How to do this</strong> under a step for
            simple instructions, so you do not have to look anything up.
          </>
        ) : (
          <>The tenant sees these steps with a &quot;How to do this&quot; guide under each one, matched to the equipment in your house record.</>
        )}
      </p>

      {heater && recordName && (
        <div className="mb-3 rounded-2xl bg-glow-tint px-4 py-3 text-sm">
          <p className="eyebrow">From the house record</p>
          <p className="mt-0.5 font-bold">
            Water heater: {recordName}
            {context.fuelType ? `, ${context.fuelType.toLowerCase()}` : ""}. The guides match this heater.
          </p>
        </div>
      )}

      <ul className="space-y-3">
        {steps.map((step, i) => {
          const guide = guideForStep(step, context);
          return (
            <li key={step}>
              {interactive ? (
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
              ) : (
                <p className="flex gap-3 py-1">
                  <span
                    aria-hidden="true"
                    className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-ink text-sm font-extrabold text-cream"
                  >
                    {i + 1}
                  </span>{" "}
                  <span>{step}</span>
                </p>
              )}
              {interactive && guide && (
                <details className="ml-9">
                  <summary className="inline-flex min-h-11 cursor-pointer items-center rounded-lg px-1 font-bold underline underline-offset-4">
                    How to do this
                  </summary>
                  <SafetyGuideCard guide={guide} />
                </details>
              )}
            </li>
          );
        })}
      </ul>
      {interactive && (
        <p className="mt-3 text-sm text-ink-soft">
          General safety information, not a substitute for a professional. If you are unsure, stop and call the owner.
        </p>
      )}
    </Card>
  );
}
