"use client";

// After the owner's first approval, offer to skip the tap next time. It only changes the setting when they choose.

import { useState } from "react";
import { usd } from "@/lib/format";
import { useDemo } from "@/lib/store";

const CHOICES = [500, 1500, 3000];

export function AutoApproveOffer({ lastQuote }: { lastQuote: number | null }) {
  const { state, actions } = useDemo();
  const [chosen, setChosen] = useState<number | "ask" | null>(null);
  const limit = state.prefs.ownerAutoApprove;
  if (chosen === null && (limit > 0 || state.prefs.ownerAutoOfferSeen)) return null;

  if (chosen !== null) {
    return (
      <p role="status" className="rounded-xl bg-good-tint p-4 font-bold text-good-ink">
        {chosen === "ask"
          ? "OK. GoHome will keep asking before it books anything. You can change this in Settings."
          : `Done. GoHome will book repairs of ${usd(chosen)} or less on its own, and show them in the activity feed. Emergencies still ring you. Change it any time in Settings.`}
      </p>
    );
  }

  function choose(value: number | "ask") {
    actions.setPref("ownerAutoOfferSeen", true);
    if (value !== "ask") actions.setPref("ownerAutoApprove", value);
    setChosen(value);
  }

  return (
    <section aria-labelledby="skip-tap-heading" className="rounded-2xl border border-line bg-white p-5">
      <h2 id="skip-tap-heading" className="text-xl font-extrabold">
        Want to skip this tap next time?
      </h2>
      <p className="mt-1 text-ink-soft">
        GoHome can book repairs on its own when the quote is at or under an amount you pick, and tell you after.
        {lastQuote ? ` This one was ${usd(lastQuote)}.` : ""} Anything over your amount still waits for you, and emergencies always ring you.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {CHOICES.map((c) => (
          <button key={c} type="button" className="btn btn-secondary" onClick={() => choose(c)}>
            Yes, up to {usd(c)}
          </button>
        ))}
        <button type="button" className="btn btn-ghost" onClick={() => choose("ask")}>
          No, keep asking me
        </button>
      </div>
    </section>
  );
}
