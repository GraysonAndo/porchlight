"use client";

// Lets time pass on its own. When GoHome is waiting for vendor quotes, they arrive a few seconds
// later, so nobody has to press anything. It works on whichever page is open.

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useDemo } from "@/lib/store";
import { dueStatus } from "@/lib/payments";
import { PROPERTY } from "@/lib/seed";

const QUOTES_DELAY_MS = 2500;

export function AgentDriver() {
  const { state, actions, hydrated } = useDemo();
  // The embedded checkout is a second copy of the app inside the page. Only the outer page lets time pass.
  const embedded = usePathname() === "/checkout";
  const next = state.agent.pending[0];
  const waitingForQuotes = hydrated && !embedded && next !== undefined && next.id === "quotes_in";

  // When the owner has said so, a late-rent reminder goes out on its own once the grace period is over. It is logged as GoHome's own step.
  const rentPaid = state.rentPaidAt !== null || state.payments.some((p) => p.kind === "rent");
  const rent = dueStatus("rent");
  const daysLate = Number(/^(\d+)/.exec(rent.text)?.[1] ?? 0);
  const shouldRemind = hydrated && !embedded && state.prefs.ownerAutoRemind && !rentPaid && rent.overdue && daysLate > PROPERTY.graceDays && state.agent.rentReminded !== true;

  useEffect(() => {
    if (!shouldRemind) return;
    const t = setTimeout(() => actions.agentSend({ type: "rent.remind", daysLate }), 1200);
    return () => clearTimeout(t);
  }, [shouldRemind, daysLate, actions]);

  useEffect(() => {
    if (!waitingForQuotes) return;
    const t = setTimeout(() => actions.agentAdvance(), QUOTES_DELAY_MS);
    return () => clearTimeout(t);
  }, [waitingForQuotes, actions]);

  return null;
}
