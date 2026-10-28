// Which quote to recommend. Plain code, never the model.
//
// Rule: take the cheapest quote that is "fair" and comes from a vendor that
// shows a license number. A quote below the range ("low") is not recommended
// automatically, because it may leave things out. A missing license is skipped
// with the reason shown. If nothing passes, fall back to the cheapest fair one.

import { normalizeQuote, verdictFor, type NormalizedQuote } from "./quote";
import type { QuoteItem, Verdict, VendorQuote } from "./types";

export interface Candidate {
  vendorId: string;
  vendorName: string;
  quote: VendorQuote;
  /** null means the vendor did not show a license number */
  license: string | null;
  /** Whole days until the earliest visit, when the vendor said. Missing means the vendor did not say. */
  availabilityDays?: number | null;
}

/** "Tomorrow, 9:00 to 11:00 AM" is 1, "In 2 days" is 2, "Today" is 0, anything else is unknown. */
export function availabilityDaysFrom(text: string | null | undefined): number | null {
  if (!text) return null;
  if (/^today\b/i.test(text)) return 0;
  if (/^tomorrow\b/i.test(text)) return 1;
  const m = /^in (\d+) days?\b/i.exec(text);
  return m ? Number(m[1]) : null;
}

/** A quote this close to the cheapest (in percent) can win by coming sooner, when the job is urgent. */
export const SOONER_WORTH_PERCENT = 5;

export interface CheckedCandidate extends Candidate {
  /** The verdict on the adjusted total, so a quote that leaves out standard work is not judged against ones that include it */
  verdict: Verdict;
  /** The quote as quoted, what it leaves out at typical prices, and the adjusted total used to compare it */
  normalized: NormalizedQuote;
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
  /** Highest total minus the recommended total, both on comparable scope */
  savedVsHighest: number;
  /** Plain sentences on how every other quote compares, including why a cheaper one was not picked */
  comparisons: string[];
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
  return candidates.map((c) => {
    const normalized = normalizeQuote(c.quote, item);
    return {
      ...c,
      normalized,
      verdict: verdictFor(normalized.adjusted, item.marketTotal),
      missingLines: missingLines(c.quote, item),
    };
  });
}

export function recommendQuote(checked: CheckedCandidate[], options: { urgent?: boolean } = {}): Recommendation | null {
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
  const byPrice = [...pool].sort((a, b) => a.normalized.adjusted - b.normalized.adjusted);
  let best = byPrice[0];
  let soonerNote: string | null = null;
  // For an urgent job, a visit a day or more sooner beats a small saving: take the earliest quote within a few percent of the cheapest.
  if (options.urgent && pool === eligible) {
    const cheapestDays = best.availabilityDays ?? Number.POSITIVE_INFINITY;
    const sooner = byPrice
      .filter((c) => c.availabilityDays != null && c.availabilityDays < cheapestDays && c.normalized.adjusted <= best.normalized.adjusted * (1 + SOONER_WORTH_PERCENT / 100))
      .sort((a, b) => (a.availabilityDays as number) - (b.availabilityDays as number) || a.normalized.adjusted - b.normalized.adjusted)[0];
    if (sooner) {
      const extra = sooner.normalized.adjusted - best.normalized.adjusted;
      const days = Number.isFinite(cheapestDays) ? cheapestDays - (sooner.availabilityDays as number) : null;
      soonerNote = `It can come ${days === null ? "sooner" : `${days} day${days === 1 ? "" : "s"} sooner`} than the cheapest fair quote (${best.vendorName}), for ${extra > 0 ? `$${extra.toLocaleString("en-US")} more` : "no extra cost"}, and this repair is urgent.`;
      best = sooner;
    }
  }
  const highest = Math.max(...checked.map((c) => c.normalized.adjusted));

  // Say what is true of the pick. When nothing passed every check, say that plainly instead of claiming the pick did.
  const passedEverything = eligible.includes(best);
  const reasons = passedEverything
    ? [soonerNote ? `A fair price from a vendor that shows a license (${best.license ?? "none shown"}).` : `The cheapest quote that is a fair price from a vendor that shows a license (${best.license ?? "none shown"}).`]
    : [`No quote passed every check, so this is the closest one: ${best.verdict === "fair" ? "the price is fair" : `the price is ${best.verdict}`}${best.license === null ? " and no license number is shown" : ""}. Get another quote before you approve.`];
  if (soonerNote) reasons.push(soonerNote);
  if (best.verdict === "fair") reasons.push("The total is inside the typical range.");
  const others = checked.filter((c) => c.vendorId !== best.vendorId && c.normalized.adjusted > best.normalized.adjusted);
  if (others.length > 0) {
    const saved = highest - best.normalized.adjusted;
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
    savedVsHighest: highest - best.normalized.adjusted,
    comparisons: compareToBest(checked, best),
  };
}

const money = (n: number) => `$${Math.abs(n).toLocaleString("en-US")}`;

/** One sentence per other quote: how it compares with the pick, and why a cheaper one was not the pick. */
function compareToBest(checked: CheckedCandidate[], best: CheckedCandidate): string[] {
  const out: string[] = [];
  for (const c of checked) {
    if (c.vendorId === best.vendorId) continue;
    const paper = best.quote.total - c.quote.total;
    const comparable = best.normalized.adjusted - c.normalized.adjusted;
    if (paper > 0) {
      const why: string[] = [];
      if (c.normalized.adjustments.length > 0) {
        why.push(`it leaves out ${c.missingLines.join(" and ")}, and with ${c.normalized.adjustments.length === 1 ? "that" : "those"} added at typical prices it is ${money(c.normalized.adjusted)}, which is ${money(comparable)} ${comparable >= 0 ? "less" : "more"} than the pick`);
      }
      if (c.license === null) why.push("it shows no license number");
      out.push(`${c.vendorName} is ${money(paper)} cheaper on paper (${money(c.quote.total)}), but ${why.length > 0 ? why.join(", and ") : "it is not a fair price for the same work"}.`);
    } else {
      out.push(
        comparable < 0
          ? `${c.vendorName} costs ${money(comparable)} more than the pick, on the same scope.`
          : comparable === 0
            ? `${c.vendorName} costs the same as the pick, on the same scope.`
            : `${c.vendorName} comes to ${money(comparable)} less than the pick once what it leaves out is added, but ${c.license === null ? "it shows no license number" : "it is not the one that passed every check"}.`,
      );
    }
  }
  return out;
}
