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

// ---------------------------------------------------------------------------
// Comparable scope: a quote that leaves out standard work looks cheaper than it is
// ---------------------------------------------------------------------------

export interface QuoteAdjustment {
  id: string;
  label: string;
  /** What is added so the quote covers the same work as the others */
  amount: number;
  /** Where the number comes from */
  basis: string;
}

export interface NormalizedQuote {
  /** The total as the vendor quoted it */
  original: number;
  adjustments: QuoteAdjustment[];
  /** The original plus the standard work the quote left out, at the middle of its typical range */
  adjusted: number;
}

const ADJUSTMENT_LABELS: Record<string, string> = {
  unit: "The unit",
  labor: "Labor",
  permit: "A permit",
  haul: "Haul away",
  expansion: "An expansion tank",
  fittings: "Fittings",
  seismic: "Seismic strapping",
};

/**
 * Adds any standard line the quote does not list, at the middle of its typical range, so every quote is compared on the same scope.
 * The vendor's own number is never changed: the original, each addition, and the adjusted total are all kept.
 */
export function normalizeQuote(quote: VendorQuote, item: QuoteItem): NormalizedQuote {
  const present = new Set(quote.lines.map((l) => l.id));
  const adjustments: QuoteAdjustment[] = Object.entries(item.marketLines)
    .filter(([id]) => !present.has(id))
    .map(([id, range]) => ({
      id,
      label: ADJUSTMENT_LABELS[id] ?? id,
      amount: Math.round((range.low + range.high) / 2),
      basis: `The middle of its typical range, $${range.low.toLocaleString("en-US")} to $${range.high.toLocaleString("en-US")}`,
    }));
  return { original: quote.total, adjustments, adjusted: quote.total + adjustments.reduce((sum, a) => sum + a.amount, 0) };
}

/** How far up its typical range an amount sits: 0 at the bottom, 1 at the top, more than 1 above it. */
export function rangePosition(amount: number, range: PriceRange): number {
  const spread = range.high - range.low;
  return spread > 0 ? (amount - range.low) / spread : 0;
}

export interface NearTopLine {
  id: string;
  label: string;
  amount: number;
  range: PriceRange;
  position: number;
}

/** Lines that sit at or near the top of their typical range, which is where to ask for a better price. */
export function nearTopLines(quote: VendorQuote, item: QuoteItem, threshold = 0.9): NearTopLine[] {
  const out: NearTopLine[] = [];
  for (const line of quote.lines) {
    const range = item.marketLines[line.id];
    if (!range) continue;
    const position = rangePosition(line.amount, range);
    if (position >= threshold) out.push({ id: line.id, label: line.label, amount: line.amount, range, position });
  }
  return out;
}
