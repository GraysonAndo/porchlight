// Where a repair job stands, worked out from what has happened. It moves on its
// own: nothing asks the owner to set a status.
//
//   new -> quoted -> approved -> booked -> done
//
// "quoted" means Porchlight has collected and checked the quotes and is waiting
// for the owner's OK. "approved" turns into "booked" a moment later, when the
// vendor's confirmation comes back (simulated). "done" is one tap from the owner.

import { isHeaterJob } from "./agentLog";
import type { DemoState } from "./types";

export type JobStatus = "new" | "quoted" | "approved" | "booked" | "done";

/** How long a job shows as "approved" before it moves to "booked". */
export const APPROVED_MS = 2500;

export const JOB_STATUSES: { id: JobStatus; label: string; detail: string }[] = [
  { id: "new", label: "New", detail: "The request came in." },
  { id: "quoted", label: "Quoted", detail: "Quotes are collected and checked." },
  { id: "approved", label: "Approved", detail: "You said yes." },
  { id: "booked", label: "Booked", detail: "The vendor is confirmed." },
  { id: "done", label: "Done", detail: "The job is finished." },
];

export function jobStatus(
  state: Pick<DemoState, "request" | "triage" | "approval" | "jobCompletedAt">,
  nowMs: number,
): JobStatus {
  if (state.jobCompletedAt) return "done";
  if (state.approval) {
    const sent = Date.parse(state.approval.sentAt);
    return Number.isFinite(sent) && nowMs - sent < APPROVED_MS ? "approved" : "booked";
  }
  // Until someone reports a problem, the sample water heater request is waiting with its quotes.
  const heaterJob = state.request === null || isHeaterJob(state.request.description, state.triage);
  return heaterJob ? "quoted" : "new";
}

/** The index of the status in the list, for drawing progress. */
export function statusIndex(status: JobStatus): number {
  return JOB_STATUSES.findIndex((s) => s.id === status);
}
