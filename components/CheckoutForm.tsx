"use client";

// The checkout that is embedded in the tenant's Pay page (as an iframe), like a payment provider's own form.
// It keeps card details only in this form's memory, never saves them, and tells the page around it only the last four
// digits and a confirmation number. No real payment happens.

import { useEffect, useState } from "react";
import {
  BILLS,
  SAMPLE_BANK,
  SAMPLE_CARD,
  accountValid,
  confirmationNumber,
  cvcValid,
  dueStatus,
  expiryValid,
  feeCents,
  formatCardNumber,
  formatExpiry,
  lastFour,
  luhnValid,
  money,
  routingValid,
  totalCents,
  zipValid,
  type PayKind,
  type PayMethod,
} from "@/lib/payments";
import type { Payment } from "@/lib/types";

type Fields = { name: string; number: string; expiry: string; cvc: string; zip: string; routing: string; account: string };
const EMPTY: Fields = { name: "", number: "", expiry: "", cvc: "", zip: "", routing: "", account: "" };

function errorsFor(method: PayMethod, f: Fields): Partial<Record<keyof Fields, string>> {
  const e: Partial<Record<keyof Fields, string>> = {};
  if (method === "card") {
    if (f.name.trim().length < 2) e.name = "Enter the name on the card.";
    if (!luhnValid(f.number)) e.number = "That card number does not look right. Check the digits.";
    if (!expiryValid(f.expiry)) e.expiry = "Use a month and year that has not passed, like 12/30.";
    if (!cvcValid(f.cvc)) e.cvc = "Enter the 3 or 4 digit code.";
    if (!zipValid(f.zip)) e.zip = "Enter a 5 digit ZIP code.";
  } else {
    if (f.name.trim().length < 2) e.name = "Enter the name on the account.";
    if (!routingValid(f.routing)) e.routing = "A routing number has 9 digits. Check it and try again.";
    if (!accountValid(f.account)) e.account = "An account number has 4 to 17 digits.";
  }
  return e;
}

