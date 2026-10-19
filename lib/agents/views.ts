// What each person is allowed to see of the agent's work. The owner sees every step. The tenant only sees steps that
// matter to them, in plain words, and never anything about prices, quotes, or the owner's decisions. A step with no
// entry here is hidden from the tenant, so a new tool is private by default.

import { clockText } from "./engine";
import type { Engine, Entry, ToolCall } from "./types";

export interface ActivityItem {
  id: string;
  clock: string;
  title: string;
  detail: string | null;
  engine: Engine | null;
}

const TENANT_TEXT: Record<string, (t: ToolCall) => string> = {
  emergency_rules: (t) => (/matched/i.test(t.title) ? "Checked your problem against the emergency safety rules. This one is urgent." : "Checked your problem against the emergency safety rules. Not an emergency."),
  lookup_house_record: () => "Found your water heater in your home record: Hearthline HL-40G-NG",
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
  record_utility_payment: () => "Recorded your water and trash payment",
};

export function activityFor(audience: "tenant" | "owner", entries: Entry[]): ActivityItem[] {
  const out: ActivityItem[] = [];
  for (const e of entries) {
    if (e.kind === "tool") {
      if (audience === "owner") {
        out.push({ id: e.id, clock: clockText(e.at), title: e.title, detail: e.detail, engine: e.engine });
      } else {
        const text = TENANT_TEXT[e.tool];
        if (text) out.push({ id: e.id, clock: clockText(e.at), title: text(e), detail: null, engine: null });
      }
    } else if (e.kind === "record" && e.history) {
      if (audience === "owner") {
        out.push({ id: e.id, clock: clockText(e.at), title: "Updated the home record", detail: e.history, engine: "code" });
      }
    }
  }
  return out;
}
