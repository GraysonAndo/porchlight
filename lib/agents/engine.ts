// The agent runtime: a pure event reducer. Give it a world and an event, get a
// new world. Three agents live inside (triage, quote audit, compliance sentinel).
//
// The rule that makes it trustworthy: the AI-flavored steps only read photos and
// write words. Every number, rule, and legal limit comes from the plain code in
// lib/*.ts, and every spend or send to a third party waits for an owner tap.
// The "AI" wording here is deterministic sample text (the same idea as
// lib/mockAI.ts), so a real model can be swapped in behind it later.

import { isHeaterJob } from "../agentLog";
import { decideRepairOrReplace } from "../decision";
import { equipmentFor } from "../equipment";
import { buildForecast } from "../forecast";
import { addDays, longDate, usd, usdCents, usdRange } from "../format";
import { ageOf } from "../life";
import { COLLECTED, PLAN } from "../plan";
import { compareQuote, percentOverTop, verdictFor } from "../quote";
import { SAMPLE_QUOTE_TEXT, parseQuoteText } from "../quoteParse";
import { buildNotice, calculateRent, effectiveDateFor } from "../rent";
import { answerHouseQuestion, classifyTenantText } from "../houseQa";
import { recordFromValues } from "./record";
import {
  ACCESS_WINDOWS,
  DEFAULT_RENT_FORM,
  EQUIPMENT,
  NEW_HEATER_RECORD,
  PROPERTY,
  RENT_MONTH,
  REPAIR_ESTIMATE,
  VENDORS,
  WATER_HEATER_JOB,
} from "../seed";
import { guideForStep } from "../safetyGuides";
import { seededHeaterTriage, triageText, urgencyWord } from "../triage";
import type { Verdict, VendorQuote } from "../types";
import type {
  AgentName,
  Attachment,
  Channel,
  Engine,
  Entry,
  Ev,
  Msg,
  MsgAction,
  MsgCard,
  Party,
  PhotoKind,
  TimerId,
  World,
} from "./types";

import { guideForText } from "../homeGuides";
import { START_CLOCK, createWorld } from "./world";

export { START_CLOCK, createWorld };

const MINUTES_PER_DAY = 1440;
const MAX_TIMELINE = 400;

/** What the house record starts with: everything recorded at move-in from the data plates and the home inspection. */
export const INITIAL_RECORD: Record<string, string> = {
  "heater.brand": "Hearthline",
  "heater.model": "HL-40G-NG",
  "heater.serial": "15C0412-X",
  "heater.size": "40 gallons",
  "heater.fuel": "Natural gas",
  "heater.made": "March 2015",
  "heater.age": "11 years",
  "heater.warranty": "Expired in 2021 (6 year tank warranty*)",
  "heater.source": "Recorded at move-in from the data plate and the home inspection (sample)",
  "lease.rent": `${usd(PROPERTY.rent)} per month`,
  "lease.anniversary": "December 14, 2026",
  "lease.last": "14 months ago",
  "lease.notice": "None",
};

export const RECORD_FIELDS: { key: string; label: string; group: "Water heater" | "Lease, Unit A" }[] = [
  { key: "heater.brand", label: "Brand", group: "Water heater" },
  { key: "heater.model", label: "Model", group: "Water heater" },
  { key: "heater.serial", label: "Serial number", group: "Water heater" },
  { key: "heater.size", label: "Size", group: "Water heater" },
  { key: "heater.fuel", label: "Fuel", group: "Water heater" },
  { key: "heater.made", label: "Made", group: "Water heater" },
  { key: "heater.age", label: "Age", group: "Water heater" },
  { key: "heater.warranty", label: "Warranty", group: "Water heater" },
  { key: "heater.source", label: "How we know", group: "Water heater" },
  { key: "lease.rent", label: "Rent", group: "Lease, Unit A" },
  { key: "lease.anniversary", label: "Lease anniversary", group: "Lease, Unit A" },
  { key: "lease.last", label: "Last increase", group: "Lease, Unit A" },
  { key: "lease.notice", label: "Rent notice", group: "Lease, Unit A" },
];

/** A sample notice date for the demo. Real use would take today's date. */
export const SAMPLE_NOTICE_DATE = "2026-10-19";

// ---------------------------------------------------------------------------
// World
// ---------------------------------------------------------------------------

