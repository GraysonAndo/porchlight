// What each person is allowed to see of the agent's work. The owner sees every step. The tenant only sees steps that
// matter to them, in plain words, and never anything about prices, quotes, or the owner's decisions. A step with no
// entry here is hidden from the tenant, so a new tool is private by default.

import { entryTime } from "./engine";
import type { Engine, Entry, ToolCall, World } from "./types";

export interface ActivityItem {
  id: string;
  clock: string;
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
  notify_owner: () => "Quietly told your landlord",
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
  send_notice: () => "Told you about your owner's rent notice",
  record_utility_payment: () => "Recorded your water and trash payment",
};

export function activityFor(audience: "tenant" | "owner", entries: Entry[]): ActivityItem[] {
  const out: ActivityItem[] = [];
  for (const e of entries) {
    if (e.kind === "tool") {
      if (audience === "owner") {
        out.push({ id: e.id, clock: entryTime(e), title: e.title, detail: e.detail, engine: e.engine });
      } else {
        const text = TENANT_TEXT[e.tool];
        if (text) out.push({ id: e.id, clock: entryTime(e), title: text(e), detail: null, engine: null });
      }
    } else if (e.kind === "record" && e.history) {
      if (audience === "owner") {
        out.push({ id: e.id, clock: entryTime(e), title: "Updated the home record", detail: e.history, engine: "code" });
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
    if (e.kind === "tool" && e.tool === "emergency_rules") {
      latestMain = rows.length;
      rows.push({ id: e.id, title: lastTenantText.length > 60 ? `${lastTenantText.slice(0, 57).trimEnd()}...` : lastTenantText || "Your request", status: "Closed" });
    } else if (e.kind === "tool" && e.tool === "log_side_request") {
      rows.push({ id: e.id, title: lastTenantText.length > 60 ? `${lastTenantText.slice(0, 57).trimEnd()}...` : lastTenantText || "Another problem", status: "Logged. Your landlord was told" });
    }
  });
  if (latestMain >= 0) rows[latestMain].status = caseStatus(w);
  return rows;
}
