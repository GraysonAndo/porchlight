// What each person is allowed to see of the agent's work. The owner sees every step. The tenant only sees steps that
// matter to them, in plain words, and never anything about prices, quotes, or the owner's decisions. A step with no
// entry here is hidden from the tenant, so a new tool is private by default.

import { entryTime } from "./engine";
import type { Engine, Entry, ToolCall, World } from "./types";

export interface ActivityItem {
  id: string;
  /** The job this belongs to, so a long feed can be grouped: "Water heater repair", "Rent increase", and so on */
  job: string;
  clock: string;
  /** The full date and time, for a printed or saved record */
  stamp: string;
  title: string;
  detail: string | null;
  engine: Engine | null;
}

const TENANT_TEXT: Record<string, (t: ToolCall) => string> = {
  emergency_rules: (t) => (/matched/i.test(t.title) ? "Checked your problem against the emergency safety rules. This one is urgent." : "Checked your problem against the emergency safety rules. Not an emergency."),
  lookup_house_record: (t) => `Found your water heater in your home record${/record: ([^,]+),/.exec(t.detail)?.[1] ? `: ${/record: ([^,]+),/.exec(t.detail)?.[1]}` : ""}`,
  pick_safety_steps: () => "Picked safe steps for this problem",
  skip_fix_steps: () => "Decided not to ask you to fix anything. Getting safe comes first.",
  send_guide: () => "Opened the picture guide made for your exact heater",
  save_photo: () => "Saved your photo to the case",
  notify_owner: () => "Let your landlord know",
  call_owner: () => "Called your landlord right away",
  place_call: () => "Called your landlord right away",
  nudge_owner: () => "Reminded your landlord",
  check_vendor_availability: () => "Looking for licensed plumbers who can come soon",
  book_vendor: () => "Booked a plumber and set up your visit",
  confirm_visit: () => "Confirmed the visit time with you",
  request_new_time: () => "Asking the plumber for a different time",
  installer_registration: () => "Added your new water heater to your home record",
  answer_from_record: (t) => (/don't know/i.test(t.title) ? "Checked your home record and the lease. The answer is not there, so I did not guess." : "Looked that up in your home record"),
  ask_owner: () => "Passed your question to your landlord",
  record_rent_payment: () => "Recorded your rent payment",
  remind_rent: () => "Reminded you that rent is late",
  send_notice: () => "Told you about your owner's rent notice",
  record_utility_payment: () => "Recorded your water and trash payment",
};

const CONTRACTOR_TOOLS = new Set(["read_quote", "check_quote_contractor", "flag_markup", "draft_pushback", "send_email", "hold"]);
const PAYMENT_TOOLS = new Set(["record_rent_payment", "record_utility_payment", "remind_rent", "send_notice"]);

/** Which job a tool call belongs to. Approvals take the job of the step before them. */
function jobOf(e: ToolCall, previous: string): string {
  if (e.agent === "sentinel") return "Rent increase";
  if (e.agent === "gate") return previous;
  if (PAYMENT_TOOLS.has(e.tool)) return "Rent and payments";
  if (e.agent === "chat") return "Questions and home record";
  if (CONTRACTOR_TOOLS.has(e.tool)) return "A contractor's quote";
  // The repair's own checks and the quote it collected, but not a quote that came in on its own.
  if (e.agent === "quote" && e.tool === "check_quote" && /counter|total is/i.test(e.title)) return "A contractor's quote";
  return "Water heater repair";
}

/** Date and time together, so a saved record never has a bare "9:06 AM". */
function stampOf(e: { at: number; revealAt?: number }): string {
  if (e.revealAt === undefined) return entryTime(e);
  return new Date(e.revealAt).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
}

export function activityFor(audience: "tenant" | "owner", entries: Entry[]): ActivityItem[] {
  const out: ActivityItem[] = [];
  let previous = "Water heater repair";
  for (const e of entries) {
    if (e.kind === "tool") {
      const job = jobOf(e, previous);
      previous = job;
      if (audience === "owner") {
        out.push({ id: e.id, job, clock: entryTime(e), stamp: stampOf(e), title: e.title, detail: e.detail, engine: e.engine });
      } else {
        const text = TENANT_TEXT[e.tool];
        if (text) out.push({ id: e.id, job, clock: entryTime(e), stamp: stampOf(e), title: text(e), detail: null, engine: null });
      }
    } else if (e.kind === "record" && e.history) {
      if (audience === "owner") {
        out.push({ id: e.id, job: /rent|lease|notice/i.test(e.history) ? "Rent increase" : "Water heater repair", clock: entryTime(e), stamp: stampOf(e), title: "Updated the home record", detail: e.history, engine: "code" });
      }
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// The tenant's list of requests
// ---------------------------------------------------------------------------

export interface RequestRow {
  id: string;
  title: string;
  status: string;
}

function caseStatus(w: World): string {
  switch (w.triage.stage) {
    case "asked_electrical":
      return "GoHome asked you a safety question";
    case "steps_given":
      return "Safe steps sent. Tell GoHome when you are done";
    case "quotes_pending":
      return "Your landlord is being told and quotes are coming in";
    case "decision_sent":
      return "Your landlord is choosing a plumber";
    case "booked":
      return w.triage.tenantConfirmed ? "Plumber booked and the visit time is confirmed" : "Plumber booked. Please confirm the time";
    case "done":
      return "Fixed";
    case "emergency":
      return w.triage.ownerAcked ? "Your landlord is on it" : "Emergency: your landlord is being called";
    default:
      return "Your landlord was told";
  }
}

/** Every problem the tenant has reported, newest last, each with where it stands. A second problem is its own row. */
export function requestsFor(w: World): RequestRow[] {
  const rows: RequestRow[] = [];
  let lastTenantText = "";
  let latestMain = -1;
  w.timeline.forEach((e) => {
    if (e.kind === "msg" && e.party === "tenant" && e.dir === "in" && e.text) lastTenantText = e.text;
    if (e.kind === "tool" && e.tool === "open_case") {
      latestMain = rows.length;
      rows.push({ id: e.id, title: lastTenantText.length > 60 ? `${lastTenantText.slice(0, 57).trimEnd()}...` : lastTenantText || "Your request", status: "Closed" });
    } else if (e.kind === "tool" && e.tool === "log_side_request") {
      rows.push({ id: e.id, title: lastTenantText.length > 60 ? `${lastTenantText.slice(0, 57).trimEnd()}...` : lastTenantText || "Another problem", status: "Logged. Your landlord was told" });
    }
  });
  if (latestMain >= 0) rows[latestMain].status = caseStatus(w);
  return rows;
}
