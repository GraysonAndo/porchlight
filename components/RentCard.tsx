"use client";

// A sample rent payment: nothing is charged or processed.

import { CheckIcon } from "./icons";
import { Badge, Card } from "./ui";
import { longDate, usd } from "@/lib/format";
import { PROPERTY, RENT_MONTH } from "@/lib/seed";
import { useDemo } from "@/lib/store";

export function RentCard({ audience }: { audience: "tenant" | "owner" }) {
  const { state, actions } = useDemo();
  const paid = state.rentPaidAt !== null;
  const when = state.rentPaidAt ? longDate(state.rentPaidAt.slice(0, 10)) : "";

  return (
    <Card
      title={
        <span className="flex flex-wrap items-center gap-2">
          {RENT_MONTH} rent
          {paid ? <Badge tone="good">Paid</Badge> : <Badge tone="caution">Not marked paid</Badge>}
        </span>
      }
    >
      <p className="text-lg">
        <strong>{usd(PROPERTY.rent)}</strong> for {PROPERTY.address}.
      </p>
      {paid ? (
        <p className="mt-1 flex items-start gap-2 font-bold text-good-ink" role="status">
          <CheckIcon size={22} />
          <span>Marked paid on {when}. No real money moved (sample data).</span>
        </p>
      ) : (
        <p className="mt-1 text-ink-soft">
          {audience === "tenant" ? "Pay securely from your phone. " : `${PROPERTY.tenant} has not paid yet. If they paid you another way, mark it here. `}
          Sample payment: nothing is actually charged.
        </p>
      )}
      <div className="mt-3">
        {paid ? (
          <button type="button" className="btn btn-ghost" onClick={() => actions.setRentPaid(false)}>
            Undo
          </button>
        ) : (
          <button type="button" className="btn btn-primary" onClick={() => actions.setRentPaid(true)}>
            {audience === "tenant" ? `Pay ${usd(PROPERTY.rent)}` : "Mark as paid"}
          </button>
        )}
      </div>
    </Card>
  );
}
