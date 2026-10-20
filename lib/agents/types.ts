// Types for the SMS-first agent runtime. Everything an agent does is written to
// one ordered timeline of entries (messages, tool calls, house record writes).
// The screen replays that timeline at a human pace, so the demo looks live while
// the logic underneath stays plain, deterministic, and unit tested.

import type { Engine } from "../scenario";

export type { Engine };

export type Party = "tenant" | "owner" | "contractor";
export type AgentName = "triage" | "quote" | "sentinel" | "gate" | "chat";
export type Channel = "sms" | "call" | "email";

export type PhotoKind = "leak";

/** A button or quick reply under a message. */
export interface MsgAction {
  id: string;
  label: string;
  /** For tenant quick replies: the text that is sent when it is tapped */
  text?: string;
}

export interface Attachment {
  title: string;
  body: string;
}

/** A message the owner can act on, shown as a card: already worked out, one tap to approve. */
export interface MsgCard {
  kind: "decision" | "quote" | "lease" | "emergency";
  title: string;
  /** One plain sentence on what this is */
  summary: string;
  facts: { label: string; value: string; tone?: "good" | "caution" | "urgent" }[];
  /** A line shown right under the main button, for what the owner should know before tapping */
  note?: string;
}

export interface Msg {
  kind: "msg";
  id: string;
  /** Minutes since midnight on day 0. Each day adds 1440. */
  at: number;
  party: Party;
  /** "in" is sent by the person to GoHome. "out" is sent by GoHome. */
  dir: "in" | "out";
  channel: Channel;
  text: string;
  photo?: PhotoKind;
  attachment?: Attachment;
  /** Delivered without a sound or a buzz (Do Not Disturb) */
  silent?: boolean;
  card?: MsgCard;
  /** Id of a step-by-step picture guide shown under the message */
  guide?: string;
  /** Wall-clock time (ms) after which the screen shows this entry, so replies arrive at a human pace */
  revealAt?: number;
  actions?: MsgAction[];
  /** Set once one of the actions was used */
  usedAction?: string;
}

export interface ToolCall {
  kind: "tool";
  id: string;
  at: number;
  revealAt?: number;
  agent: AgentName;
  tool: string;
  engine: Engine;
  title: string;
  detail: string;
}

/** A write to the house record. `patch` keys are shown as fields on the record panel. */
export interface RecordWrite {
  kind: "record";
  id: string;
  at: number;
  revealAt?: number;
  patch: Record<string, string>;
  history?: string;
}

export type Entry = Msg | ToolCall | RecordWrite;

// ---------- Events ----------

export type Ev =
  | { type: "tenant.text"; text: string; /** What the chat shows, when a quick reply sends a code such as "1" */ shown?: string }
  | { type: "tenant.photo"; photo: PhotoKind }
  | { type: "owner.tap"; msgId: string; action: string }
  | { type: "owner.text"; text: string }
  | { type: "contractor.quote" }
  | { type: "contractor.counter"; total: number }
  | { type: "cron.lease" }
  | { type: "rent.paid"; paid: boolean; confirmation?: string }
  | { type: "utilities.paid"; amount: string; confirmation: string }
  | { type: "record.edit"; patch: Record<string, string> }
  | { type: "rent.notice"; kind: "increase" | "decrease"; from: string; to: string; effective: string }
  | { type: "owner.markDone" }
  | { type: "owner.choose"; vendorId: string; notToExceed: number; accessWindow: string }
  | { type: "timer"; id: TimerId };

export type TimerId = "quotes_in" | "owner_nudge" | "job_done" | "notice_delivered";

export interface Scheduled {
  at: number;
  id: TimerId;
}

// ---------- Agent memory ----------

export type TriageStage =
  | "idle"
  | "asked_electrical"
  | "steps_given"
  | "quotes_pending"
  | "decision_sent"
  | "booked"
  | "done"
  | "emergency"
  | "closed";

export type QuoteStage = "idle" | "awaiting_owner" | "sent" | "countered" | "settled";
export type SentinelStage = "idle" | "awaiting_owner" | "mailed" | "held" | "delivered";

export interface World {
  /** Minutes since midnight on day 0 */
  clock: number;
  seq: number;
  timeline: Entry[];
  pending: Scheduled[];
  triage: {
    stage: TriageStage;
    ownerAcked: boolean;
    tenantConfirmed: boolean;
  };
  quote: {
    stage: QuoteStage;
    total: number;
    draft: string;
    counters: number;
    counterTotal: number;
  };
  sentinel: {
    stage: SentinelStage;
    proposed: number;
  };
  stats: {
    ownerTaps: number;
    saved: number;
  };
  /** Whether this month's rent was marked paid (demo) */
  rentPaid: boolean;
  /** Whether this month's utilities were paid */
  utilitiesPaid?: boolean;
  /** The vendor, limit, and time the owner picked by hand instead of GoHome's plan */
  choice: { vendorId: string; notToExceed: number; accessWindow: string } | null;
}
