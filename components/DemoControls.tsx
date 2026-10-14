"use client";

// Things that would happen by themselves in real life, as buttons for the demo.

import { TIMER_WORDS } from "@/lib/agents/words";
import { useAgent } from "@/lib/agents/useAgent";
import { useDemo } from "@/lib/store";

export function DemoControls({ show }: { show: ("clock" | "quote" | "lease")[] }) {
  const { world, send, advance } = useAgent();
  const { actions } = useDemo();
  const next = world.pending[0];

  return (
    <details className="rounded-2xl border border-dashed border-line bg-white/70 px-4">
      <summary className="flex min-h-11 cursor-pointer items-center text-sm font-bold text-ink-soft">Demo controls (things that happen on their own in real life)</summary>
      <div className="flex flex-wrap gap-2 pb-4">
        {show.includes("clock") && (
          <button type="button" className="btn btn-secondary !min-h-11 text-sm" disabled={!next} onClick={advance}>
            {next ? `Skip ahead: ${TIMER_WORDS[next.id]}` : "Nothing is scheduled"}
          </button>
        )}
        {show.includes("quote") && (
          <button type="button" className="btn btn-secondary !min-h-11 text-sm" disabled={world.quote.stage !== "idle"} onClick={() => send({ type: "contractor.quote" })}>
            A contractor emails a quote
          </button>
        )}
        {show.includes("lease") && (
          <button type="button" className="btn btn-secondary !min-h-11 text-sm" disabled={world.sentinel.stage !== "idle" && world.sentinel.stage !== "held"} onClick={() => send({ type: "cron.lease" })}>
            Porchlight checks the lease dates
          </button>
        )}
        <button type="button" className="btn btn-ghost !min-h-11 text-sm" onClick={() => actions.reset()}>
          Start over
        </button>
      </div>
    </details>
  );
}
