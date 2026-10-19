// Which quote to recommend. Plain code, never the model.
//
// Rule: take the cheapest quote that is "fair" and comes from a vendor that
// shows a license number. A quote below the range ("low") is not recommended
// automatically, because it may leave things out. A missing license is skipped
// with the reason shown. If nothing passes, fall back to the cheapest fair one.

import { compareQuote } from "./quote";
import type { QuoteItem, Verdict, VendorQuote } from "./types";

export interface Candidate {
  vendorId: string;
  vendorName: string;
  quote: VendorQuote;
  /** null means the vendor did not show a license number */
  license: string | null;
}

export interface CheckedCandidate extends Candidate {
  verdict: Verdict;
  /** Standard lines the quote does not list, such as a permit */
  missingLines: string[];
}

export interface Recommendation {
  vendorId: string;
  vendorName: string;
  total: number;
  /** Quote plus 10%, rounded to the dollar */
  notToExceed: number;
  reasons: string[];
  skipped: { vendorId: string; vendorName: string; reason: string }[];
  /** Highest total minus the recommended total */
  savedVsHighest: number;
}

const LINE_NAMES: Record<string, string> = {
  unit: "the unit",
  labor: "labor",
  permit: "a permit",
  haul: "haul away",
  expansion: "an expansion tank",
  fittings: "fittings",
  seismic: "seismic strapping",
};

/** Standard lines the job should have that the quote does not list. */
export function missingLines(quote: VendorQuote, item: QuoteItem): string[] {
  const present = new Set(quote.lines.map((l) => l.id));
  return Object.keys(item.marketLines)
    .filter((id) => !present.has(id))
    .map((id) => LINE_NAMES[id] ?? id);
}

export function checkCandidates(candidates: Candidate[], item: QuoteItem): CheckedCandidate[] {
  return candidates.map((c) => ({
    ...c,
    verdict: compareQuote(c.quote, item).total.verdict,
    missingLines: missingLines(c.quote, item),
  }));
}

export function recommendQuote(checked: CheckedCandidate[]): Recommendation | null {
  if (checked.length === 0) return null;

  const skipped: Recommendation["skipped"] = [];
  const eligible: CheckedCandidate[] = [];
  for (const c of checked) {
    if (c.verdict === "high" || c.verdict === "slightly high") {
      skipped.push({ vendorId: c.vendorId, vendorName: c.vendorName, reason: `The price is ${c.verdict}.` });
    } else if (c.verdict === "low") {
      skipped.push({ vendorId: c.vendorId, vendorName: c.vendorName, reason: "The price is below the usual range, so something may be left out." });
    } else if (c.license === null) {
      skipped.push({ vendorId: c.vendorId, vendorName: c.vendorName, reason: "No license number is shown." });
    } else {
      eligible.push(c);
    }
  }

  // If nothing passes every test, relax the license test first, then the price test.
  const pool =
    eligible.length > 0
      ? eligible
      : checked.filter((c) => c.verdict === "fair").length > 0
        ? checked.filter((c) => c.verdict === "fair")
        : checked;
  const best = [...pool].sort((a, b) => a.quote.total - b.quote.total)[0];
  const highest = Math.max(...checked.map((c) => c.quote.total));

  const reasons = [`The cheapest quote that is a fair price from a vendor that shows a license (${best.license ?? "none shown"}).`];
  if (best.verdict === "fair") reasons.push("The total is inside the typical range.");
  const others = checked.filter((c) => c.vendorId !== best.vendorId && c.quote.total > best.quote.total);
  if (others.length > 0) {
    const saved = highest - best.quote.total;
    if (saved > 0) reasons.push(`It costs $${saved.toLocaleString("en-US")} less than the highest quote.`);
  }
  if (best.missingLines.length > 0) reasons.push(`Ask whether ${best.missingLines.join(" and ")} is included.`);

  return {
    vendorId: best.vendorId,
    vendorName: best.vendorName,
    total: best.quote.total,
    notToExceed: Math.round(best.quote.total * 1.1),
    reasons,
    skipped: skipped.filter((s) => s.vendorId !== best.vendorId),
    savedVsHighest: highest - best.quote.total,
  };
}