/** "4:07 AM", or "Tue 11:20 AM" on later days. */
export function clockText(at: number): string {
  const day = Math.floor(at / MINUTES_PER_DAY);
  const minute = ((at % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY;
  const h24 = Math.floor(minute / 60);
  const m = minute % 60;
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  const time = `${h12}:${String(m).padStart(2, "0")} ${h24 < 12 ? "AM" : "PM"}`;
  if (day === 0) return time;
  return `${["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][day % 7]} ${time}`;
}

/** Do Not Disturb hours on the owner's phone. */
export function isQuietHours(at: number): boolean {
  const minute = at % MINUTES_PER_DAY;
  return minute < 6 * 60 + 30 || minute >= 22 * 60;
}

function nextNineAm(from: number): number {
  const day = Math.floor(from / MINUTES_PER_DAY);
  const today = day * MINUTES_PER_DAY + 9 * 60;
  // The lease check runs on a Monday morning at least a few days later.
  const target = today > from + 2 * MINUTES_PER_DAY ? today : today + 7 * MINUTES_PER_DAY;
  return target;
}

// ---------------------------------------------------------------------------
// Writing to the timeline
// ---------------------------------------------------------------------------

function nextId(w: World, prefix: string): string {
  w.seq += 1;
  return `${prefix}${w.seq}`;
}

function push(w: World, entry: Entry): void {
  w.timeline.push(entry);
  if (w.timeline.length > MAX_TIMELINE) w.timeline.splice(0, w.timeline.length - MAX_TIMELINE);
}

interface SayOptions {
  channel?: Channel;
  silent?: boolean;
  actions?: MsgAction[];
  attachment?: Attachment;
  photo?: PhotoKind;
  card?: MsgCard;
  /** Id of a step-by-step picture guide (lib/homeGuides.ts) shown under the message */
  guide?: string;
}

function say(w: World, party: Party, text: string, opts: SayOptions = {}): Msg {
  const msg: Msg = {
    kind: "msg",
    id: nextId(w, "m"),
    at: w.clock,
    party,
    dir: "out",
    channel: opts.channel ?? (party === "contractor" ? "email" : "sms"),
    text,
    silent: opts.silent,
    actions: opts.actions,
    attachment: opts.attachment,
    photo: opts.photo,
    card: opts.card,
    guide: opts.guide,
  };
  push(w, msg);
  return msg;
}

function hear(w: World, party: Party, text: string, opts: SayOptions = {}): Msg {
  const msg: Msg = {
    kind: "msg",
    id: nextId(w, "m"),
    at: w.clock,
    party,
    dir: "in",
    channel: opts.channel ?? (party === "contractor" ? "email" : "sms"),
    text,
    attachment: opts.attachment,
    photo: opts.photo,
  };
  push(w, msg);
  return msg;
}

function tool(w: World, agent: AgentName, name: string, engine: Engine, title: string, detail: string): void {
  push(w, { kind: "tool", id: nextId(w, "t"), at: w.clock, agent, tool: name, engine, title, detail });
}

function record(w: World, patch: Record<string, string>, history?: string): void {
  push(w, { kind: "record", id: nextId(w, "r"), at: w.clock, patch, history });
}

function later(w: World, afterMinutes: number, id: TimerId): void {
  w.pending.push({ at: w.clock + Math.max(1, afterMinutes), id });
  w.pending.sort((a, b) => a.at - b.at);
}

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

const VERDICT_WORDS: Record<Verdict, string> = {
  fair: "fair",
  "slightly high": "slightly high",
  high: "high",
  low: "low",
};

function shortName(name: string): string {
  return name.split(" ").slice(0, 2).join(" ");
}

/** "a permit" becomes "permit", so it reads "no permit line". */
function missingText(lines: string[]): string {
  return lines.map((l) => l.replace(/^(a|an|the) /, "")).join(" or ");
}

function numbered(steps: string[]): string {
  return steps.map((s, i) => `${i + 1}) ${s}`).join("\n");
}

function openMessageFor(w: World, party: Party): Msg | undefined {
  for (let i = w.timeline.length - 1; i >= 0; i--) {
    const e = w.timeline[i];
    if (e.kind === "msg" && e.party === party && e.dir === "out" && e.actions && !e.usedAction) return e;
  }
  return undefined;
}

/** The latest owner message that still has buttons, if any. Exported for the autopilot. */
export function openOwnerMessage(w: World): Msg | undefined {
  return openMessageFor(w, "owner");
}

const YES = /^\s*(1|y|yes|yep|yeah|ok|okay|sure|works|that works|correct|right|done)\b/i;
const NO = /^\s*(2|n|no|nope|nah)\b/i;

function windowText(window: string = ACCESS_WINDOWS[0]): string {
  return window.replace("Tomorrow, ", "tomorrow ").replace("In 2 days, ", "in 2 days, ");
}

// ---------------------------------------------------------------------------
// Time
// ---------------------------------------------------------------------------

function runDue(w: World, t: number): void {
  for (;;) {
    const next = w.pending[0];
    if (!next || next.at > t) break;
    w.pending.shift();
    w.clock = Math.max(w.clock, next.at);
    onTimer(w, next.id);
  }
  w.clock = Math.max(w.clock, t);
}

/** Move the clock forward, firing any timers that come due on the way. */
export function advanceTo(world: World, t: number): World {
  const w = structuredClone(world);
  runDue(w, t);
  return w;
}

export function nextTimerAt(world: World): number | null {
  return world.pending.length > 0 ? world.pending[0].at : null;
}

// ---------------------------------------------------------------------------
// The event reducer
// ---------------------------------------------------------------------------

export function send(world: World, ev: Ev): World {
  const w = structuredClone(world);
  handle(w, ev);
  return w;
}

function handle(w: World, ev: Ev): void {
  switch (ev.type) {
    case "tenant.text":
      return onTenantText(w, ev.text);
    case "tenant.photo":
      return onTenantPhoto(w, ev.photo);
    case "owner.tap":
      return onOwnerTap(w, ev.msgId, ev.action);
    case "owner.text":
      return onOwnerText(w, ev.text);
    case "contractor.quote":
      return onContractorQuote(w);
    case "contractor.counter":
      return onContractorCounter(w, ev.total);
    case "cron.lease":
      return onLeaseCheck(w);
    case "rent.paid":
      return onRentPaid(w, ev.paid);
    case "owner.markDone":
      return onMarkDone(w);
    case "owner.choose":
      w.choice = { vendorId: ev.vendorId, notToExceed: ev.notToExceed, accessWindow: ev.accessWindow };
      return;
    case "timer":
      return onTimer(w, ev.id);
  }
}

function onTimer(w: World, id: TimerId): void {
  switch (id) {
    case "quotes_in":
      return quotesArrive(w);
    case "owner_nudge":
      return ownerNudge(w);
    case "job_done":
      return jobDone(w);
    case "notice_delivered":
      return noticeDelivered(w);
  }
}

/** Rent marked paid: both people get a text. Marking it unpaid again sends nothing. */
function onRentPaid(w: World, paid: boolean): void {
  if (w.rentPaid === paid) return;
  w.rentPaid = paid;
  if (!paid) return;
  tool(w, "chat", "record_rent_payment", "action", "Rent marked paid", `${RENT_MONTH}: ${usd(PROPERTY.rent)}. Nothing was charged.`);
  say(w, "tenant", `Thanks! Your ${RENT_MONTH} rent of ${usd(PROPERTY.rent)} is marked paid.`);
  say(w, "owner", `${PROPERTY.tenant} paid ${RENT_MONTH} rent: ${usd(PROPERTY.rent)}.`, { silent: true });
}

/** The owner taps "Mark done": the booked job finishes now instead of at its scheduled time. */
function onMarkDone(w: World): void {
  if (w.triage.stage !== "booked") return;
  const job = w.pending.find((p) => p.id === "job_done");
  runDue(w, job ? job.at : w.clock + 1);
}

function onOwnerTap(w: World, msgId: string, action: string): void {
  const msg = w.timeline.find((e): e is Msg => e.kind === "msg" && e.id === msgId);
  if (!msg || msg.usedAction) return;
  const used = msg.actions?.find((a) => a.id === action);
  if (!used) return;
  msg.usedAction = action;
  hear(w, "owner", used.label);
  w.clock += 1;
  onOwnerTapResolved(w, action);
}

function onOwnerText(w: World, text: string): void {
  const t = text.trim();
  if (!t) return;
  const open = openMessageFor(w, "owner");
  if (open?.actions) {
    const lower = t.toLowerCase();
    const byNumber = /^\s*([1-3])\b/.exec(t);
    let picked: MsgAction | undefined;
    if (byNumber) picked = open.actions[Number(byNumber[1]) - 1];
    if (!picked && /^\s*(👍|yes|y|ok|okay|approve|send|accept)\b/i.test(t)) picked = open.actions[0];
    if (!picked) picked = open.actions.find((a) => lower.length >= 3 && a.label.toLowerCase().includes(lower));
    if (!picked && /\b(skip|hold|no)\b/i.test(t)) picked = open.actions.find((a) => /skip|hold/i.test(a.id + a.label));
    if (!picked && /\bedit\b/i.test(t)) picked = open.actions.find((a) => /edit/i.test(a.id));
    if (picked) {
      // Same as tapping the button, but the owner typed it.
      open.usedAction = picked.id;
      hear(w, "owner", t);
      w.clock += 1;
      onOwnerTapResolved(w, picked.id);
      return;
    }
  }
  hear(w, "owner", t);
  w.clock += 1;
  if (w.quote.stage === "awaiting_owner") {
    redraft(w, t);
    return;
  }
  if (/\b(lease|rent notice|rent increase|check (my )?rent)\b/i.test(t)) return onLeaseCheck(w);
  if (/\bcontractor\b.*\bquote\b|\bquote\b.*\bcontractor\b/i.test(t)) return onContractorQuote(w);
  say(w, "owner", open ? "I didn't catch that. Reply 1, 2, or 3, or tap a button above." : "Noted. Nothing is waiting on you right now.");
}

function onOwnerTapResolved(w: World, action: string): void {
  switch (action) {
    case "ack":
    case "approve":
    case "others":
    case "call":
      return triageOwnerAction(w, action);
    case "qsend":
    case "qedit":
    case "qskip":
    case "qaccept":
    case "qhold":
    case "qrecounter":
      return quoteOwnerAction(w, action);
    case "rent5":
    case "rentmax":
    case "renthold":
      return sentinelOwnerAction(w, action);
  }
}

// ---------------------------------------------------------------------------
// Agent 1: 4 AM tenant triage and vendor dispatch
// ---------------------------------------------------------------------------

function emergencyPath(w: World, category: string, steps: string[], why: string): void {
  w.triage.stage = "emergency";
  tool(w, "triage", "emergency_rules", "code", `Emergency rule matched: ${category}`, why);
  tool(
    w,
    "triage",
    "skip_fix_steps",
    "code",
    "Gave no fix steps",
    "Only getting safe and calling for help. The tenant is not asked to fix anything.",
  );
  say(
    w,
    "tenant",
    `This sounds like an emergency. Please do this now:\n${numbered(steps)}\nI'm calling your landlord right now. Reply here if anyone is hurt.`,
  );
  tool(
    w,
    "triage",
    "call_owner",
    "action",
    "Called the owner",
    "A voice call plus a text, so it rings through Do Not Disturb. Nothing is quoted or booked until the home is cleared.",
  );
  say(w, "owner", `GoHome is calling about an emergency at ${PROPERTY.address}.`, { channel: "call" });
  say(
    w,
    "owner",
    `EMERGENCY at ${PROPERTY.address}: ${category}. The tenant was told to get safe and call 911. I called you. I will not get quotes or book anyone until the home is cleared.`,
    {
      card: {
        kind: "emergency",
        title: `Emergency: ${category}`,
        summary: "GoHome told your tenant to get safe and call for help, and called you. Nothing is quoted or booked until the home is clear.",
        facts: [{ label: "Tenant was told", value: "Get out and call 911", tone: "urgent" }],
      },
      actions: [{ id: "ack", label: "I'm on it" }],
    },
  );
}

function onTenantText(w: World, raw: string): void {
  const text = raw.trim();
  if (!text) return;
  hear(w, "tenant", text);
  w.clock += 1;

  const triage = triageText(text);
  const stage = w.triage.stage;

  // A new emergency interrupts anything else.
  if (stage !== "emergency" && triage.urgency === "emergency") {
    emergencyPath(
      w,
      triage.category,
      triage.safetySteps,
      "This is never a do-it-yourself problem. Fix steps are skipped, and the owner is called right now.",
    );
    return;
  }

  // "Please ask the owner" after an "I don't know".
  if (/^please ask (sample owner|the owner|my landlord)/i.test(text)) return relayQuestion(w);

  // A question about the home or the lease is answered from the data on file, not treated as a repair.
  if (QUESTION_STAGES.has(stage) && classifyTenantText(text) === "question") return answerQuestion(w, text);

  switch (stage) {
    case "idle":
    case "closed":
    case "done":
      return startCase(w, text);
    case "asked_electrical":
      return answerElectrical(w, text);
    case "steps_given":
      return afterSteps(w, text);
    case "booked":
      return confirmTime(w, text);
    case "emergency":
      say(
        w,
        "tenant",
        w.triage.ownerAcked
          ? "Your landlord is on it. If anyone is in danger, call 911. Stay outside until you're told it's safe."
          : "I'm here. If anyone is in danger, call 911. Your landlord has been called and I'll tell you the moment they answer.",
      );
      return;
    default:
      say(w, "tenant", "Got it, I added that to your case. If anything gets worse or you smell gas, text EMERGENCY and I'll call your landlord.");
  }
}

const QUESTION_STAGES = new Set<string>(["idle", "closed", "done", "quotes_pending", "decision_sent", "booked"]);

function answerQuestion(w: World, text: string): void {
  const values = recordAt(w.timeline, w.timeline.length).values;
  const reply = answerHouseQuestion(text, { heater: recordFromValues(values), rentPaidAt: w.rentPaid ? "paid" : null });
  tool(
    w,
    "chat",
    "answer_from_record",
    "code",
    reply.known ? "Answered from the house record" : "Said I don't know",
    reply.known
      ? `Source: ${reply.source ?? "house record"}. Only data on file is used, so nothing is made up.`
      : "The answer is not in the house record or lease, so GoHome did not guess.",
  );
  say(w, "tenant", reply.answer, {
    actions: reply.known ? undefined : [{ id: "askowner", label: `Ask ${PROPERTY.owner}`, text: `Please ask ${PROPERTY.owner}` }],
  });
}

function relayQuestion(w: World): void {
  let question = "";
  for (let i = w.timeline.length - 2; i >= 0; i--) {
    const e = w.timeline[i];
    if (e.kind === "msg" && e.party === "tenant" && e.dir === "in" && e.text && !/^please ask/i.test(e.text)) {
      question = e.text;
      break;
    }
  }
  tool(w, "chat", "ask_owner", "action", "Passed the question to the owner", "Sent as a quiet text. The owner answers when they can.");
  say(w, "tenant", `Sent. I'll text you ${PROPERTY.owner}'s answer as soon as I have it.`);
  say(w, "owner", `${PROPERTY.tenant} asked: "${question || "a question about the home"}". It is not in your records. Reply here and I will pass it on.`, { silent: true });
}

function startCase(w: World, text: string): void {
  const triage = triageText(text);
  tool(
    w,
    "triage",
    "emergency_rules",
    "code",
    "Checked the emergency rules",
    `No gas smell, fire, sparks, or flooding. Urgency: ${urgencyWord(triage.urgency)}, not an emergency.`,
  );

  if (isHeaterJob(text, triage)) {
    w.triage.stage = "asked_electrical";
    w.triage.ownerAcked = false;
    w.triage.tenantConfirmed = false;
    tool(
      w,
      "triage",
      "lookup_house_record",
      "code",
      "Looked up the house record",
      "Found the water heater in the home record: Hearthline HL-40G-NG, 40 gallon gas, made March 2015. Everything about it is already on file.",
    );
    say(
      w,
      "tenant",
      `Hi, this is GoHome for ${PROPERTY.address}. I'm on it, and I already have your water heater on file (Hearthline HL-40G-NG). Safety first: is the water near an outlet, or is anything electrical in the puddle?\nReply 1 = yes, 2 = no`,
      {
        actions: [
          { id: "1", label: "1  Yes", text: "1" },
          { id: "2", label: "2  No", text: "2" },
        ],
      },
    );
    return;
  }

  // Any other, non-emergency problem: a short, honest triage and a heads-up.
  w.triage.stage = "closed";
  const steps = triage.safetySteps;
  if (steps.length > 0) {
    tool(w, "triage", "pick_safety_steps", "code", `Picked ${steps.length} safe step${steps.length === 1 ? "" : "s"} from the guide library`, "Steps come from a hand-checked library. The model never improvises a fix.");
  } else {
    tool(w, "triage", "skip_fix_steps", "code", "Gave no fix steps", "A professional should handle this one. The tenant is not asked to fix anything.");
  }
  say(
    w,
    "tenant",
    `Thanks. I logged this as ${triage.category} (${urgencyWord(triage.urgency)}). ${triage.summary}${steps.length > 0 ? `\n${numbered(steps)}` : ""}\nYour landlord has been told. I'll update you here.`,
    { guide: guideForText(text) ?? undefined },
  );
  if (triage.alertOwnerNow) {
    tool(w, "triage", "call_owner", "action", "Called the owner", "No-heat problems ring through Do Not Disturb. There are no fix steps for the tenant.");
    say(w, "owner", `GoHome is calling about ${triage.category.toLowerCase()} at ${PROPERTY.address}.`, { channel: "call" });
    say(w, "owner", `Urgent: ${triage.category} at ${PROPERTY.address}. The tenant has no fix steps. I called you. ${triage.summary}`);
  } else {
    tool(w, "triage", "notify_owner", "action", "Sent a silent heads-up to the owner", `Urgency is ${urgencyWord(triage.urgency)}, not an emergency, so there is no phone call. The owner can keep sleeping.`);
    say(w, "owner", `${triage.category} request at ${PROPERTY.address} (${urgencyWord(triage.urgency)}). ${triage.summary} I'm handling it. Nothing needed from you.`, { silent: true });
  }
}

function answerElectrical(w: World, text: string): void {
  const yes = /^\s*1\b|\b(yes|outlet|plug|electric|spark|wet wire)\b/i.test(text) && !NO.test(text);
  const no = NO.test(text);
  if (!yes && !no) {
    say(w, "tenant", "Quick check so I give you the right steps: is the water near an outlet or anything electrical? Reply 1 for yes or 2 for no.", {
      actions: [
        { id: "1", label: "1  Yes", text: "1" },
        { id: "2", label: "2  No", text: "2" },
      ],
    });
    return;
  }
  if (yes) {
    emergencyPath(
      w,
      "Water near electricity",
      [
        "Stay out of the garage and keep everyone away from the water.",
        "Do not touch the heater, the outlet, or anything wet.",
        "If you can reach the breaker panel without stepping in water, switch off the garage breaker.",
        "If anyone feels a tingle or shock, call 911.",
      ],
      "Water near electrical items is a shock risk. Fix steps are skipped, and the owner is called right now.",
    );
    return;
  }

  w.triage.stage = "steps_given";
  const steps = seededHeaterTriage().safetySteps.slice(0, 2);
  tool(w, "triage", "pick_safety_steps", "code", "Picked 2 safe steps from the guide library", "Steps come from a hand-checked library. The model never improvises a fix.");
  say(
    w,
    "tenant",
    `Good. Two quick steps for your Hearthline HL-40G-NG:\n${numbered(steps)}\nNot sure how? Tap Show me how for a picture guide made for your exact heater, or reply HELP. Don't touch the heater if you're standing in water, and never touch the gas valve. If you smell gas, leave and call 911. Reply DONE when you're finished.`,
    {
      guide: "heater-water-off",
      actions: [
        { id: "done", label: "Done", text: "done" },
        { id: "help", label: "HELP", text: "help" },
      ],
    },
  );
  tool(w, "triage", "notify_owner", "action", "Sent a silent heads-up to the owner", "Urgency is soon, not an emergency, so there is no phone call. The owner can keep sleeping.");
  say(
    w,
    "owner",
    `Water heater leak at ${PROPERTY.address}. Tenant is safe, water and gas are being shut off. I'm handling it. Nothing needed from you.`,
    { silent: true },
  );
}

function afterSteps(w: World, text: string): void {
  if (/\bhelp\b/i.test(text)) {
    const guide = guideForStep("Turn off the water supply valve to the heater.", {});
    const body = guide
      ? `${guide.title} (${guide.time}):\n${numbered(guide.steps.slice(0, 4))}\nStop and get help if: ${guide.stopIf[0] ?? "anything looks unsafe"}`
      : "Find the shut-off valve on the cold water pipe above the heater and turn the handle crosswise to the pipe.";
    tool(w, "triage", "send_guide", "code", "Sent the guide for this exact heater", "Hand-written guide for the Hearthline HL-40G-NG from the home record. General safety information, not professional advice.");
    say(w, "tenant", body, {
      guide: "heater-water-off",
      actions: [{ id: "done", label: "Done", text: "done" }],
    });
    return;
  }

  dispatch(w);
}

function onTenantPhoto(w: World, photo: PhotoKind): void {
  hear(w, "tenant", "", { photo });
  w.clock += 1;
  tool(w, "triage", "save_photo", "action", "Saved the tenant's photo to the case", "The owner can see it with the repair details.");
  say(w, "tenant", photo === "leak" && w.triage.stage !== "idle" ? "Thanks, that helps. I added the photo to your case." : "Thanks, I saved that photo to your case.");
}

/** Work out the facts from the home record, check vendors, and ask for quotes. */
function dispatch(w: World): void {
  const heater = EQUIPMENT[0];
  const age = ageOf({ installYear: 2015 });
  const pct = Math.round((age / heater.typicalLifeYears) * 100);

  tool(w, "triage", "compute_age_warranty", "code", "Worked out age and warranty", `Made 2015, so ${age} years old, ${pct}% of a typical life of ${heater.typicalLifeYears}*. Tank warranty (6 years*) expired in 2021. *Placeholder numbers.`);
  tool(
    w,
    "triage",
    "check_vendor_availability",
    "action",
    "Checked local vendor availability",
    "3 local vendors checked (fictional). Earliest slots: Willow Glen tomorrow 9 to 11 AM, Bayside tomorrow 1 to 3 PM, A1 Rapid in 2 days.",
  );
  tool(
    w,
    "triage",
    "request_quotes",
    "action",
    "Asked 3 vendors for itemized quotes",
    "Standing permission: GoHome may request quotes. It may not book, negotiate, or spend without a tap. Sent the address, photos, and the house record.",
  );

  say(w, "tenant", "All set. Your landlord is being told. You don't need to call anyone. I'll text you the plumber's name and time. Go back to sleep, I'm watching this.");
  say(
    w,
    "owner",
    `From your house record: Hearthline HL-40G-NG, 40 gal gas, made March 2015, ${age} years old (typical life ${heater.typicalLifeYears}*). Warranty expired*. I asked 3 vendors for quotes and I'll send you one decision when they're in.\n*Illustrative placeholder, not market data`,
    { silent: true },
  );
  w.triage.stage = "quotes_pending";
  later(w, 88, "quotes_in");
}

function quotesArrive(w: World): void {
  if (w.triage.stage !== "quotes_pending") return;
  tool(w, "quote", "read_quotes", "ai", "Read 3 itemized quotes", "One PDF, one email, and one photo of a paper quote, turned into line items.");
  for (const c of COLLECTED) {
    tool(
      w,
      "quote",
      "check_quote",
      "code",
      `${shortName(c.vendorName)}: ${VERDICT_WORDS[c.verdict]}`,
      `${usd(c.quote.total)} against a typical ${usdRange(WATER_HEATER_JOB.marketTotal.low, WATER_HEATER_JOB.marketTotal.high)}*.${c.license ? "" : " No license number shown."}${c.missingLines.length > 0 ? ` No ${missingText(c.missingLines)} line.` : ""}`,
    );
  }
  tool(w, "quote", "recommend_vendor", "code", `Picked ${PLAN.vendorName}`, `${PLAN.reasons.join(" ")} Limit ${usd(PLAN.notToExceed)} (quote plus 10%).`);

  const age = ageOf({ installYear: 2015 });
  const decision = decideRepairOrReplace({
    item: "Water heater",
    ageYears: age,
    typicalLifeYears: EQUIPMENT[0].typicalLifeYears,
    repairCost: REPAIR_ESTIMATE,
    replaceCost: PLAN.total,
    failureMode: "tank leak",
  });
  tool(w, "quote", "decide_repair_replace", "code", `Rule says: ${decision.recommendation}`, decision.reasons.join(" "));

  const lines = COLLECTED.map(
    (c) =>
      ` ${shortName(c.vendorName)}  ${usd(c.quote.total)}  ${VERDICT_WORDS[c.verdict]}${c.license ? ", licensed" : ", no license shown"}${c.missingLines.length > 0 ? `, no ${missingText(c.missingLines)} line` : ""}`,
  ).join("\n");
  say(
    w,
    "owner",
    `DECISION NEEDED: ${decision.recommendation} the water heater\nWhy: ${decision.reasons.slice(0, 2).join(" ")}\n3 quotes, all checked by plain code:\n${lines}\nMy pick: ${shortName(PLAN.vendorName)}. Saves ${usd(PLAN.savedVsHighest)} vs the highest. Limit ${usd(PLAN.notToExceed)}. Visit ${windowText()}.`,
    {
      card: {
        kind: "decision",
        title: `Replace the water heater with ${shortName(PLAN.vendorName)}`,
        summary: `The heater is ${age} years old and the tank is leaking, so it cannot be repaired. GoHome checked 3 quotes and picked the best one for you.`,
        facts: [
          { label: "Price", value: `${usd(PLAN.total)}, a fair price`, tone: "good" },
          { label: "Spending limit", value: usd(PLAN.notToExceed) },
          { label: "You save", value: `${usd(PLAN.savedVsHighest)} vs the highest quote`, tone: "good" },
          { label: "Visit", value: windowText() },
        ],
      },
      actions: [
        { id: "approve", label: "Approve" },
        { id: "others", label: "Other quotes" },
        { id: "call", label: "Call me" },
      ],
    },
  );
  w.triage.stage = "decision_sent";
  say(w, "tenant", "Update: your landlord is choosing a plumber now. I'll text you the moment one is booked.");
  later(w, 45, "owner_nudge");
}

function ownerNudge(w: World): void {
  if (w.triage.stage !== "decision_sent") return;
  tool(w, "triage", "nudge_owner", "action", "No reply in 45 minutes, so GoHome followed up", "A reminder text, then a call. The tenant's leak is contained, so this is a nudge and not an emergency.");
  say(w, "owner", "Reminder: the water heater decision is still waiting. The leak is contained, the tenant is safe, and the quotes are held for 24 hours.", {
    actions: [
      { id: "approve", label: "Approve" },
      { id: "call", label: "Call me" },
    ],
  });
  say(w, "owner", "GoHome is calling about the water heater decision.", { channel: "call" });
}

function triageOwnerAction(w: World, action: string): void {
  if (action === "ack") {
    if (w.triage.stage !== "emergency") return;
    w.triage.ownerAcked = true;
    tool(w, "triage", "relay_to_tenant", "action", "Told the tenant the owner is on it", "No vendor is booked until the home is cleared.");
    say(w, "owner", "Thanks. I told your tenant you're on it. I won't book anyone until you say the home is clear.");
    say(w, "tenant", "Your landlord is on it. Stay outside until they or the gas company say it's safe. I'll stay on this thread.");
    return;
  }

  if (w.triage.stage !== "decision_sent" && w.triage.stage !== "quotes_pending") return;

  if (action === "others") {
    const lines = COLLECTED.map((c) => {
      const cmp = compareQuote(c.quote, WATER_HEATER_JOB);
      const flags = cmp.lines.filter((l) => l.verdict === "high" || l.verdict === "slightly high").map((l) => l.label);
      return `${c.vendorName}: ${usd(c.quote.total)}, ${VERDICT_WORDS[c.verdict]}. ${c.license ?? "No license shown"}.${flags.length ? ` High lines: ${flags.join(", ")}.` : ""}${c.missingLines.length ? ` No ${missingText(c.missingLines)} line.` : ""}`;
    });
    tool(w, "quote", "show_quotes", "code", "Showed the other quotes", "Same numbers as the decision card. Nothing has changed.");
    say(w, "owner", lines.join("\n"), {
      actions: [
        { id: "approve", label: `Approve ${shortName(PLAN.vendorName)}` },
        { id: "call", label: "Call me" },
      ],
    });
    return;
  }

  if (action === "call") {
    tool(w, "triage", "place_call", "action", "Called the owner", "A voice call to talk it through. Still nothing is booked.");
    say(w, "owner", "GoHome is calling you about the water heater decision.", { channel: "call" });
    return;
  }

  // approve: the owner's own pick if they chose one by hand, otherwise GoHome's plan
  const pick = w.choice ?? { vendorId: PLAN.vendorId, notToExceed: PLAN.notToExceed, accessWindow: ACCESS_WINDOWS[0] };
  const vendor = VENDORS.find((v) => v.id === pick.vendorId) ?? VENDORS[0];
  const highest = Math.max(...VENDORS.map((v) => v.total));
  tool(
    w,
    "gate",
    "approval_gate",
    "human",
    "Owner tapped Approve",
    `One-tap token for ${vendor.name}, limit ${usd(pick.notToExceed)}, expires in 24 hours. Nothing was spent before this tap.`,
  );
  tool(w, "triage", "book_vendor", "action", `Booked ${vendor.name}`, `${pick.accessWindow}. Not-to-exceed ${usd(pick.notToExceed)}: the vendor must call the owner before going over.`);
  say(
    w,
    "contractor",
    `Booking confirmed: ${vendor.name}, ${windowText(pick.accessWindow)}, ${PROPERTY.address}. Quoted ${usd(vendor.total)}. Not-to-exceed ${usd(pick.notToExceed)}. Please call the owner before going over.`,
    { attachment: { title: "Booking confirmation", body: `Job: replace the water heater\nVendor: ${vendor.name}\nVisit: ${pick.accessWindow}\nQuote: ${usd(vendor.total)}\nNot to exceed: ${usd(pick.notToExceed)}` } },
  );
  say(
    w,
    "tenant",
    `Good news: ${vendor.name} is booked for ${windowText(pick.accessWindow)}. Please be home or leave access. Reply 1 if that works, 2 for another time.`,
    {
      actions: [
        { id: "1", label: "1  That works", text: "1" },
        { id: "2", label: "2  Another time", text: "2" },
      ],
    },
  );
  say(w, "owner", `Approved. Booked ${vendor.name}, limit ${usd(pick.notToExceed)}. I'm telling the tenant and the vendor now. I'll text you when it's done and add the new heater to your record.`);
  w.stats.ownerTaps += 1;
  w.stats.saved += Math.max(0, highest - vendor.total);
  w.triage.stage = "booked";
  w.pending = w.pending.filter((p) => p.id !== "owner_nudge");
  const tomorrowAfternoon = MINUTES_PER_DAY + 11 * 60 + 20;
  later(w, Math.max(60, tomorrowAfternoon - w.clock), "job_done");
}

function confirmTime(w: World, text: string): void {
  if (YES.test(text)) {
    w.triage.tenantConfirmed = true;
    tool(w, "triage", "confirm_visit", "action", "Tenant confirmed the visit", "The vendor and the owner were told.");
    say(w, "tenant", "Great, see you then. I'll text you if anything changes.");
    say(w, "owner", "Your tenant confirmed the visit window.", { silent: true });
    return;
  }
  if (NO.test(text)) {
    tool(w, "triage", "request_new_time", "action", "Tenant asked for another time", "Sent the owner a request for a new window. Nothing is rebooked without a tap.");
    say(w, "tenant", "No problem. I asked your landlord for another time and I'll text you when it's set.");
    say(w, "owner", "Your tenant needs a different time for the plumber. Reply with a new window and I'll offer it.", { silent: true });
    return;
  }
  say(w, "tenant", "Reply 1 if the plumber's time works, or 2 if you need another time.", {
    actions: [
      { id: "1", label: "1  That works", text: "1" },
      { id: "2", label: "2  Another time", text: "2" },
    ],
  });
}

function jobDone(w: World): void {
  if (w.triage.stage !== "booked") return;
  w.triage.stage = "done";
  const n = NEW_HEATER_RECORD;
  tool(w, "triage", "installer_registration", "action", "Installer registered the new heater", `${n.manufacturer} ${n.model}, serial ${n.serial}. Nobody had to type anything.`);
  record(
    w,
    {
      "heater.brand": n.manufacturer,
      "heater.model": n.model,
      "heater.serial": n.serial,
      "heater.size": `${n.capacityGallons} gallons`,
      "heater.fuel": n.fuelType,
      "heater.made": "September 2026",
      "heater.age": "Brand new",
      "heater.warranty": "New 6 year tank warranty*",
      "heater.source": "Added automatically by the installer (sample)",
    },
    "Old water heater marked replaced. New heater registered by the installer.",
  );
  const forecast = buildForecast(equipmentFor(n));
  tool(
    w,
    "triage",
    "update_forecast",
    "code",
    "Updated the 5-year forecast",
    `The heater is no longer overdue. Suggested set-aside is now ${usd(forecast.setAsideLowPerMonth)} to ${usd(forecast.setAsideHighPerMonth)} a month*.`,
  );
  say(w, "tenant", "All fixed! Thanks for your patience. If anything looks off, text me here.");
  say(w, "owner", `Done. The new Hearthline HL-40G-NG is in your house record (serial ${n.serial}). Your 5-year forecast is updated. You spent ${w.stats.ownerTaps} tap and about a minute.`);
}

// ---------------------------------------------------------------------------
// Agent 2: lightning quote audit and counter-negotiation
// ---------------------------------------------------------------------------

const SAMPLE_VENDOR = "Harbor View Plumbing";

function sampleQuote(): VendorQuote {
  const parsed = parseQuoteText(SAMPLE_QUOTE_TEXT);
  return { vendorId: "harbor-view", vendorName: parsed.vendorName ?? SAMPLE_VENDOR, total: parsed.total, lines: parsed.lines };
}

function pushbackDraft(note: string | null): string {
  const firm = note !== null && /firm|stronger|tough|direct/i.test(note);
  const lines = [
    "Hi Harbor View team,",
    "",
    "Thanks for the quote. Could you send the labor breakdown (hours and hourly rate)? I have other itemized quotes for the same job, and your labor line is well above the typical range.",
    firm
      ? `I'd like to book quickly, but I can only approve a total at or under ${usd(WATER_HEATER_JOB.marketTotal.high)}. Can you get there?`
      : `Could you bring the total closer to ${usd(WATER_HEATER_JOB.marketTotal.high)}? Happy to book fast if it works.`,
  ];
  if (note !== null && !firm && note.trim()) lines.push("", `(Owner note: ${note.trim()})`);
  lines.push("", "Thanks,", PROPERTY.owner);
  return lines.join("\n");
}

function hourlyNote(quote: VendorQuote): string | null {
  const labor = quote.lines.find((l) => l.id === "labor");
  if (!labor) return null;
  const hrs = /(\d+(?:\.\d+)?)\s*hrs?/i.exec(labor.label);
  if (!hrs) return null;
  const rate = Math.round(labor.amount / Number(hrs[1]));
  return `Labor ${usd(labor.amount)} is ${usd(rate)} an hour for ${hrs[1]} hours`;
}

function auditMessage(w: World, quote: VendorQuote, draft: string, intro: string): void {
  const cmp = compareQuote(quote, WATER_HEATER_JOB);
  const over = Math.round(percentOverTop(quote.total, WATER_HEATER_JOB.marketTotal));
  const flagged = cmp.lines.filter((l) => l.verdict === "high" || l.verdict === "slightly high");
  const bullets: string[] = [];
  if (cmp.total.verdict === "fair") bullets.push(`Total is inside the typical range of ${usdRange(cmp.total.range.low, cmp.total.range.high)}*`);
  else if (cmp.total.verdict === "low") bullets.push(`Total is below the typical range, so something may be left out`);
  else bullets.push(`Total is ${over}% above the top of the typical range (${usdRange(cmp.total.range.low, cmp.total.range.high)}*)`);
  const hourly = hourlyNote(quote);
  for (const l of flagged) {
    if (!l.range) continue;
    const typical = `typical ${usdRange(l.range.low, l.range.high)}`;
    bullets.push(l.id === "labor" && hourly ? `${hourly} (${typical})` : `${l.label} ${usd(l.amount)} (${typical})`);
  }
  if (flagged.length === 0) bullets.push("No line items stand out");
  say(
    w,
    "owner",
    `${intro}\nAUDIT (plain code):\n${bullets.map((b) => `- ${b}`).join("\n")}\nI drafted a reply for you (attached). Nothing is sent until you say so.`,
    {
      card: {
        kind: "quote",
        title: `${shortName(quote.vendorName)} quote is ${VERDICT_WORDS[cmp.total.verdict]}`,
        summary:
          cmp.total.verdict === "fair"
            ? "The price is inside the typical range. A reply is drafted if you want to confirm the details."
            : "GoHome wrote a polite reply asking for a better price. It is ready to send.",
        facts: [
          { label: "Their price", value: usd(quote.total), tone: cmp.total.verdict === "fair" ? "good" : "caution" },
          { label: "Typical range", value: usdRange(cmp.total.range.low, cmp.total.range.high) },
          ...(hourly ? [{ label: "Labor", value: hourly.replace(/^Labor /, ""), tone: "caution" as const }] : []),
        ],
      },
      attachment: { title: `Draft reply to ${quote.vendorName}`, body: draft },
      actions: [
        { id: "qsend", label: "👍 Send it" },
        { id: "qedit", label: "Edit" },
        { id: "qskip", label: "Skip" },
      ],
    },
  );
}

function onContractorQuote(w: World): void {
  const quote = sampleQuote();
  hear(w, "contractor", `Quote for the water heater replacement at ${PROPERTY.address}. PDF attached.`, {
    attachment: { title: "Quote #2217 (PDF)", body: SAMPLE_QUOTE_TEXT },
  });
  w.clock += 1;
  tool(w, "quote", "read_quote", "ai", "Read the quote PDF", `${quote.lines.length} line items, total ${usd(quote.total)}. The AI reads the document. It does not judge the price.`);
  const cmp = compareQuote(quote, WATER_HEATER_JOB);
  const over = Math.round(percentOverTop(quote.total, WATER_HEATER_JOB.marketTotal));
  tool(
    w,
    "quote",
    "check_quote",
    "code",
    `Total is ${VERDICT_WORDS[cmp.total.verdict]}`,
    `${usd(quote.total)} is ${over}% above the top of the typical ${usdRange(cmp.total.range.low, cmp.total.range.high)}*. Compared line by line against a hand-checked price table.`,
  );
  const hourly = hourlyNote(quote);
  if (hourly) tool(w, "quote", "flag_markup", "code", "Flagged the labor line", `${hourly}. Typical labor is ${usdRange(WATER_HEATER_JOB.marketLines.labor.low, WATER_HEATER_JOB.marketLines.labor.high)}*.`);
  const draft = pushbackDraft(null);
  tool(w, "quote", "draft_pushback", "ai", "Drafted a polite counter", "The AI wrote the words. The target number comes from the price table, not the model.");
  w.quote = { stage: "awaiting_owner", total: quote.total, draft, counters: 0, counterTotal: 0 };
  auditMessage(w, quote, draft, `New quote: ${quote.vendorName} ${usd(quote.total)} (PDF read, ${quote.lines.length} lines)`);
}

function redraft(w: World, note: string): void {
  const quote = sampleQuote();
  const draft = pushbackDraft(note);
  tool(w, "quote", "draft_pushback", "ai", "Redrafted with the owner's note", `Applied: "${note}".`);
  w.quote.draft = draft;
  say(w, "owner", "Updated. Here is the new draft (attached). Nothing is sent until you say so.", {
    attachment: { title: `Draft reply to ${quote.vendorName}`, body: draft },
    actions: [
      { id: "qsend", label: "👍 Send it" },
      { id: "qedit", label: "Edit" },
      { id: "qskip", label: "Skip" },
    ],
  });
}

function quoteOwnerAction(w: World, action: string): void {
  const quote = sampleQuote();
  if (action === "qedit") {
    say(w, "owner", 'Tell me what to change, for example "make it firmer", and I\'ll redraft it.');
    return;
  }
  if (action === "qskip" || action === "qhold") {
    w.quote.stage = "settled";
    tool(w, "quote", "hold", "action", "Held the quote", "Nothing was sent. The quote stays on file.");
    say(w, "owner", "Okay, I won't reply. I'll keep this quote on file.");
    return;
  }
  if (action === "qsend") {
    if (w.quote.stage !== "awaiting_owner") return;
    tool(w, "gate", "approval_gate", "human", "Owner approved the message", "One tap released this one message. It cannot be used for anything else.");
    tool(w, "quote", "send_email", "action", `Emailed ${quote.vendorName}`, "Sent the approved reply, word for word.");
    say(w, "contractor", w.quote.draft, { attachment: { title: "Email from the owner", body: w.quote.draft } });
    say(w, "owner", "Sent. I'll tell you the moment they reply.");
    w.stats.ownerTaps += 1;
    w.quote.stage = "sent";
    return;
  }
  if (action === "qaccept") {
    if (w.quote.stage !== "countered") return;
    tool(w, "gate", "approval_gate", "human", "Owner accepted the counter", `One tap accepted ${usd(w.quote.counterTotal)}.`);
    tool(w, "quote", "send_email", "action", `Emailed ${quote.vendorName}`, "Accepted the new price and asked them to confirm the scope and the permit in writing.");
    const body = `Thanks, ${usd(w.quote.counterTotal)} works. Please confirm in writing that it includes the permit and haul away, and send over your license number.`;
    say(w, "contractor", body, { attachment: { title: "Email from the owner", body } });
    say(w, "owner", `Accepted at ${usd(w.quote.counterTotal)}. I asked them to confirm the scope and the permit in writing.`);
    w.stats.ownerTaps += 1;
    w.quote.stage = "settled";
    return;
  }
  if (action === "qrecounter") {
    if (w.quote.stage !== "countered") return;
    tool(w, "gate", "approval_gate", "human", "Owner approved a second counter", "One tap released one more message.");
    tool(w, "quote", "send_email", "action", `Emailed ${quote.vendorName}`, "Sent a firm second counter at the top of the typical range.");
    const body = `Thanks for coming down. I can only approve ${usd(WATER_HEATER_JOB.marketTotal.high)} or less. Can you get there?`;
    say(w, "contractor", body, { attachment: { title: "Email from the owner", body } });
    say(w, "owner", "Sent a firm second counter. I'll tell you when they reply.");
    w.stats.ownerTaps += 1;
    w.quote.stage = "sent";
  }
}

function onContractorCounter(w: World, total: number): void {
  if (w.quote.stage !== "sent") return;
  w.quote.counters += 1;
  w.quote.counterTotal = total;
  hear(w, "contractor", `Thanks for flagging that. We can do ${usd(total)}.`, {
    attachment: { title: "Email from the contractor", body: `Thanks for flagging that. We can do ${usd(total)}.` },
  });
  w.clock += 1;
  const range = WATER_HEATER_JOB.marketTotal;
  const verdict = verdictFor(total, range);
  tool(w, "quote", "check_quote", "code", `Counter is ${VERDICT_WORDS[verdict]}`, `${usd(total)} against a typical ${usdRange(range.low, range.high)}*. Down ${usd(w.quote.total - total)} from the first quote.`);
  w.quote.stage = "countered";
  if (verdict === "fair") {
    say(
      w,
      "owner",
      `${SAMPLE_VENDOR} came back at ${usd(total)}, down ${usd(w.quote.total - total)}. That is inside the typical range of ${usdRange(range.low, range.high)}*. Accept?`,
      {
        actions: [
          { id: "qaccept", label: "👍 Accept" },
          { id: "qhold", label: "Hold" },
        ],
      },
    );
  } else {
    say(
      w,
      "owner",
      `${SAMPLE_VENDOR} came back at ${usd(total)}, down ${usd(w.quote.total - total)}. That is still ${VERDICT_WORDS[verdict]} against a typical top of ${usd(range.high)}*. Counter once more, or hold?`,
      {
        actions: [
          { id: "qrecounter", label: "Counter again" },
          { id: "qhold", label: "Hold" },
        ],
      },
    );
  }
}

// ---------------------------------------------------------------------------
// Agent 3: autonomous compliance and legal sentinel
// ---------------------------------------------------------------------------

function onLeaseCheck(w: World): void {
  if (w.sentinel.stage !== "idle" && w.sentinel.stage !== "held") return;
  runDue(w, nextNineAm(w.clock));
  const proposed = 3360;
  const result = calculateRent({ ...DEFAULT_RENT_FORM, proposedRent: proposed });
  tool(w, "sentinel", "scan_leases", "code", "Checked lease dates", "Unit A: lease anniversary December 14, 2026 (62 days). Last increase 14 months ago. 0 increases in the last 12 months.");
  tool(w, "sentinel", "fetch_cpi", "code", "Looked up local CPI", "Local CPI change 3.0% (placeholder: the owner should confirm the current figure for the area).");
  tool(
    w,
    "sentinel",
    "ab1482_calc",
    "code",
    `Max legal increase: ${result.capPercent.toFixed(1)}%`,
    `Cap is the lesser of 5% plus local CPI, or 10%. ${usdCents(DEFAULT_RENT_FORM.currentRent)} to a maximum of ${usdCents(result.maxNewRent)}, rounded down to the cent. Notice: 30 days, or 90 if over 10%. Not exempt.`,
  );
  const notice = buildNotice({
    ownerName: PROPERTY.owner,
    tenantName: PROPERTY.tenant,
    address: PROPERTY.address,
    currentRent: DEFAULT_RENT_FORM.currentRent,
    newRent: proposed,
    noticeDate: SAMPLE_NOTICE_DATE,
    noticeDays: result.noticeDays,
  });
  tool(w, "sentinel", "build_notice", "code", "Built the notice", "A plain-language notice from a template, stamped as a draft. The AI does not decide what is legal.");
  w.sentinel = { stage: "awaiting_owner", proposed };
  say(
    w,
    "owner",
    `Unit A's lease anniversary is in 62 days.\nMax legal increase today: ${result.capPercent.toFixed(1)}% (${usd(DEFAULT_RENT_FORM.currentRent)} to ${usdCents(result.maxNewRent)}). Cap = the lesser of 5% plus local CPI, or 10%.\nNotice period: ${result.noticeDays} days (90 if over 10%).\nDraft notice is ready (attached). DRAFT, NOT LEGAL ADVICE: local rules, like San Jose's, can be stricter.`,
    {
      card: {
        kind: "lease",
        title: "You can raise rent on Unit A",
        summary: "The lease anniversary is coming up. GoHome worked out the legal maximum and drafted the notice.",
        facts: [
          { label: "Legal maximum", value: `${result.capPercent.toFixed(1)}% (${usdCents(result.maxNewRent)})` },
          { label: "Suggested", value: `5% (${usd(3360)})`, tone: "good" },
          { label: "Notice period", value: `${result.noticeDays} days` },
          { label: "Sent by", value: "Certified mail, with proof" },
        ],
      },
      attachment: { title: "Draft rent notice", body: notice },
      actions: [
        { id: "rent5", label: `Mail at 5% (${usd(3360)})` },
        { id: "rentmax", label: `Mail at max (${usd(result.maxNewRent)})` },
        { id: "renthold", label: "Hold" },
      ],
    },
  );
}

function sentinelOwnerAction(w: World, action: string): void {
  if (w.sentinel.stage !== "awaiting_owner") return;
  if (action === "renthold") {
    w.sentinel.stage = "held";
    tool(w, "sentinel", "hold", "action", "Held the notice", "Nothing was sent. GoHome will ask again in 14 days.");
    say(w, "owner", "Okay, holding. I'll remind you in 14 days, before the lease anniversary gets close.");
    return;
  }
  const max = calculateRent({ ...DEFAULT_RENT_FORM, proposedRent: DEFAULT_RENT_FORM.currentRent }).maxNewRent;
  const newRent = action === "rentmax" ? max : 3360;
  const check = calculateRent({ ...DEFAULT_RENT_FORM, proposedRent: newRent });
  if (!check.withinCap) return;
  const effective = effectiveDateFor(SAMPLE_NOTICE_DATE, check.noticeDays);
  tool(w, "gate", "approval_gate", "human", "Owner approved the notice", `One tap approved ${usdCents(newRent)} (${check.increasePercent.toFixed(1)}%), within the ${check.capPercent.toFixed(1)}% cap.`);
  tool(
    w,
    "sentinel",
    "mail_notice",
    "action",
    "Mailed the notice by certified mail",
    "A rent notice has to be properly served, so a text is not enough. Printed and mailed with tracking (simulated). Proof of service goes to the house record.",
  );
  record(
    w,
    { "lease.notice": `Mailed ${longDate(SAMPLE_NOTICE_DATE)}, new rent ${usdCents(newRent)} from ${longDate(effective)}` },
    `Rent notice mailed for ${usdCents(newRent)}`,
  );
  say(w, "owner", `Done. Notice mailed certified for ${usdCents(newRent)}, effective ${longDate(effective)} (${check.noticeDays} days). I'll text you when it's delivered and save proof of service.`);
  w.stats.ownerTaps += 1;
  w.sentinel.stage = "mailed";
  w.sentinel.proposed = newRent;
  later(w, 2 * MINUTES_PER_DAY, "notice_delivered");
}

function noticeDelivered(w: World): void {
  if (w.sentinel.stage !== "mailed") return;
  w.sentinel.stage = "delivered";
  const delivered = addDays(SAMPLE_NOTICE_DATE, 3);
  tool(w, "sentinel", "track_delivery", "action", "Notice delivered", `Certified mail shows delivered ${longDate(delivered)}. Proof of service saved to the house record.`);
  record(w, { "lease.notice": `Delivered ${longDate(delivered)}, proof saved` }, "Rent notice delivered. Proof of service saved.");
  say(w, "owner", `Delivered ${longDate(delivered)}. Proof of service is saved in your house record.`, { silent: true });
}

// ---------------------------------------------------------------------------
// Reading the timeline
// ---------------------------------------------------------------------------

export interface RecordView {
  values: Record<string, string>;
  /** Keys written by the most recent record entry */
  changed: string[];
  history: string[];
}

/** The house record as it looks after the first `upto` timeline entries. */
export function recordAt(timeline: Entry[], upto: number): RecordView {
  const values = { ...INITIAL_RECORD };
  let changed: string[] = [];
  const history: string[] = [];
  const end = Math.min(upto, timeline.length);
  for (let i = 0; i < end; i++) {
    const e = timeline[i];
    if (e.kind !== "record") continue;
    Object.assign(values, e.patch);
    changed = Object.keys(e.patch);
    if (e.history) history.push(`${clockText(e.at)}  ${e.history}`);
  }
  return { values, changed, history };
}

/** The timeline gives a way to count who did what, for the stats strip. */
export function countByEngine(timeline: Entry[], upto: number): Record<Engine, number> {
  const counts: Record<Engine, number> = { ai: 0, code: 0, action: 0, human: 0 };
  for (const e of timeline.slice(0, upto)) if (e.kind === "tool") counts[e.engine] += 1;
  return counts;
}
