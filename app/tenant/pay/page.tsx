"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui";
import { BILLS, DIRECT_UTILITIES, money, type PayKind } from "@/lib/payments";
import { longDate } from "@/lib/format";
import { useDemo } from "@/lib/store";
import type { Payment } from "@/lib/types";

function isPayment(x: unknown): x is Payment {
  const p = x as Payment;
  return !!p && typeof p.id === "string" && (p.kind === "rent" || p.kind === "utilities") && typeof p.cents === "number" && typeof p.confirmation === "string";
}

const makeSrc = (kinds: PayKind[], n: number) => `/checkout?due=${kinds.join(",")}&n=${n}`;

/** Waits until the saved payments are loaded, so the checkout starts with the right bills. */
export default function PayPage() {
  const { hydrated } = useDemo();
  if (!hydrated) return <p className="mx-auto max-w-5xl text-ink-soft">Loading your payments...</p>;
  return <PayBody />;
}

function PayBody() {
  const { state, actions } = useDemo();
  const paidKinds = new Set(state.payments.map((p) => p.kind));
  if (state.rentPaidAt) paidKinds.add("rent");
  const due = BILLS.filter((b) => !paidKinds.has(b.kind));
  const dueTotal = due.reduce((s, b) => s + b.cents, 0);
  const checkouts = new Set(state.payments.map((p) => p.confirmation)).size;

  // The checkout keeps the address it started with, so its receipt is not wiped when a bill is recorded as paid.
  // After "Done" it is cleared, and a fresh checkout appears if something is still due.
  const [started, setStarted] = useState<string | null>(() => (due.length > 0 ? makeSrc(due.map((b) => b.kind), checkouts) : null));
  const src = started;
  const latest = useRef({ due, checkouts });
  useEffect(() => {
    latest.current = { due, checkouts };
  });
  const [height, setHeight] = useState(760);
  const frame = useRef<HTMLIFrameElement>(null);
  const seen = useRef(new Set<string>());

  useEffect(() => {
    function onMessage(e: MessageEvent) {
      if (e.origin !== window.location.origin || e.source !== frame.current?.contentWindow) return;
      const data = e.data as { type?: string; payments?: unknown[]; height?: number };
      if (data?.type === "gohome-checkout-height" && typeof data.height === "number") {
        setHeight(Math.min(Math.max(Math.ceil(data.height), 420), 1600));
      } else if (data?.type === "gohome-payment" && Array.isArray(data.payments)) {
        const fresh = data.payments.filter(isPayment).filter((p) => !seen.current.has(p.id));
        fresh.forEach((p) => seen.current.add(p.id));
        if (fresh.length > 0) actions.recordPayments(fresh);
      } else if (data?.type === "gohome-checkout-done") {
        // The payment is already recorded by now, so this is a fresh checkout for whatever is still due.
        const { due: left, checkouts: n } = latest.current;
        setStarted(left.length > 0 ? makeSrc(left.map((b) => b.kind), n) : null);
      }
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [actions]);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold leading-tight sm:text-4xl">Pay rent and utilities</h1>
        <p className="mt-1 text-lg text-ink-soft">1200 Example Court, San Jose, CA 95100</p>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[1fr_26rem]">
        <div className="space-y-5">
          <section aria-labelledby="due-heading" className="card space-y-3">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 id="due-heading" className="text-xl font-extrabold">
                {dueTotal > 0 ? "Amount due" : "You are all paid up"}
              </h2>
              <p className="text-3xl font-extrabold">{money(dueTotal)}</p>
            </div>
            <ul className="divide-y divide-line">
              {BILLS.map((b) => {
                const paid = paidKinds.has(b.kind);
                return (
                  <li key={b.kind} className="flex items-center justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <p className="font-bold">{b.label}</p>
                      <p className="text-sm text-ink-soft">
                        {b.due}. {b.detail}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className="font-extrabold">{money(b.cents)}</span>
                      {paid ? <Badge tone="good">Paid</Badge> : <Badge tone="caution">Due</Badge>}
                    </div>
                  </li>
                );
              })}
            </ul>
            <p className="text-sm text-ink-soft">{DIRECT_UTILITIES}</p>
          </section>

          <section aria-labelledby="history-heading" className="card space-y-3">
            <h2 id="history-heading" className="text-xl font-extrabold">
              Payment history
            </h2>
            {state.payments.length === 0 ? (
              <p className="text-ink-soft">No payments yet. Your receipts will show here.</p>
            ) : (
              <ul className="divide-y divide-line">
                {[...state.payments].reverse().map((p) => (
                  <li key={p.id} className="flex items-start justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <p className="font-bold">{p.label}</p>
                      <p className="text-sm text-ink-soft">
                        {longDate(p.paidAt.slice(0, 10))}, {p.method === "card" ? "card" : "bank account"} ending in {p.last4}. Confirmation {p.confirmation}.
                      </p>
                    </div>
                    <span className="shrink-0 font-extrabold">{money(p.cents + p.feeCents)}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <p className="text-sm text-ink-soft">
            Autopay, and who gets your receipts, are in{" "}
            <Link href="/tenant/settings" className="font-bold underline underline-offset-4">
              Settings
            </Link>
            .
          </p>
        </div>

        <section aria-label="Checkout" className="overflow-hidden rounded-2xl border border-line bg-white lg:sticky lg:top-20">
          {src ? (
            <iframe ref={frame} title="Secure checkout" src={src} style={{ height }} className="block w-full border-0" />
          ) : (
            <div className="space-y-3 p-6 text-center">
              <p className="text-xl font-extrabold">Nothing to pay right now</p>
              <p className="text-ink-soft">When a new bill arrives, GoHome will text you and it will show up here.</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
