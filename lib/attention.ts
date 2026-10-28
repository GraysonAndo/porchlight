// What is waiting on each person right now, as a number for a small badge on their first tab. The same rules as the screens
// themselves, so a badge never says something is waiting when the page would say all clear.

import type { Msg, World } from "./agents/types";

export interface Attention {
  /** Things in the owner's inbox: open approvals and questions, and late rent */
  owner: number;
  /** Things the tenant is being asked: the safety question, or to confirm the visit time */
  tenant: number;
}

export function attentionFor(world: World, opts: { lateRent: boolean; now?: number }): Attention {
  const now = opts.now ?? Date.now();
  const open = world.timeline.filter(
    (e): e is Msg => e.kind === "msg" && e.party === "owner" && e.dir === "out" && Boolean(e.actions?.length) && !e.usedAction && (e.revealAt ?? 0) <= now,
  );
  const tenantNeeds = world.triage.stage === "asked_electrical" || (world.triage.stage === "booked" && !world.triage.tenantConfirmed);
  return { owner: open.length + (opts.lateRent ? 1 : 0), tenant: tenantNeeds ? 1 : 0 };
}
