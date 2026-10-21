// "Live preview" prompts. A person can only look at one side at a time, so these show what is happening on the other
// side right now, and offer one tap to act as the other person. They only read the agent's state, so they are easy to test.

import { openOwnerMessage } from "./engine";
import type { Ev, Msg, World } from "./types";

export type PreviewRole = "tenant" | "owner";

export interface FlowPromptData {
  /** Changes whenever the situation changes, so a dismissed prompt comes back for the next thing */
  key: string;
  title: string;
  /** What the other person is looking at, taken from the last message they were sent */
  preview: { who: string; text: string } | null;
  cta: { label: string; events: Ev[] } | { label: string; href: string } | null;
}

const LEAK = "water heater is leaking all over the garage";

function lastMessage(w: World, party: "tenant" | "owner"): Msg | null {
  for (let i = w.timeline.length - 1; i >= 0; i--) {
    const e = w.timeline[i];
    if (e.kind === "msg" && e.party === party && e.dir === "out" && e.channel !== "call") return e;
  }
  return null;
}

/** Cuts a long text at a word, so a preview never ends in half a word. */
function clip(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  return `${cut.slice(0, Math.max(cut.lastIndexOf(" "), 1)).replace(/[\s,.;:]+$/, "")}...`;
}

function previewOf(w: World, party: "tenant" | "owner"): FlowPromptData["preview"] {
  const msg = lastMessage(w, party);
  if (!msg) return null;
  const text = msg.card ? `${msg.card.title}. ${msg.card.summary}` : msg.text;
  return { who: party === "owner" ? "The owner sees" : "The tenant sees", text: clip(text.replace(/\s+/g, " ").trim(), 240) };
}

/** What to show this person right now, or null when there is nothing useful to say. */
export function flowPromptFor(role: PreviewRole, w: World): FlowPromptData | null {
  const stage = w.triage.stage;
  const otherParty = role === "tenant" ? "owner" : "tenant";
  const preview = previewOf(w, otherParty);
  const key = `${role}:${stage}:${w.triage.ownerAcked}:${w.triage.tenantConfirmed}:${w.timeline.length === 0}:${w.quote.stage}`;
  const open = openOwnerMessage(w);

  if (role === "tenant") {
    switch (stage) {
      case "emergency":
        if (w.triage.ownerAcked) return null;
        return {
          key,
          title: "Meanwhile, your owner's phone is ringing",
          preview,
          cta: open ? { label: "Act as the owner: I'm on it", events: [{ type: "owner.tap", msgId: open.id, action: "ack" }] } : null,
        };
      case "steps_given":
      case "closed":
        return preview ? { key, title: "Meanwhile, on the owner's side", preview, cta: null } : null;
      case "quotes_pending":
        return { key, title: "Meanwhile, GoHome is getting quotes for your owner", preview, cta: null };
      case "decision_sent":
        return {
          key,
          title: "Meanwhile, your owner has a plan to approve",
          preview,
          cta: open ? { label: "Act as the owner: Approve", events: [{ type: "owner.tap", msgId: open.id, action: "approve" }] } : null,
        };
      case "booked":
        if (!w.triage.tenantConfirmed) {
          return { key, title: "Your plumber is booked. Is the time good?", preview, cta: { label: "Confirm the time: That works", events: [{ type: "tenant.text", text: "1", shown: "That works" }] } };
        }
        return { key, title: "Visit confirmed. Your owner knows.", preview, cta: { label: "Fast-forward: the plumber finishes", events: [{ type: "owner.markDone" }] } };
      case "done":
        return w.rentPaid ? null : { key, title: "All fixed. One more thing this month:", preview: null, cta: { label: "Pay this month's rent", href: "/tenant/pay" } };
      default:
        return null;
    }
  }

  switch (stage) {
    case "idle":
      if (w.timeline.length === 0) {
        return {
          key,
          title: "Nothing yet. A tenant can text GoHome any time.",
          preview: null,
          cta: { label: "Act as the tenant: report a leaking water heater", events: [{ type: "tenant.text", text: LEAK, shown: "My water heater is leaking" }] },
        };
      }
      return null;
    case "asked_electrical":
      return { key, title: "The tenant is answering a safety question", preview, cta: { label: "Act as the tenant: No, nothing electrical", events: [{ type: "tenant.text", text: "2", shown: "No" }] } };
    case "steps_given":
      return { key, title: "The tenant is doing the safe steps", preview, cta: { label: "Act as the tenant: Done", events: [{ type: "tenant.text", text: "done", shown: "Done" }] } };
    case "quotes_pending":
      return { key, title: "GoHome is collecting quotes. Your plan arrives in a moment.", preview, cta: null };
    case "decision_sent":
      return { key, title: "Meanwhile, your tenant is waiting", preview, cta: null };
    case "booked":
      if (!w.triage.tenantConfirmed) {
        return { key, title: "Your tenant just got the visit time", preview, cta: { label: "Act as the tenant: That works", events: [{ type: "tenant.text", text: "1", shown: "That works" }] } };
      }
      return { key, title: "Your tenant confirmed the visit.", preview, cta: null };
    case "done":
    case "closed":
      if (w.quote.stage === "idle") {
        return { key, title: "What else could come in?", preview: null, cta: { label: "Act as a contractor: send a quote", events: [{ type: "contractor.quote" }] } };
      }
      if (w.sentinel.stage === "idle") {
        return { key, title: "GoHome also watches your lease dates.", preview: null, cta: { label: w.rentPaid && w.cpiConfirmed ? "Run the Monday lease check" : "Settle the rent, confirm the inflation figure, then run the lease check", events: [...(w.rentPaid ? [] : [{ type: "rent.paid", paid: true } as const]), ...(w.cpiConfirmed ? [] : [{ type: "rent.cpi", confirmed: true } as const]), { type: "cron.lease" }] } };
      }
      return null;
    default:
      return null;
  }
}
