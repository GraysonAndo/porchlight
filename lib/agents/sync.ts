// Keeps the older detail screens (house record, quotes, booking) in step with what the
// agent did over text. The agent's world is the source of truth. This copies the parts the
// detail screens need into the app's state after each event.

import { PLAN } from "../plan";
import { ACCESS_WINDOWS } from "../seed";
import { triageText } from "../triage";
import type { DemoState } from "../types";
import { recordAt } from "./engine";
import { recordFromValues } from "./record";
import type { Ev, World } from "./types";

function countTool(world: World, tool: string): number {
  return world.timeline.filter((e) => e.kind === "tool" && e.tool === tool).length;
}

export function syncFromWorld(state: DemoState, before: World, after: World, ev: Ev, nowIso: string): Partial<DemoState> {
  const patch: Partial<DemoState> = {};

  // A new problem from the tenant starts a new case. A question or a reply does not.
  const started = ev.type === "tenant.text" && countTool(after, "emergency_rules") > countTool(before, "emergency_rules");
  let approval = state.approval;
  let jobCompletedAt = state.jobCompletedAt;
  if (started && ev.type === "tenant.text") {
    patch.request = { description: ev.text, photos: [], submittedAt: nowIso };
    patch.triage = triageText(ev.text);
    patch.tenantAnswers = null;
    patch.tenantAccess = null;
    approval = null;
    jobCompletedAt = null;
    patch.approval = null;
    patch.jobCompletedAt = null;
  }

  patch.tenantSkippedLabel = after.triage.labelSkipped;

  // The house record, as read from the tenant's label photo. After the job, the old record stays as history.
  if (after.triage.stage !== "done") {
    const rec = recordFromValues(recordAt(after.timeline, after.timeline.length).values);
    if (rec) patch.houseRecord = rec;
  }

  const booked = after.triage.stage === "booked" || after.triage.stage === "done";
  if (booked && !approval) {
    const pick = after.choice ?? { vendorId: PLAN.vendorId, notToExceed: PLAN.notToExceed, accessWindow: ACCESS_WINDOWS[0] };
    patch.approval = { ...pick, sentAt: nowIso };
  }
  if (after.triage.stage === "done" && !jobCompletedAt) patch.jobCompletedAt = nowIso;
  if (after.triage.tenantConfirmed && !state.tenantAccess) patch.tenantAccess = "confirmed";
  return patch;
}
