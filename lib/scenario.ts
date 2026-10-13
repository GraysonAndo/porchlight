// The scripted "Watch it work" story. It shows what the tenant sees, what the
// owner sees, and what Porchlight's agent does in between, at the same moment.
//
// Every number and verdict here comes from the same plain code the rest of the
// app uses (triage rules, quote check, repair or replace, recommendation), so
// the demo cannot say one thing while the screens say another.
//
// Rules the tests enforce:
//  - The tenant never sees a price, a quote, or an owner decision.
//  - Anything that spends money waits for the owner's tap.
//  - Emergencies skip do-it-yourself steps and alert the owner right away.

import { decideRepairOrReplace } from "./decision";
import { usd } from "./format";
import { compareQuote } from "./quote";
import { checkCandidates, recommendQuote, type Candidate } from "./recommend";
import {
  ACCESS_WINDOWS,
  NEW_HEATER_RECORD,
  QUOTES,
  REPAIR_ESTIMATE,
  SAMPLE_LABEL_READING,
  SEED_REQUEST_TEXT,
  VENDORS,
  WATER_HEATER_JOB,
} from "./seed";
import { triageText } from "./triage";
import type { Urgency } from "./types";

/**
 * Who did the work:
 *  ai     : the model read a photo or wrote text
 *  code   : plain code and a hand-checked table decided
 *  action : Porchlight did something, inside limits the owner set
 *  human  : a person had to tap
 */
export type Engine = "ai" | "code" | "action" | "human";

export interface AgentEvent {
  id: string;
  clock: string;
  tool: string;
  engine: Engine;
  title: string;
  detail: string;
}

export interface TenantItem {
  id: string;
  clock: string;
  from: "tenant" | "agent";
  kind: "text" | "photo" | "steps" | "photo-request" | "booking" | "tap";
  text: string;
  photo?: "leak" | "label";
  steps?: string[];
  urgency?: Urgency;
}

export interface OwnerItem {
  id: string;
  clock: string;
  kind: "push" | "call" | "summary" | "decision" | "tap" | "done";
  title: string;
  text: string;
  urgency?: Urgency;
  decision?: {
    vendorName: string;
    total: number;
    limit: number;
    window: string;
    reasons: string[];
    skipped: string[];
    saved: number;
  };
}

export interface ScenarioStep {
  id: string;
  /** Minutes since midnight on day 0. The next day adds 1440. */
  at: number;
  clock: string;
  headline: string;
  ownerAsleep: boolean;
  tenant: TenantItem[];
  owner: OwnerItem[];
  agent: AgentEvent[];
}

export interface Scenario {
  id: "leak" | "gas";
  title: string;
  blurb: string;
  steps: ScenarioStep[];
}

export interface Scene {
  index: number;
  step: ScenarioStep;
  tenant: TenantItem[];
  owner: OwnerItem[];
  agent: AgentEvent[];
  ownerAsleep: boolean;
  /** True on the last step */
  done: boolean;
}

