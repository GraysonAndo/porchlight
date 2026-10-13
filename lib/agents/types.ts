// Types for the SMS-first agent runtime. Everything an agent does is written to
// one ordered timeline of entries (messages, tool calls, house record writes).
// The screen replays that timeline at a human pace, so the demo looks live while
// the logic underneath stays plain, deterministic, and unit tested.

import type { Engine } from "../scenario";

export type { Engine };

export type Party = "tenant" | "owner" | "contractor";
export type AgentName = "triage" | "quote" | "sentinel" | "gate";
export type Channel = "sms" | "call" | "email";

export type PhotoKind = "leak" | "label" | "blurry";

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

export interface Msg {
  kind: "msg";
  id: string;
  /** Minutes since midnight on day 0. Each day adds 1440. */
  at: number;
  party: Party;
  /** "in" is sent by the person to Porchlight. "out" is sent by Porchlight. */
  dir: "in" | "out";
  channel: Channel;
  text: string;
  photo?: PhotoKind;
  attachment?: Attachment;
  /** Delivered without a sound or a buzz (Do Not Disturb) */
  silent?: boolean;
  actions?: MsgAction[];
  /** Set once one of the actions was used */
  usedAction?: string;
}

export interface ToolCall {
  kind: "tool";
  id: string;
  at: number;
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
  patch: Record<string, string>;
  history?: string;
}

export type Entry = Msg | ToolCall | RecordWrite;

// ---------- Events ----------

export type Ev =
  | { type: "tenant.text"; text: string }
  | { type: "tenant.photo"; photo: PhotoKind }
  | { type: "owner.tap"; msgId: string; action: string }
  | { type: "owner.text"; text: string }
  | { type: "contractor.quote" }
  | { type: "contractor.counter"; total: number }
  | { type: "cron.lease" }
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
  | "asked_photo"
  | "confirm_serial"
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
    photoTries: number;
    labelSkipped: boolean;
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
}
