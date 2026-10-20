// Rent and utility payments: the amounts, the fee, and the checks a checkout form needs.
// Money is done in whole cents so nothing ever shows 3520.010009765625. No real card is ever charged or kept:
// the screens keep only the last four digits and a confirmation number.

import { PROPERTY } from "./seed";

export type PayMethod = "card" | "bank";
export type PayKind = "rent" | "utilities";

export interface Bill {
  kind: PayKind;
  label: string;
  /** What this covers, in a few words */
  detail: string;
  /** Amount in cents */
  cents: number;
  due: string;
}

/** What the tenant owes this month. Utility amounts are sample numbers. */
export const BILLS: Bill[] = [
  { kind: "rent", label: "October 2026 rent", detail: "1200 Example Court", cents: PROPERTY.rent * 100, due: "Due on the 1st" },
  { kind: "utilities", label: "Water and trash", detail: "Sep 15 to Oct 14, billed by your owner", cents: 9218, due: "Due Oct 31" },
];

/** Paid straight to the utility company, so it is shown for information and not payable here. */
export const DIRECT_UTILITIES = "Gas and electric are paid directly to your utility company. They are not billed here.";

/** The day each sample bill was due (the bills are for October 2026). */
export const BILL_DUE_DATES: Record<PayKind, string> = { rent: "2026-10-01", utilities: "2026-10-31" };

/** Whole calendar days from today to an ISO date. Negative when the date has passed. `now` is a parameter so this is testable. */
export function daysUntil(iso: string, now: Date = new Date()): number {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return 0;
  const due = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((due - today) / 86_400_000);
}

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export interface DueStatus {
  overdue: boolean;
  /** Short, for a badge: "Overdue", "Due today", "Due Oct 31" */
  badge: string;
  /** A sentence: "19 days late. It was due Oct 1." or "Due Oct 31, in 11 days." */
  text: string;
}

/** Where a bill stands against its due date. Only a bill past its date is overdue. */
export function dueStatus(kind: PayKind, now: Date = new Date()): DueStatus {
  const iso = BILL_DUE_DATES[kind];
  const days = daysUntil(iso, now);
  const label = `${MONTH_NAMES[Number(iso.slice(5, 7)) - 1]} ${Number(iso.slice(8, 10))}`;
  const plural = (n: number) => `${n} day${n === 1 ? "" : "s"}`;
  if (days < 0) return { overdue: true, badge: "Overdue", text: `${plural(-days)} late. It was due ${label}.` };
  if (days === 0) return { overdue: false, badge: "Due today", text: `Due today, ${label}.` };
  return { overdue: false, badge: `Due ${label}`, text: `Due ${label}, in ${plural(days)}.` };
}

export const CARD_FEE_RATE = 0.029;
export const CARD_FEE_FLAT_CENTS = 30;

/** The fee for a payment, in cents. Bank transfers are free. A card costs 2.9% plus 30 cents. */
export function feeCents(subtotalCents: number, method: PayMethod): number {
  if (method === "bank" || subtotalCents <= 0) return 0;
  return Math.round(subtotalCents * CARD_FEE_RATE) + CARD_FEE_FLAT_CENTS;
}

export function totalCents(subtotalCents: number, method: PayMethod): number {
  return subtotalCents + feeCents(subtotalCents, method);
}

/** 123456 becomes "$1,234.56". */
export function money(cents: number): string {
  return (cents / 100).toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const digitsOnly = (s: string) => s.replace(/\D/g, "");

/** "4242424242424242" becomes "4242 4242 4242 4242". Also trims anything past 19 digits. */
export function formatCardNumber(raw: string): string {
  return digitsOnly(raw).slice(0, 19).replace(/(.{4})/g, "$1 ").trim();
}

/** The Luhn check that every card number passes. */
export function luhnValid(raw: string): boolean {
  const d = digitsOnly(raw);
  if (d.length < 13 || d.length > 19) return false;
  let sum = 0;
  for (let i = 0; i < d.length; i++) {
    let n = Number(d[d.length - 1 - i]);
    if (i % 2 === 1) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
  }
  return sum % 10 === 0;
}

/** "1230" or "12/30" becomes "12/30". */
export function formatExpiry(raw: string): string {
  const d = digitsOnly(raw).slice(0, 4);
  return d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d;
}

/** A valid month and a date that has not passed. `now` is a parameter so this is testable. */
export function expiryValid(raw: string, now: Date = new Date()): boolean {
  const m = /^(\d{2})\/(\d{2})$/.exec(raw);
  if (!m) return false;
  const month = Number(m[1]);
  const year = 2000 + Number(m[2]);
  if (month < 1 || month > 12) return false;
  const endOfMonth = new Date(year, month, 1);
  return endOfMonth.getTime() > now.getTime();
}

export function cvcValid(raw: string): boolean {
  return /^\d{3,4}$/.test(raw);
}

export function zipValid(raw: string): boolean {
  return /^\d{5}$/.test(raw);
}

/** A US bank routing number has nine digits and passes a weighted checksum. */
export function routingValid(raw: string): boolean {
  const d = digitsOnly(raw);
  if (d.length !== 9) return false;
  const w = [3, 7, 1, 3, 7, 1, 3, 7, 1];
  return d.split("").reduce((sum, ch, i) => sum + Number(ch) * w[i], 0) % 10 === 0;
}

export function accountValid(raw: string): boolean {
  const d = digitsOnly(raw);
  return d.length >= 4 && d.length <= 17;
}

/** A confirmation number such as GH-100042, from how many payments were made before. */
export function confirmationNumber(previous: number): string {
  return `GH-${100042 + previous}`;
}

/** The last four digits for display, or "" if there are not four digits. */
export function lastFour(raw: string): string {
  const d = digitsOnly(raw);
  return d.length >= 4 ? d.slice(-4) : "";
}

/** The sample card and bank numbers the checkout can fill in. All of them are the well known test numbers. */
export const SAMPLE_CARD = { name: "Sample Tenant", number: "4242 4242 4242 4242", expiry: "12/30", cvc: "123", zip: "95100" };
export const SAMPLE_BANK = { routing: "110000000", account: "000123456789" };
