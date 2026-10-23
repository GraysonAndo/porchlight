"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui";
import { BILLS, DIRECT_UTILITIES, dueStatus, money, type PayKind } from "@/lib/payments";
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
  if (!hydrated) return <p className="mx-auto min-h-[103rem] max-w-5xl text-ink-soft md:min-h-[64rem]">Loading your payments...</p>;
  return <PayBody />;
}

function PayBody() {
  const { state, actions } = useDemo();
  const paidKinds = new Set(state.payments.map((p) => p.kind));
  if (state.rentPaidAt) paidKinds.add("rent");
  const due = BILLS.filter((b) => !paidKinds.has(b.kind));
  const dueTotal = due.reduce((s, b) => s + b.cents, 0);
  const checkouts = new Set(state.payments.map((p) => p.confirmation)).size;
  // One receipt per checkout: the bills paid, the card fee on its own line, and what was charged in all.
  const lastPayment = state.payments.at(-1);
  const savedMethod = lastPayment ? `${lastPayment.method === "card" ? "card" : "bank account"} ending in ${lastPayment.last4}` : "sample bank account ending in 6789";
  const receipts = [...new Set(state.payments.map((p) => p.confirmation))]
    .reverse()
    .map((confirmation) => {
      const items = state.payments.filter((p) => p.confirmation === confirmation);
      const fee = items.reduce((sum, p) => sum + p.feeCents, 0);
      return { confirmation, items, fee, total: items.reduce((sum, p) => sum + p.cents, 0) + fee, paidAt: items[0].paidAt, method: items[0].method, last4: items[0].last4 };
    });

  // The checkout keeps the address it started with, so its receipt is not wiped when a bill is recorded as paid.
  // After "Done" it is cleared, and a fresh checkout appears if something is still due.
  const [started, setStarted] = useState<string | null>(() => (due.length > 0 ? makeSrc(due.map((b) => b.kind), checkouts) : null));
  const src = started;
  const latest = useRef({ due, checkouts });
  useEffect(() => {
    latest.current = { due, checkouts };
  });
  const [height, setHeight] = useState(930);
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
                const status = dueStatus(b.kind);
                return (
                  <li key={b.kind} className="flex items-center justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <p className="font-bold">{b.label}</p>
                      <p className="text-sm text-ink-soft">
                        {paid ? "Paid" : status.text} {b.detail}.
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className="font-extrabold">{money(b.cents)}</span>
                      {paid ? <Badge tone="good">Paid</Badge> : status.overdue ? <Badge tone="urgent">{status.badge}</Badge> : <Badge tone="neutral" icon={false}>{status.badge}</Badge>}
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
                {receipts.map((r) => (
                  <li key={r.confirmation} className="py-3">
                    <p className="text-sm text-ink-soft">
                      {longDate(r.paidAt.slice(0, 10))}, {r.method === "card" ? "card" : "bank account"} ending in {r.last4}. Confirmation {r.confirmation}.
                    </p>
                    <dl className="mt-1 space-y-0.5">
                      {r.items.map((p) => (
                        <div key={p.id} className="flex justify-between gap-3">
                          <dt className="font-bold">{p.label}</dt>
                          <dd className="font-extrabold">{money(p.cents)}</dd>
                        </div>
                      ))}
                      {r.fee > 0 && (
                        <div className="flex justify-between gap-3 text-sm text-ink-soft">
                          <dt>Card fee</dt>
                          <dd className="font-bold">{money(r.fee)}</dd>
                        </div>
                      )}
                      <div className="flex justify-between gap-3 border-t border-line pt-0.5">
                        <dt className="font-bold">Total paid</dt>
                        <dd className="font-extrabold">{money(r.total)}</dd>
                      </div>
                    </dl>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {state.payments.some((p) => p.kind === "rent") && (
            <section aria-labelledby="autopay-heading" className="card space-y-2">
              <h2 id="autopay-heading" className="text-xl font-extrabold">
                {state.prefs.tenantAutopay ? "Autopay is on" : "Never think about rent again?"}
              </h2>
              {state.prefs.tenantAutopay ? (
                <p className="text-ink-soft">Rent will be paid on the 1st with your {savedMethod}. You can turn this off in Settings. This is a sample, so nothing is charged.</p>
              ) : (
                <>
                  <p className="text-ink-soft">Turn on autopay and rent is paid on the 1st with your {savedMethod}. You will still get a receipt every time. This is a sample, so nothing is charged.</p>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => {
                      actions.setPref("tenantAutopayMethod", savedMethod);
                      actions.setPref("tenantAutopay", true);
                    }}
                  >
                    Turn on autopay
                  </button>
                </>
              )}
            </section>
          )}

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
