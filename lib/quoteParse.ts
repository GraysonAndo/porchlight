// Reads a pasted vendor quote into line items. Plain code, no AI: this is the
// "paste the quote" input for the quote check. It handles the usual ways quotes
// are written (dollar signs or not, dotted leaders, a Total line), and tells the
// owner when something cannot be read or the lines do not add up.

import type { QuoteLine } from "./types";

export interface ParsedQuote {
  vendorName: string | null;
  lines: QuoteLine[];
  /** The total to compare: the stated total if there is one, otherwise the sum of the lines */
  total: number;
  statedTotal: number | null;
  sumOfLines: number;
  /** Stated total minus the sum of lines, when both exist and differ */
  mismatch: number | null;
  warnings: string[];
}

const MONEY_AT_END = /\s*(-?)\$?(\d{1,3}(?:,\d{3})+|\d+)(?:\.(\d{1,2}))?\s*$/;

function toNumber(sign: string, whole: string, cents: string | undefined): number {
  const value = Number(whole.replace(/,/g, "")) + (cents ? Number(`0.${cents}`) : 0);
  return sign === "-" ? -value : value;
}

function cleanLabel(raw: string): string {
  return raw
    .replace(/[.…_]{2,}/g, " ")
    .replace(/[:\-\u2013\u2014|\t]+\s*$/g, "")
    .replace(/\s+/g, " ")
    .replace(/^[\s\-*•\d.)(]+(?=[A-Za-z])/, "")
    .trim();
}

/** Which standard line a label means, so it can be compared with a typical range. */
export function lineIdFor(label: string): string {
  const l = label.toLowerCase();
  if (/expansion|thermal/.test(l)) return "expansion";
  if (/permit|inspection fee|city fee/.test(l)) return "permit";
  if (/haul|dispos|removal|remove old|take away/.test(l)) return "haul";
  if (/flex|fitting|connector|gas line|misc|supplies|parts and/.test(l)) return "fittings";
  if (/seismic|strap|earthquake/.test(l)) return "seismic";
  if (/labou?r|install|hours|hrs|service call|trip/.test(l)) return "labor";
  if (/unit|water heater|heater|tank|equipment|material/.test(l)) return "unit";
  return `other-${l.replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 24) || "line"}`;
}

const TOTAL_LABEL = /^(grand\s+)?total(\s+due)?|amount due|balance due|quote total|total price/i;
const SUBTOTAL_LABEL = /^sub\s*-?\s*total/i;

export function parseQuoteText(text: string): ParsedQuote {
  const warnings: string[] = [];
  const lines: QuoteLine[] = [];
  let statedTotal: number | null = null;
  let vendorName: string | null = null;

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;

    const money = MONEY_AT_END.exec(line);
    if (!money) {
      // A line with no amount is usually a header. The first one that looks like a name is the vendor.
      if (!vendorName && /[A-Za-z]{3}/.test(line) && line.length < 80 && !/quote\s*#|estimate|date|invoice|phone|@/i.test(line)) {
        vendorName = line.replace(/[:\s]+$/, "");
      }
      continue;
    }

    const amount = toNumber(money[1], money[2], money[3]);
    const label = cleanLabel(line.slice(0, money.index));
    if (!label) continue;

    if (SUBTOTAL_LABEL.test(label)) continue;
    if (TOTAL_LABEL.test(label)) {
      statedTotal = amount;
      continue;
    }
    // Phone numbers and quote numbers look like money. Ignore lines whose label is just that.
    if (/^(quote|estimate|invoice|ref|phone|tel|license|lic)\b/i.test(label)) continue;

    lines.push({ id: lineIdFor(label), label, amount });
  }

  const sumOfLines = round2(lines.reduce((sum, l) => sum + l.amount, 0));
  const total = statedTotal ?? sumOfLines;
  const mismatch = statedTotal !== null && Math.abs(statedTotal - sumOfLines) > 0.009 ? round2(statedTotal - sumOfLines) : null;

  if (lines.length === 0 && statedTotal === null) {
    warnings.push("I could not find any prices in that text. Paste the quote with one item and amount per line.");
  }
  if (statedTotal === null && lines.length > 0) {
    warnings.push("There is no Total line, so I added up the items.");
  }
  if (mismatch !== null) {
    warnings.push(
      `The items add up to $${sumOfLines.toLocaleString("en-US")}, but the quote says $${statedTotal!.toLocaleString("en-US")}. Ask the vendor about the $${Math.abs(mismatch).toLocaleString("en-US")} difference.`,
    );
  }
  const others = lines.filter((l) => l.id.startsWith("other-"));
  if (others.length > 0) {
    warnings.push(`I could not match ${others.map((o) => `"${o.label}"`).join(", ")} to a typical price, so it is not compared.`);
  }

  return { vendorName, lines, total, statedTotal, sumOfLines, mismatch, warnings };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** A realistic pasted quote, for the "Use a sample quote" button. */
export const SAMPLE_QUOTE_TEXT = `Harbor View Plumbing
Quote #2217, water heater replacement
Water heater unit, 40 gal gas ........ $820.00
Labor (7 hrs) ........ $1,610.00
Permit .......... $150.00
Haul away old unit .......... $120.00
Expansion tank .......... $250.00
Gas flex line and fittings .......... $180.00
Seismic strap kit .......... $40.00
TOTAL $3,170.00`;
