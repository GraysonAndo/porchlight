"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { CheckoutForm } from "@/components/CheckoutForm";
import type { PayKind } from "@/lib/payments";

function CheckoutBody() {
  const params = useSearchParams();
  const due = (params.get("due") ?? "rent,utilities")
    .split(",")
    .filter((k): k is PayKind => k === "rent" || k === "utilities");
  const paidCount = Math.max(0, Number(params.get("n") ?? 0) || 0);
  return <CheckoutForm due={due} paidCount={paidCount} />;
}

/** The embedded checkout. It has no header or footer, so it can sit inside the Pay page like a payment provider's form. */
export default function CheckoutPage() {
  return (
    <div className="mx-auto w-full max-w-md bg-white">
      <Suspense fallback={<p className="p-5 text-ink-soft">Loading checkout...</p>}>
        <CheckoutBody />
      </Suspense>
    </div>
  );
}
