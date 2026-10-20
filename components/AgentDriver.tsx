"use client";

// Lets time pass on its own. When GoHome is waiting for vendor quotes, they arrive a few seconds
// later, so nobody has to press anything. It works on whichever page is open.

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useDemo } from "@/lib/store";

const QUOTES_DELAY_MS = 2500;

export function AgentDriver() {
  const { state, actions, hydrated } = useDemo();
  // The embedded checkout is a second copy of the app inside the page. Only the outer page lets time pass.
  const embedded = usePathname() === "/checkout";
  const next = state.agent.pending[0];
  const waitingForQuotes = hydrated && !embedded && next !== undefined && next.id === "quotes_in";

  useEffect(() => {
    if (!waitingForQuotes) return;
    const t = setTimeout(() => actions.agentAdvance(), QUOTES_DELAY_MS);
    return () => clearTimeout(t);
  }, [waitingForQuotes, actions]);

  return null;
}
