"use client";

import { attentionFor, type Attention } from "./attention";
import { dueStatus } from "./payments";
import { useDemo } from "./store";

/** What is waiting on each person. Zero until the saved data has loaded, so the server and the browser agree. */
export function useAttention(): Attention {
  const { state, hydrated } = useDemo();
  if (!hydrated) return { owner: 0, tenant: 0 };
  const rentPaid = state.rentPaidAt !== null || state.payments.some((p) => p.kind === "rent");
  return attentionFor(state.agent, { lateRent: !rentPaid && dueStatus("rent").overdue });
}
