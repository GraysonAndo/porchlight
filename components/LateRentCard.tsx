"use client";

// Money owed to the owner comes first in the inbox, ahead of anything to approve. This is the card for late rent.

import { TapIcon } from "./icons";
import { dueStatus, money } from "@/lib/payments";
import { PROPERTY, RENT_MONTH } from "@/lib/seed";
import { useDemo } from "@/lib/store";

export function LateRentCard() {
  const { state, actions } = useDemo();
  const status = dueStatus("rent");
  const paid = state.rentPaidAt !== null || state.payments.some((p) => p.kind === "rent");
  if (paid || !status.overdue) return null;
  const days = Number(/^(\d+)/.exec(status.text)?.[1] ?? 0);
  const reminded = state.agent.rentReminded === true;
  const feeApplies = days > PROPERTY.graceDays;

  return (
    <section aria-label={`Money owed to you: ${RENT_MONTH} rent`} className="reveal rounded-3xl border-2 border-urgent bg-urgent-tint p-5 shadow-sm sm:p-6">
      <p className="eyebrow !text-urgent">Money owed to you</p>
      <h2 className="mt-1 font-display text-2xl font-extrabold leading-tight sm:text-3xl">{RENT_MONTH} rent is {days} days late</h2>
      <p className="mt-2 text-lg text-ink-soft">
        {PROPERTY.tenant} owes {money(PROPERTY.rent * 100)}. It was due Oct 1.
        {feeApplies ? ` Your lease adds a ${money(PROPERTY.lateFee * 100)} late fee after a ${PROPERTY.graceDays}-day grace period, so that fee applies now.` : ""}
      </p>
      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        <button
          type="button"
          className="btn btn-primary btn-lg w-full sm:w-auto"
          disabled={reminded}
          onClick={() => actions.agentSend({ type: "rent.remind", daysLate: days })}
        >
          <TapIcon size={22} /> {reminded ? "Reminder sent" : "Send a reminder"}
        </button>
        <button type="button" className="btn btn-ghost w-full sm:w-auto" onClick={() => actions.setRentPaid(true)}>
          Mark as paid
        </button>
        {!reminded && !state.prefs.ownerAutoRemind && (
          <button type="button" className="btn btn-ghost w-full sm:w-auto" onClick={() => actions.setPref("ownerAutoRemind", true)}>
            Remind late tenants for me from now on
          </button>
        )}
      </div>
      <p className="mt-2 text-sm text-ink-soft">
        {reminded ? `${PROPERTY.tenant} was texted what is owed and the late fee.${state.prefs.ownerAutoRemind ? " GoHome sent it for you, as you asked." : ""}` : state.prefs.ownerAutoRemind ? "GoHome is sending the reminder for you now." : "One tap texts your tenant what is owed, or let GoHome do it for you from now on. Use Mark as paid if they paid another way, like a check."}
      </p>
    </section>
  );
}
