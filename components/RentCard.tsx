"use client";

// The owner's view of rent and utilities: what has come in, how, and a way to record rent paid some other way.

import Link from "next/link";
import { CheckIcon } from "./icons";
import { Badge, Card } from "./ui";
import { longDate } from "@/lib/format";
import { BILLS, dueStatus, money } from "@/lib/payments";
import { PROPERTY, RENT_MONTH } from "@/lib/seed";
import { useDemo } from "@/lib/store";

export function RentCard() {
  const { state, actions } = useDemo();
  const paid = state.rentPaidAt !== null;
  const rentPayment = state.payments.find((p) => p.kind === "rent");
  const utilityPayment = state.payments.find((p) => p.kind === "utilities");

  return (
    <Card
      title={
        <span className="flex flex-wrap items-center gap-2">
          Rent and utilities
          {paid ? <Badge tone="good">Rent received</Badge> : dueStatus("rent").overdue ? <Badge tone="urgent">Rent overdue</Badge> : <Badge tone="caution">Rent not received</Badge>}
        </span>
      }
    >
      <ul className="divide-y divide-line">
        {BILLS.map((b) => {
          const p = b.kind === "rent" ? rentPayment : utilityPayment;
          const done = b.kind === "rent" ? paid : Boolean(utilityPayment);
          const status = dueStatus(b.kind);
          return (
            <li key={b.kind} className="flex items-start justify-between gap-3 py-2">
              <div className="min-w-0">
                <p className="font-bold">
                  {b.kind === "rent" ? `${RENT_MONTH} rent` : b.label}
                </p>
                <p className="text-sm text-ink-soft">
                  {p
                    ? `${longDate(p.paidAt.slice(0, 10))}, ${p.method === "card" ? "card" : "bank transfer"} ending in ${p.last4}. Confirmation ${p.confirmation}.`
                    : done
                      ? `Marked paid on ${longDate((state.rentPaidAt ?? "").slice(0, 10))}.`
                      : `${PROPERTY.tenant} has not paid yet. ${status.text}`}
                </p>
              </div>
              <span className="flex shrink-0 items-center gap-2">
                <span className="font-extrabold">{money(b.cents)}</span>
                {done ? <CheckIcon size={20} /> : status.overdue ? <Badge tone="urgent">Overdue</Badge> : null}
              </span>
            </li>
          );
        })}
      </ul>
      {!paid && !dueStatus("rent").overdue && (
        <div className="mt-3 space-y-1">
          <button type="button" className="btn btn-secondary" onClick={() => actions.setRentPaid(true)}>
            Mark rent as paid
          </button>
          <p className="hint">Use this if {PROPERTY.tenant} paid you another way, like a check.</p>
        </div>
      )}
      {paid && !rentPayment && (
        <button type="button" className="btn btn-ghost mt-2" onClick={() => actions.setRentPaid(false)}>
          Undo
        </button>
      )}
      <p className="mt-3 text-sm text-ink-soft">
        Payments are sample data: no real money moves.{" "}
        <Link href="/owner/rent" className="font-bold underline underline-offset-4">
          Plan a rent increase
        </Link>
      </p>
    </Card>
  );
}
