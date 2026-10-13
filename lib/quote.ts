// Quote comparison. Plain math, no AI.
// within range = fair; up to 15% above the top = slightly high;
// more than 15% above the top = high; below the bottom = low.

import type { PriceRange, QuoteItem, Verdict, VendorQuote } from "./types";

/** A quote more than this far above the top of the range is "high". */
export const SLIGHTLY_HIGH_LIMIT = 0.15;

// Tolerance so a value exactly 15% over is not pushed to "high" by float noise.
const EPSILON = 1e-9;

export function verdictFor(amount: number, range: PriceRange): Verdict {
  if (amount < range.low) return "low";
  if (amount <= range.high) return "fair";
  const over = (amount - range.high) / range.high;
  return over <= SLIGHTLY_HIGH_LIMIT + EPSILON ? "slightly high" : "high";
}

/** How far above the top of the range, as a percent. Zero or less if not above. */
export function percentOverTop(amount: number, range: PriceRange): number {
  return ((amount - range.high) / range.high) * 100;
}

export interface LineComparison {
  id: string;
  label: string;
  amount: number;
  range: PriceRange | null;
  verdict: Verdict | null;
}

export interface QuoteComparison {
  total: { amount: number; range: PriceRange; verdict: Verdict; percentOverTop: number };
  lines: LineComparison[];
}

export function compareQuote(quote: VendorQuote, item: QuoteItem): QuoteComparison {
  const lines: LineComparison[] = quote.lines.map((line) => {
    const range = item.marketLines[line.id] ?? null;
    return {
      id: line.id,
      label: line.label,
      amount: line.amount,
      range,
      verdict: range ? verdictFor(line.amount, range) : null,
    };
  });

  return {
    total: {
      amount: quote.total,
      range: item.marketTotal,
      verdict: verdictFor(quote.total, item.marketTotal),
      percentOverTop: percentOverTop(quote.total, item.marketTotal),
    },
    lines,
  };
}

export interface RangeBarScale {
  /** Left edge of the bar, in dollars */
  min: number;
  /** Right edge of the bar, in dollars */
  max: number;
  /** Where the market range starts and ends, as 0 to 100 percent of the bar */
  rangeStartPct: number;
  rangeEndPct: number;
  /** Where the quote marker sits, as 0 to 100 percent of the bar */
  markerPct: number;
}

/** Positions for the simple range bar. The bar extends past both ends of the range. */
export function rangeBarScale(amount: number, range: PriceRange): RangeBarScale {
  const spread = range.high - range.low;
  const min = Math.max(0, Math.min(range.low - spread * 0.4, amount - spread * 0.1));
  const max = Math.max(range.high + spread * 0.4, amount + spread * 0.1);
  const width = max - min;
  const toPct = (value: number) => Math.min(100, Math.max(0, ((value - min) / width) * 100));
  return {
    min,
    max,
    rangeStartPct: toPct(range.low),
    rangeEndPct: toPct(range.high),
    markerPct: toPct(amount),
  };
}
