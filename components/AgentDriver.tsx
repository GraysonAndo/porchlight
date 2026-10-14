"use client";

// Lets time pass on its own. When Porchlight is waiting for vendor quotes, they arrive a few seconds
// later, so nobody has to press anything for the demo to move. It works on whichever page is open.

import { useEffect } from "react";
import { useDemo } from "@/lib/store";

const QUOTES_DELAY_MS = 2500;

export function AgentDriver() {
  const { state, actions, hydrated } = useDemo();
  const next = state.agent.pending[0];
  const waitingForQuotes = hydrated && next !== undefined && next.id === "quotes_in";

  useEffect(() => {
    if (!waitingForQuotes) return;
    const t = setTimeout(() => actions.agentAdvance(), QUOTES_DELAY_MS);
    return () => clearTimeout(t);
  }, [waitingForQuotes, actions]);

  return null;
}