function Field({
  id,
  label,
  value,
  onChange,
  error,
  show,
  hint,
  ...rest
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  show: boolean;
  hint?: string;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value" | "id">) {
  return (
    <div>
      <label htmlFor={id} className="label">
        {label}
      </label>
      <input
        id={id}
        className={`field ${show && error ? "!border-urgent" : ""}`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={show && error ? true : undefined}
        aria-describedby={show && error ? `${id}-error` : hint ? `${id}-hint` : undefined}
        {...rest}
      />
      {show && error ? (
        <p id={`${id}-error`} role="alert" className="mt-1 text-sm font-bold text-urgent">
          {error}
        </p>
      ) : (
        hint && (
          <p id={`${id}-hint`} className="hint">
            {hint}
          </p>
        )
      )}
    </div>
  );
}

export function CheckoutForm({ due, paidCount }: { due: PayKind[]; paidCount: number }) {
  const bills = BILLS.filter((b) => due.includes(b.kind));
  const [picked, setPicked] = useState<PayKind[]>(bills.map((b) => b.kind));
  const [method, setMethod] = useState<PayMethod>("card");
  const [f, setF] = useState<Fields>(EMPTY);
  const [tried, setTried] = useState(false);
  const [stage, setStage] = useState<"form" | "processing" | "done">("form");
  const [receipt, setReceipt] = useState<Payment[]>([]);

  // Tell the page around this form how tall it is, so it never needs its own scrollbar.
  useEffect(() => {
    const send = () => window.parent?.postMessage({ type: "gohome-checkout-height", height: document.documentElement.scrollHeight }, window.location.origin);
    send();
    const ro = new ResizeObserver(send);
    ro.observe(document.body);
    return () => ro.disconnect();
  }, []);

  const subtotal = bills.filter((b) => picked.includes(b.kind)).reduce((sum, b) => sum + b.cents, 0);
  const fee = feeCents(subtotal, method);
  const total = totalCents(subtotal, method);
  const errors = errorsFor(method, f);
  const valid = Object.keys(errors).length === 0 && subtotal > 0;
  const set = (k: keyof Fields) => (v: string) => setF((prev) => ({ ...prev, [k]: v }));

  function pay(e: React.FormEvent) {
    e.preventDefault();
    setTried(true);
    if (!valid) return;
    setStage("processing");
    const confirmation = confirmationNumber(paidCount);
    const paidAt = new Date().toISOString();
    const chosen = bills.filter((b) => picked.includes(b.kind));
    // The fee is charged once, so it is attached to the first item.
    const payments: Payment[] = chosen.map((b, i) => ({
      id: `p-${confirmation}-${b.kind}`,
      kind: b.kind,
      label: b.label,
      cents: b.cents,
      feeCents: i === 0 ? fee : 0,
      method,
      last4: lastFour(method === "card" ? f.number : f.account),
      paidAt,
      confirmation,
    }));
    window.setTimeout(() => {
      setReceipt(payments);
      setStage("done");
      window.parent?.postMessage({ type: "gohome-payment", payments }, window.location.origin);
    }, 1400);
  }

  if (stage === "done") {
    const paid = receipt.reduce((s, p) => s + p.cents + p.feeCents, 0);
    return (
      <div className="space-y-4 p-5" role="status">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-good text-2xl text-white" aria-hidden="true">
            &#10003;
          </span>
          <div>
            <p className="text-xl font-extrabold">Payment received</p>
            <p className="text-sm text-ink-soft">Confirmation {receipt[0]?.confirmation}</p>
          </div>
        </div>
        <dl className="divide-y divide-line rounded-xl border border-line text-sm">
          {receipt.map((p) => (
            <div key={p.id} className="flex justify-between gap-3 px-3 py-2">
              <dt>{p.label}</dt>
              <dd className="font-bold">{money(p.cents)}</dd>
            </div>
          ))}
          {receipt.some((p) => p.feeCents > 0) && (
            <div className="flex justify-between gap-3 px-3 py-2">
              <dt>Card fee</dt>
              <dd className="font-bold">{money(receipt.reduce((s, p) => s + p.feeCents, 0))}</dd>
            </div>
          )}
          <div className="flex justify-between gap-3 bg-cream px-3 py-2 text-base">
            <dt className="font-extrabold">Total paid</dt>
            <dd className="font-extrabold">{money(paid)}</dd>
          </div>
        </dl>
        <p className="text-sm text-ink-soft">
          Paid with {receipt[0]?.method === "card" ? "card" : "bank account"} ending in {receipt[0]?.last4}. A receipt was sent to your email, and your owner was notified.
        </p>
        <button type="button" className="btn btn-secondary w-full" onClick={() => window.print()}>
          Print this receipt
        </button>
        <button type="button" className="btn btn-primary w-full" onClick={() => window.parent?.postMessage({ type: "gohome-checkout-done" }, window.location.origin)}>
          Done
        </button>
        <p className="text-center text-xs text-ink-soft">Sample payment: no real money moved.</p>
      </div>
    );
  }

  const busy = stage === "processing";
  return (
    <form onSubmit={pay} noValidate className="space-y-5 p-5" aria-label="Checkout">
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-2 font-extrabold">
          <span aria-hidden="true">&#128274;</span> Secure checkout
        </p>
        <span className="rounded-full bg-cream-deep px-3 py-0.5 text-xs font-extrabold text-ink-soft">GoHome Pay</span>
      </div>

      <fieldset className="space-y-2">
        <legend className="label">What are you paying?</legend>
        {bills.map((b) => (
          <label key={b.kind} className="flex min-h-14 cursor-pointer items-center gap-3 rounded-xl border border-line px-3 py-2 has-[:checked]:border-brand has-[:checked]:bg-brand-tint/40">
            <input
              type="checkbox"
              className="h-5 w-5 accent-[var(--color-brand)]"
              checked={picked.includes(b.kind)}
              onChange={(e) => setPicked((prev) => (e.target.checked ? [...prev, b.kind] : prev.filter((k) => k !== b.kind)))}
            />
            <span className="min-w-0 flex-1">
              <span className="block font-bold">{b.label}</span>
              <span className="block text-xs text-ink-soft">
                {dueStatus(b.kind).badge}. {b.detail}
              </span>
            </span>
            <span className="font-extrabold">{money(b.cents)}</span>
          </label>
        ))}
        {tried && subtotal === 0 && (
          <p role="alert" className="text-sm font-bold text-urgent">
            Pick at least one thing to pay.
          </p>
        )}
      </fieldset>

      <fieldset>
        <legend className="label">How do you want to pay?</legend>
        <div className="grid grid-cols-2 gap-2" role="radiogroup">
          {(["card", "bank"] as const).map((m) => (
            <label
              key={m}
              className={`flex min-h-14 cursor-pointer flex-col justify-center rounded-xl border-2 px-3 py-1 has-[:focus-visible]:outline has-[:focus-visible]:outline-[3px] has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ink ${
                method === m ? "border-brand bg-brand-tint/40" : "border-line"
              }`}
            >
              <input type="radio" name="method" value={m} checked={method === m} onChange={() => setMethod(m)} className="sr-only" />
              <span className="font-bold">{m === "card" ? "Card" : "Bank account"}</span>
              <span className="text-xs text-ink-soft">{m === "card" ? "2.9% + $0.30 fee" : "No fee, 1 to 3 days"}</span>
            </label>
          ))}
        </div>
      </fieldset>

      {method === "card" ? (
        <div className="space-y-3">
          <Field id="cc-name" label="Name on card" value={f.name} onChange={set("name")} error={errors.name} show={tried} autoComplete="cc-name" maxLength={60} />
          <Field
            id="cc-number"
            label="Card number"
            value={f.number}
            onChange={(v) => set("number")(formatCardNumber(v))}
            error={errors.number}
            show={tried}
            inputMode="numeric"
            autoComplete="cc-number"
            placeholder="1234 1234 1234 1234"
            maxLength={23}
          />
          <div className="grid grid-cols-3 gap-3">
            <Field id="cc-exp" label="Expires" value={f.expiry} onChange={(v) => set("expiry")(formatExpiry(v))} error={errors.expiry} show={tried} inputMode="numeric" autoComplete="cc-exp" placeholder="MM/YY" maxLength={5} />
            <Field id="cc-cvc" label="CVC" value={f.cvc} onChange={(v) => set("cvc")(v.replace(/\D/g, "").slice(0, 4))} error={errors.cvc} show={tried} inputMode="numeric" autoComplete="cc-csc" maxLength={4} />
            <Field id="cc-zip" label="ZIP" value={f.zip} onChange={(v) => set("zip")(v.replace(/\D/g, "").slice(0, 5))} error={errors.zip} show={tried} inputMode="numeric" autoComplete="postal-code" maxLength={5} />
          </div>
          <button type="button" className="btn btn-ghost !min-h-10 text-sm" onClick={() => setF({ ...EMPTY, ...SAMPLE_CARD })}>
            Use the sample card
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <Field id="ba-name" label="Name on the account" value={f.name} onChange={set("name")} error={errors.name} show={tried} autoComplete="name" maxLength={60} />
          <Field id="ba-routing" label="Routing number" value={f.routing} onChange={(v) => set("routing")(v.replace(/\D/g, "").slice(0, 9))} error={errors.routing} show={tried} inputMode="numeric" maxLength={9} hint="9 digits, on the bottom left of a check." />
          <Field id="ba-account" label="Account number" value={f.account} onChange={(v) => set("account")(v.replace(/\D/g, "").slice(0, 17))} error={errors.account} show={tried} inputMode="numeric" maxLength={17} />
          <button type="button" className="btn btn-ghost !min-h-10 text-sm" onClick={() => setF({ ...EMPTY, name: SAMPLE_CARD.name, ...SAMPLE_BANK })}>
            Use the sample bank account
          </button>
        </div>
      )}

      <dl className="space-y-1 rounded-xl bg-cream p-3 text-sm">
        <div className="flex justify-between">
          <dt>Subtotal</dt>
          <dd className="font-bold">{money(subtotal)}</dd>
        </div>
        <div className="flex justify-between">
          <dt>{method === "card" ? "Card fee (2.9% + $0.30)" : "Bank transfer fee"}</dt>
          <dd className="font-bold">{money(fee)}</dd>
        </div>
        <div className="flex justify-between border-t border-line pt-1 text-base">
          <dt className="font-extrabold">Total</dt>
          <dd className="font-extrabold">{money(total)}</dd>
        </div>
      </dl>

      <button type="submit" className="btn btn-primary btn-lg w-full" disabled={busy || subtotal === 0}>
        {busy ? "Processing..." : subtotal === 0 ? "Pick what to pay" : `Pay ${money(total)}`}
      </button>
      <p className="text-center text-xs text-ink-soft">
        Sample payment: no real money moves, and {method === "card" ? "card details" : "your account and routing numbers"} are never saved.
      </p>
    </form>
  );
}
