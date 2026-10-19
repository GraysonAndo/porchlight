// A new, empty agent world. Kept apart from the engine so the seed data can use it without a circular import.

import type { World } from "./types";

/** The story starts at 4:07 AM on day 0. */
export const START_CLOCK = 4 * 60 + 7;

export function createWorld(): World {
  return {
    clock: START_CLOCK,
    seq: 0,
    timeline: [],
    pending: [],
    triage: { stage: "idle", ownerAcked: false, tenantConfirmed: false },
    quote: { stage: "idle", total: 0, draft: "", counters: 0, counterTotal: 0 },
    sentinel: { stage: "idle", proposed: 0 },
    stats: { ownerTaps: 0, saved: 0 },
    rentPaid: false,
    choice: null,
  };
}
