"use client";

import { BellIcon } from "./icons";
import { PROPERTY } from "@/lib/seed";
import { useDemo } from "@/lib/store";

/** "Text updates are on": the agent texts this person every update. They can turn it off. */
export function TextUpdatesToggle({ party }: { party: "tenant" | "owner" }) {
  const { state, actions } = useDemo();
  const on = state.textUpdates[party];
  const phone = party === "tenant" ? PROPERTY.tenantPhone : PROPERTY.ownerPhone;

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-white px-4 py-2">
      <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-glow-tint">
        <BellIcon size={20} />
      </span>
      <p className="min-w-0 flex-1 text-sm">
        <strong>{on ? "Text updates are on" : "Text updates are off"}</strong>
        <span className="block text-ink-soft">{on ? `Porchlight texts ${phone} each time something changes. (Demo, nothing is sent.)` : "Updates only show here."}</span>
      </p>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label="Text updates"
        onClick={() => actions.setTextUpdates(party, !on)}
        className={`relative inline-flex h-11 w-16 shrink-0 items-center rounded-full border-2 transition-colors ${on ? "border-good bg-good" : "border-line bg-cream-deep"}`}
      >
        <span className={`inline-block h-8 w-8 rounded-full bg-white shadow transition-transform ${on ? "translate-x-7" : "translate-x-1"}`} />
      </button>
    </div>
  );
}
