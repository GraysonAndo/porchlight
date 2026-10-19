// Builds the agent log shown on the tenant and owner screens from the real
// state of the demo (the actual triage result, the actual record), so the log
// can never disagree with the screen next to it. The "Watch it work" story in
// lib/scenario.ts uses the same tool names and the same rules.

import { monthYear } from "./format";
import { urgencyWord } from "./triage";
import { SAMPLE_PHOTO_PATH } from "./seed";
import { agentEventsFor, scenarioById, type AgentEvent } from "./scenario";
import type { Approval, Photo, TriageResult, WaterHeaterRecord } from "./types";

const T1 = "4:07 AM";
const T2 = "4:08 AM";
const T3 = "4:10 AM";

export function isHeaterRequest(description: string): boolean {
  return /water heater|hot water|\bheater\b/i.test(description);
}

/**
 * True when this is a water heater repair, so the heater label photo, the quotes,
 * and the booking all apply. A gas smell near the heater is an emergency instead:
 * nobody is asked for a photo, and nothing is quoted until the home is clear.
 */
export function isHeaterJob(description: string, triage: TriageResult | null): boolean {
  if (!isHeaterRequest(description)) return false;
  return triage === null || (triage.category === "Plumbing" && triage.urgency !== "emergency");
}

interface TriageEventsInput {
  request: { description: string; photos: Photo[] };
  triage: TriageResult;
  record: WaterHeaterRecord | null;
}

/** What GoHome did the moment the tenant reported the problem. */
export function triageEvents({ request, triage, record }: TriageEventsInput): AgentEvent[] {
  const events: AgentEvent[] = [];
  const heater = isHeaterRequest(request.description);

  if (request.photos.length > 0) {
    const sample = request.photos.some((p) => p.src === SAMPLE_PHOTO_PATH);
    events.push({
      id: "x-read-photo",
      clock: T1,
      tool: "read_photo",
      engine: "ai",
      title: "Read the photo",
      detail: sample
        ? "Water pooling under a tank water heater, with rust at the base of the tank."
        : "Looked at the photo that came with the report to understand what is happening.",
    });
  }

  events.push({
    id: "x-rules",
    clock: T1,
    tool: "check_emergency_rules",
    engine: "code",
    title: triage.urgency === "emergency" ? `Emergency rule matched: ${triage.category}` : "Checked the emergency rules",
    detail:
      triage.urgency === "emergency"
        ? "This is never a do-it-yourself problem. Fix steps are skipped, and the owner is alerted right now."
        : triage.alertOwnerNow
          ? "Not an emergency, but it needs fast attention, so the owner is alerted right away. No fix steps are given."
          : `No gas smell, fire, sparks, or flooding. Urgency: ${urgencyWord(triage.urgency)}, not an emergency.`,
  });

  events.push({
    id: "x-lookup",
    clock: T1,
    tool: "lookup_house_record",
    engine: "code",
    title: "Looked up the house record",
    detail: !heater
      ? "Checked the house record. Nothing on file is needed for this problem."
      : record
        ? `Water heater on file: ${record.manufacturer} ${record.model}, made ${monthYear(record.manufactureDate)}.`
        : "Water heater on file as \"about 2015\" from the home inspection. Brand, model, and serial are missing.",
  });

  if (triage.urgency !== "emergency" && triage.safetySteps.length > 0) {
    events.push({
      id: "x-steps",
      clock: T2,
      tool: "pick_safety_steps",
      engine: "code",
      title: `Picked ${triage.safetySteps.length} safe step${triage.safetySteps.length === 1 ? "" : "s"} from the guide library`,
      detail: "Steps come from a hand-checked library. The model never improvises a fix.",
    });
  } else {
    events.push({
      id: "x-no-steps",
      clock: T2,
      tool: "skip_fix_steps",
      engine: "code",
      title: "Gave no fix steps",
      detail:
        triage.urgency === "emergency"
          ? "Only getting safe and calling for help. The tenant is not asked to fix anything."
          : "A person or a professional should handle this one. The tenant is not asked to fix anything.",
    });
  }

  if (triage.alertOwnerNow) {
    events.push({
      id: "x-call",
      clock: T2,
      tool: "call_owner",
      engine: "action",
      title: "Called the owner",
      detail: "Emergencies and no-heat problems ring through Do Not Disturb.",
    });
  } else {
    events.push({
      id: "x-notify",
      clock: T2,
      tool: "notify_owner",
      engine: "action",
      title: "Sent a silent heads-up to the owner",
      detail: `Urgency is ${urgencyWord(triage.urgency)}, not an emergency, so there is no phone call. The owner can keep sleeping.`,
    });
  }

  return events;
}

/** The label photo, and how it turned into a house record. Only for water heater problems. */
export function recordEvents(record: WaterHeaterRecord | null, tenantSkipped: boolean): AgentEvent[] {
  if (record) {
    return [
      {
        id: "x-read-label",
        clock: T3,
        tool: "read_label",
        engine: "ai",
        title: "Read the label",
        detail: `${record.manufacturer} ${record.model}, ${record.capacityGallons} gallon, ${record.fuelType.toLowerCase()}, made ${monthYear(record.manufactureDate)}.${
          record.unconfirmed.length > 0 ? " One field was read with low confidence and needs a person to confirm it." : ""
        }`,
      },
      {
        id: "x-record",
        clock: T3,
        tool: "update_house_record",
        engine: "code",
        title: "Built the house record",
        detail: `Saved the make, model, and manufacture date. Age: ${record.ageYears} years. Source: ${record.source}.`,
      },
    ];
  }
  return [
    {
      id: "x-ask-label",
      clock: "4:09 AM",
      tool: "request_label_photo",
      engine: "ai",
      title: tenantSkipped ? "Asked the tenant for a photo, but they could not reach the label" : "Asked the tenant for a photo of the label",
      detail: tenantSkipped
        ? "The owner is asked to add the details instead, by photo or by typing them in."
        : "Only asked because the record has no model or serial. Waiting for the photo.",
    },
  ];
}

/** Getting and checking quotes. Same events as the Watch it work story. */
export function quoteEvents(): AgentEvent[] {
  return agentEventsFor(scenarioById("leak"), ["decide", "request-quotes", "quotes-arrive", "check-quotes"]);
}

/** What happened after the owner approved. */
export function bookingEvents(approval: Approval | null): AgentEvent[] {
  if (!approval) return [];
  return agentEventsFor(scenarioById("leak"), ["approve"]).map((e) => ({ ...e, id: `x-${e.id}` }));
}
