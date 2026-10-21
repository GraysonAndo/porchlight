// The demo autopilot. It looks at where each agent is and picks the next thing
// a person would do: the tenant answers, the owner taps, a contractor emails.
// Because it reads the agents' own state, it can start from any point, and it
// keeps working after a presenter has done a few steps by hand.

import { openOwnerMessage, nextTimerAt } from "./engine";
import type { Ev, World } from "./types";

export type AutoStep = { ev: Ev } | { jump: true } | null;

function ownerTap(w: World, action: string): AutoStep {
  const open = openOwnerMessage(w);
  if (!open || !open.actions?.some((a) => a.id === action)) return null;
  return { ev: { type: "owner.tap", msgId: open.id, action } };
}

/** What to do next in the story, or null when the story is over. */
export function autopilotNext(w: World): AutoStep {
  const hasTimer = nextTimerAt(w) !== null;

  switch (w.triage.stage) {
    case "idle":
      if (w.timeline.length === 0) return { ev: { type: "tenant.text", text: "water heater is leaking all over the garage", shown: "My water heater is leaking" } };
      break;
    case "asked_electrical":
      return { ev: { type: "tenant.text", text: "2", shown: "No" } };
    case "steps_given":
      return { ev: { type: "tenant.text", text: "done", shown: "Done" } };
    case "quotes_pending":
      return hasTimer ? { jump: true } : null;
    case "decision_sent":
      return ownerTap(w, "approve");
    case "booked":
      if (!w.triage.tenantConfirmed) return { ev: { type: "tenant.text", text: "1", shown: "That works" } };
      return hasTimer ? { jump: true } : null;
    case "emergency":
      if (!w.triage.ownerAcked) return ownerTap(w, "ack");
      return null;
    default:
      break;
  }

  if (w.triage.stage !== "done" && w.triage.stage !== "idle" && w.triage.stage !== "closed") return null;

  // Loop 2: the quote audit.
  switch (w.quote.stage) {
    case "idle":
      return { ev: { type: "contractor.quote" } };
    case "awaiting_owner":
      return ownerTap(w, "qsend");
    case "sent":
      return { ev: { type: "contractor.counter", total: 2550 } };
    case "countered":
      return ownerTap(w, "qaccept");
    default:
      break;
  }

  // Loop 3: the compliance sentinel.
  switch (w.sentinel.stage) {
    case "idle":
      // Late rent comes first, and the rent cap needs the owner's own inflation figure, so both are settled before the lease check.
      if (!w.rentPaid) return { ev: { type: "rent.paid", paid: true } };
      if (!w.cpiConfirmed) return { ev: { type: "rent.cpi", confirmed: true } };
      return { ev: { type: "cron.lease" } };
    case "awaiting_owner":
      return ownerTap(w, "rent5");
    case "mailed":
      return hasTimer ? { jump: true } : null;
    default:
      return null;
  }
}