function clockOf(minutes: number): string {
  const day = Math.floor(minutes / 1440);
  const m = minutes % 1440;
  const h24 = Math.floor(m / 60);
  const min = String(m % 60).padStart(2, "0");
  const suffix = h24 >= 12 ? "PM" : "AM";
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${day > 0 ? "Next day, " : ""}${h12}:${min} ${suffix}`;
}

function at(h: number, m: number, day = 0): number {
  return day * 1440 + h * 60 + m;
}

// ---------------------------------------------------------------------------
// Scenario 1: an urgent water heater leak at 4:07 AM
// ---------------------------------------------------------------------------

function buildLeakScenario(): Scenario {
  const triage = triageText(SEED_REQUEST_TEXT);

  // Real checks, so the demo matches the screens.
  const candidates: Candidate[] = VENDORS.map((v) => ({
    vendorId: v.id,
    vendorName: v.name,
    license: v.license,
    quote: QUOTES.find((q) => q.vendorId === v.id)!,
  }));
  const checked = checkCandidates(candidates, WATER_HEATER_JOB);
  const rec = recommendQuote(checked)!;
  const decision = decideRepairOrReplace({
    item: "Water heater",
    ageYears: SAMPLE_LABEL_READING.ageYears,
    typicalLifeYears: 10,
    repairCost: REPAIR_ESTIMATE,
    replaceCost: Math.round((WATER_HEATER_JOB.marketTotal.low + WATER_HEATER_JOB.marketTotal.high) / 2),
    failureMode: "tank leak",
  });
  const bayside = QUOTES[0];
  const baysideCompare = compareQuote(bayside, WATER_HEATER_JOB);
  const laborRange = WATER_HEATER_JOB.marketLines.labor;
  const baysideLabor = bayside.lines.find((l) => l.id === "labor")!.amount;
  const window = ACCESS_WINDOWS[0];
  const market = WATER_HEATER_JOB.marketTotal;
  const verdictOf = (id: string) => checked.find((c) => c.vendorId === id)!.verdict;
  const a1 = checked.find((c) => c.vendorId === "a1-rapid")!;

  const step = (id: string, minutes: number, headline: string, ownerAsleep: boolean, parts: Partial<ScenarioStep>): ScenarioStep => ({
    id,
    at: minutes,
    clock: clockOf(minutes),
    headline,
    ownerAsleep,
    tenant: [],
    owner: [],
    agent: [],
    ...parts,
  });

  const steps: ScenarioStep[] = [
    step("report", at(4, 7), "The tenant texts at 4:07 AM. The owner is asleep.", true, {
      tenant: [
        { id: "t1", clock: clockOf(at(4, 7)), from: "tenant", kind: "text", text: SEED_REQUEST_TEXT },
        { id: "t2", clock: clockOf(at(4, 7)), from: "tenant", kind: "photo", photo: "leak", text: "Photo of the water heater" },
      ],
    }),
    step("triage", at(4, 7), "Porchlight reads the photo and checks the emergency rules.", true, {
      agent: [
        {
          id: "a-read-photo",
          clock: clockOf(at(4, 7)),
          tool: "read_photo",
          engine: "ai",
          title: "Read the photo",
          detail: "Water pooling under a tank water heater, with rust at the base of the tank.",
        },
        {
          id: "a-rules",
          clock: clockOf(at(4, 7)),
          tool: "check_emergency_rules",
          engine: "code",
          title: "Checked the emergency rules",
          detail: "No gas smell, fire, sparks, or flooding. Urgency: soon, not an emergency.",
        },
        {
          id: "a-lookup",
          clock: clockOf(at(4, 7)),
          tool: "lookup_house_record",
          engine: "code",
          title: "Looked up the house record",
          detail: "Water heater on file as \"about 2015\" from the home inspection. Brand, model, and serial are missing.",
        },
      ],
    }),
    step("steps", at(4, 8), "Porchlight gives the tenant safe steps. No one had to wake up.", true, {
      tenant: [
        {
          id: "t3",
          clock: clockOf(at(4, 8)),
          from: "agent",
          kind: "steps",
          urgency: triage.urgency,
          text: "This needs a plumber soon, but it is not an emergency. Do these while your owner arranges help. Tap any step for simple instructions.",
          steps: triage.safetySteps,
        },
      ],
      agent: [
        {
          id: "a-steps",
          clock: clockOf(at(4, 8)),
          tool: "pick_safety_steps",
          engine: "code",
          title: "Picked 4 safe steps from the guide library",
          detail: "Steps come from a hand-checked library. The model never improvises a fix.",
        },
      ],
    }),
    step("heads-up", at(4, 8), "The owner gets a quiet heads-up, not a phone call.", true, {
      owner: [
        {
          id: "o1",
          clock: clockOf(at(4, 8)),
          kind: "push",
          urgency: "urgent",
          title: "Urgent: water heater leak",
          text: "1200 Example Court. Your tenant has safe steps. I'm handling the next steps. Nothing needed from you yet.",
        },
      ],
      agent: [
        {
          id: "a-notify",
          clock: clockOf(at(4, 8)),
          tool: "notify_owner",
          engine: "action",
          title: "Sent a silent heads-up to the owner",
          detail: "Urgent but not an emergency, so no phone call. The owner can sleep. An emergency would ring through.",
        },
      ],
    }),
    step("ask-label", at(4, 9), "Porchlight notices the record is missing and asks for one photo.", true, {
      tenant: [
        {
          id: "t4",
          clock: clockOf(at(4, 9)),
          from: "agent",
          kind: "photo-request",
          text: "I do not have this water heater's model or age on file. Could you take a photo of the label on the side of the tank? Hold steady and skip the flash.",
        },
      ],
      agent: [
        {
          id: "a-ask",
          clock: clockOf(at(4, 9)),
          tool: "request_label_photo",
          engine: "ai",
          title: "Asked the tenant for a photo of the label",
          detail: "Only asked because the record had no model or serial. Once it is on file, nobody is asked again.",
        },
      ],
    }),
    step("label-photo", at(4, 10), "The tenant sends the label photo.", true, {
      tenant: [{ id: "t5", clock: clockOf(at(4, 10)), from: "tenant", kind: "photo", photo: "label", text: "Photo of the label" }],
    }),
    step("read-label", at(4, 10), "Porchlight reads the label and builds the house record.", true, {
      tenant: [
        {
          id: "t6",
          clock: clockOf(at(4, 10)),
          from: "agent",
          kind: "text",
          text: `Thanks. I read the serial number as ${SAMPLE_LABEL_READING.serial}, but the print is smudged. Is that right?`,
        },
      ],
      agent: [
        {
          id: "a-read-label",
          clock: clockOf(at(4, 10)),
          tool: "read_label",
          engine: "ai",
          title: "Read the label",
          detail: `${SAMPLE_LABEL_READING.manufacturer} ${SAMPLE_LABEL_READING.model}, 40 gallon, natural gas, made March 2015. The serial was read with low confidence.`,
        },
        {
          id: "a-record",
          clock: clockOf(at(4, 10)),
          tool: "update_house_record",
          engine: "code",
          title: "Built the house record",
          detail: "Saved the make, model, and manufacture date. Age: 11 years.",
        },
      ],
    }),
    step("confirm", at(4, 11), "A person confirms the one field the AI was unsure about.", true, {
      tenant: [{ id: "t7", clock: clockOf(at(4, 11)), from: "tenant", kind: "tap", text: "Yes, that is right" }],
      agent: [
        {
          id: "a-confirm",
          clock: clockOf(at(4, 11)),
          tool: "confirm_field",
          engine: "human",
          title: "Serial number confirmed by the tenant",
          detail: "Low confidence fields always get a human check before they go in the record.",
        },
      ],
    }),
    step("decide", at(4, 12), "Plain code decides repair or replace. The model does not.", true, {
      agent: [
        {
          id: "a-repair-replace",
          clock: clockOf(at(4, 12)),
          tool: "repair_or_replace",
          engine: "code",
          title: `Recommends: ${decision.recommendation}`,
          detail: `${decision.reasons.join(" ")} Rule: replace at 80% of typical life, or when the tank leaks.`,
        },
        {
          id: "a-price-table",
          clock: clockOf(at(4, 12)),
          tool: "lookup_price_table",
          engine: "code",
          title: "Looked up a typical price",
          detail: `${usd(market.low)} to ${usd(market.high)} for a 40 gallon gas swap, from a hand-checked table (placeholder numbers).`,
        },
      ],
    }),
    step("request-quotes", at(4, 13), "Porchlight asks 3 vendors for quotes. The job arrives pre-diagnosed.", true, {
      agent: [
        {
          id: "a-request-quotes",
          clock: clockOf(at(4, 13)),
          tool: "request_quotes",
          engine: "action",
          title: "Asked 3 vendors for quotes",
          detail: "Sent the photo, the exact model, its age, and the tenant's access window. No money committed.",
        },
      ],
    }),
    step("quotes-arrive", at(5, 40), "The quotes arrive. Porchlight reads them.", true, {
      agent: [
        {
          id: "a-parse",
          clock: clockOf(at(5, 40)),
          tool: "read_quotes",
          engine: "ai",
          title: "Read 3 itemized quotes",
          detail: `${QUOTES.map((q) => usd(q.total)).join(", ")}. Each line item was pulled out so it can be checked.`,
        },
      ],
    }),
    step("check-quotes", at(5, 41), "Plain code checks every quote against the price table.", true, {
      agent: [
        {
          id: "a-check-bayside",
          clock: clockOf(at(5, 41)),
          tool: "check_quote",
          engine: "code",
          title: `${bayside.vendorName}: ${verdictOf("bayside")}`,
          detail: `Total ${usd(bayside.total)} is ${Math.round(baysideCompare.total.percentOverTop)}% above the top of the range. Labor ${usd(baysideLabor)} vs ${usd(laborRange.low)} to ${usd(laborRange.high)}.`,
        },
        {
          id: "a-check-willow",
          clock: clockOf(at(5, 41)),
          tool: "check_quote",
          engine: "code",
          title: `${QUOTES[1].vendorName}: ${verdictOf("willow-glen")}`,
          detail: `Total ${usd(QUOTES[1].total)} is inside the range. License shown.`,
        },
        {
          id: "a-check-a1",
          clock: clockOf(at(5, 41)),
          tool: "check_quote",
          engine: "code",
          title: `${QUOTES[2].vendorName}: ${verdictOf("a1-rapid")}, but skipped`,
          detail: `${usd(QUOTES[2].total)} is a fair price, but no license number is shown and there is no ${a1.missingLines.join(" or ")} line.`,
        },
        {
          id: "a-recommend",
          clock: clockOf(at(5, 41)),
          tool: "recommend_vendor",
          engine: "code",
          title: `Recommends ${rec.vendorName}`,
          detail: rec.reasons.join(" "),
        },
      ],
    }),
    step("owner-wakes", at(6, 45), "The owner wakes up to one decision, already prepared.", false, {
      owner: [
        {
          id: "o2",
          clock: clockOf(at(6, 45)),
          kind: "decision",
          title: "One decision needed",
          text: "While you slept: the leak was triaged, your tenant is safe, the water heater is in your house record, and 3 quotes were checked. Nothing is booked or spent until you tap.",
          decision: {
            vendorName: rec.vendorName,
            total: rec.total,
            limit: rec.notToExceed,
            window,
            reasons: rec.reasons,
            skipped: rec.skipped.map((s) => `${s.vendorName}: ${s.reason}`),
            saved: rec.savedVsHighest,
          },
        },
      ],
    }),
    step("approve", at(6, 46), "One tap from the owner. Only now does Porchlight spend or book.", false, {
      owner: [{ id: "o3", clock: clockOf(at(6, 46)), kind: "tap", title: "You approved", text: `${rec.vendorName}, ${usd(rec.total)}, limit ${usd(rec.notToExceed)}.` }],
      tenant: [
        {
          id: "t8",
          clock: clockOf(at(6, 47)),
          from: "agent",
          kind: "booking",
          text: `Your owner booked ${rec.vendorName}. They will come ${window.toLowerCase()}. Please be home, or make sure they can reach the garage.`,
        },
      ],
      agent: [
        {
          id: "a-approved",
          clock: clockOf(at(6, 46)),
          tool: "owner_approval",
          engine: "human",
          title: "Owner approved with one tap",
          detail: "The agent cannot book or spend before this tap.",
        },
        {
          id: "a-book",
          clock: clockOf(at(6, 47)),
          tool: "book_vendor",
          engine: "action",
          title: `Booked ${rec.vendorName}`,
          detail: `Spending is capped at ${usd(rec.notToExceed)}. The vendor must call the owner before going over.`,
        },
        {
          id: "a-message-tenant",
          clock: clockOf(at(6, 47)),
          tool: "message_tenant",
          engine: "ai",
          title: "Told the tenant the plumber and the time",
          detail: "The tenant sees who and when. The tenant never sees prices.",
        },
      ],
    }),
    step("tenant-confirms", at(6, 52), "The tenant confirms the time.", false, {
      tenant: [{ id: "t9", clock: clockOf(at(6, 52)), from: "tenant", kind: "tap", text: "That time works" }],
      agent: [
        {
          id: "a-access",
          clock: clockOf(at(6, 52)),
          tool: "confirm_access",
          engine: "human",
          title: "Tenant confirmed the visit window",
          detail: "The vendor was told the window is confirmed.",
        },
      ],
    }),
    step("done", at(11, 20, 1), "The job is done. The record updates itself. Nobody typed anything.", false, {
      tenant: [{ id: "t10", clock: clockOf(at(11, 20, 1)), from: "agent", kind: "text", text: "All fixed. The new water heater is installed. Thank you for your help." }],
      owner: [
        {
          id: "o4",
          clock: clockOf(at(11, 20, 1)),
          kind: "done",
          title: "Done",
          text: `The new ${NEW_HEATER_RECORD.manufacturer} ${NEW_HEATER_RECORD.model} (serial ${NEW_HEATER_RECORD.serial}) is in your house record, straight from the installer. The old one is marked replaced, and your 5-year forecast is updated.`,
          decision: undefined,
        },
      ],
      agent: [
        {
          id: "a-install",
          clock: clockOf(at(11, 20, 1)),
          tool: "update_house_record",
          engine: "code",
          title: "Added the new heater from the installer's registration",
          detail: `${NEW_HEATER_RECORD.manufacturer} ${NEW_HEATER_RECORD.model}, serial ${NEW_HEATER_RECORD.serial}. No photo, no typing. The old heater is marked replaced.`,
        },
        {
          id: "a-forecast",
          clock: clockOf(at(11, 20, 1)),
          tool: "update_forecast",
          engine: "code",
          title: "Reset the 5-year forecast",
          detail: "The water heater is no longer overdue. Next big item: the air conditioner in 2027.",
        },
      ],
    }),
  ];

  return {
    id: "leak",
    title: "Water heater leak (soon)",
    blurb: "The tenant texts at 4:07 AM. By 6:46 AM the owner has made one tap.",
    steps,
  };
}

// ---------------------------------------------------------------------------
// Scenario 2: a gas smell at 4:07 AM (an emergency)
// ---------------------------------------------------------------------------

function buildGasScenario(): Scenario {
  const text = "I smell gas near the water heater";
  const triage = triageText(text);

  const mk = (id: string, minutes: number, headline: string, parts: Partial<ScenarioStep>): ScenarioStep => ({
    id,
    at: minutes,
    clock: clockOf(minutes),
    headline,
    ownerAsleep: true,
    tenant: [],
    owner: [],
    agent: [],
    ...parts,
  });

  const steps: ScenarioStep[] = [
    mk("report", at(4, 7), "The tenant texts at 4:07 AM about a gas smell.", {
      tenant: [{ id: "g1", clock: clockOf(at(4, 7)), from: "tenant", kind: "text", text }],
    }),
    mk("rules", at(4, 7), "The emergency rule fires. Porchlight skips the fix steps.", {
      agent: [
        {
          id: "ga-rules",
          clock: clockOf(at(4, 7)),
          tool: "check_emergency_rules",
          engine: "code",
          title: "Emergency rule matched: gas smell",
          detail: "A gas smell is never a do-it-yourself problem. No fix steps are given. Alerting the owner right now.",
        },
      ],
    }),
    mk("tenant-told", at(4, 7), "The tenant is told to get out and call for help. Nothing else.", {
      tenant: [
        {
          id: "g2",
          clock: clockOf(at(4, 7)),
          from: "agent",
          kind: "steps",
          urgency: "emergency",
          text: "A gas smell can be dangerous. Do these now.",
          steps: triage.safetySteps,
        },
      ],
    }),
    mk("owner-called", at(4, 7), "The owner's phone rings through Do Not Disturb.", {
      owner: [
        {
          id: "go1",
          clock: clockOf(at(4, 7)),
          kind: "call",
          urgency: "emergency",
          title: "Emergency call: gas smell",
          text: "Porchlight is calling you. Your tenant reports a gas smell at 1200 Example Court and was told to leave and call 911.",
        },
      ],
      agent: [
        {
          id: "ga-call",
          clock: clockOf(at(4, 7)),
          tool: "call_owner",
          engine: "action",
          title: "Called the owner",
          detail: "Emergencies ring through Do Not Disturb. A repair that can wait a few hours only sends a quiet message.",
        },
      ],
    }),
    mk("incident", at(4, 8), "Porchlight writes down exactly what happened, with times.", {
      agent: [
        {
          id: "ga-log",
          clock: clockOf(at(4, 8)),
          tool: "log_incident",
          engine: "code",
          title: "Saved the incident timeline",
          detail: "Times, the tenant's words, and what was done. Useful for insurance and for the gas utility.",
        },
      ],
    }),
    mk("tenant-out", at(4, 15), "The tenant is outside and has called for help.", {
      owner: [],
      tenant: [{ id: "g3", clock: clockOf(at(4, 15)), from: "tenant", kind: "tap", text: "We are outside. I called 911." }],
    }),
    mk("hold", at(4, 16), "Porchlight holds off booking anyone until it is safe.", {
      owner: [
        {
          id: "go2",
          clock: clockOf(at(4, 16)),
          kind: "summary",
          title: "Tenant is out safely",
          text: "The tenant is outside and called 911. I have not booked a plumber. I will wait until the gas utility says the home is safe, then start the repair steps.",
        },
      ],
      agent: [
        {
          id: "ga-hold",
          clock: clockOf(at(4, 16)),
          tool: "hold_repair_workflow",
          engine: "code",
          title: "Paused repair scheduling",
          detail: "No vendor is sent until the home is cleared. Nothing is spent.",
        },
      ],
    }),
  ];

  return {
    id: "gas",
    title: "Gas smell (emergency)",
    blurb: "A different rule fires: no fix steps, and the owner's phone rings.",
    steps,
  };
}

export const SCENARIOS: Scenario[] = [buildLeakScenario(), buildGasScenario()];

export function scenarioById(id: string): Scenario {
  return SCENARIOS.find((s) => s.id === id) ?? SCENARIOS[0];
}

/** Everything that has happened up to and including step `index`. */
export function sceneAt(scenario: Scenario, index: number): Scene {
  const last = scenario.steps.length - 1;
  const i = Math.min(Math.max(index, 0), last);
  const upto = scenario.steps.slice(0, i + 1);
  return {
    index: i,
    step: scenario.steps[i],
    tenant: upto.flatMap((s) => s.tenant),
    owner: upto.flatMap((s) => s.owner),
    agent: upto.flatMap((s) => s.agent),
    ownerAsleep: scenario.steps[i].ownerAsleep,
    done: i === last,
  };
}

/** The agent events for the named steps, for showing on the main screens. */
export function agentEventsFor(scenario: Scenario, stepIds: string[]): AgentEvent[] {
  return scenario.steps.filter((s) => stepIds.includes(s.id)).flatMap((s) => s.agent);
}

export interface ScenarioStats {
  /** Minutes from the tenant's first message to Porchlight's first reply with steps */
  tenantWaitMinutes: number;
  /** How many times the owner had to tap */
  ownerTaps: number;
  /** Minutes the owner was needed: from the decision card to the tap */
  ownerMinutes: number;
  saved: number;
  quotesChecked: number;
}

export function statsFor(scenario: Scenario): ScenarioStats {
  const firstTenant = scenario.steps.find((s) => s.tenant.some((t) => t.from === "tenant"));
  const firstReply = scenario.steps.find((s) => s.tenant.some((t) => t.kind === "steps"));
  const decisionStep = scenario.steps.find((s) => s.owner.some((o) => o.kind === "decision"));
  const tapStep = scenario.steps.find((s) => s.owner.some((o) => o.kind === "tap"));
  const decision = scenario.steps.flatMap((s) => s.owner).find((o) => o.kind === "decision")?.decision;
  return {
    tenantWaitMinutes: firstTenant && firstReply ? firstReply.at - firstTenant.at : 0,
    ownerTaps: scenario.steps.flatMap((s) => s.owner).filter((o) => o.kind === "tap").length,
    ownerMinutes: decisionStep && tapStep ? tapStep.at - decisionStep.at : 0,
    saved: decision?.saved ?? 0,
    quotesChecked: scenario.steps.flatMap((s) => s.agent).filter((a) => a.tool === "check_quote").length,
  };
}
