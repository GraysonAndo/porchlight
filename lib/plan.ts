// Porchlight's plan for the water heater job: the quotes it collected, how each
// one checks out, and which one it would book. Plain code (lib/recommend.ts).

import { checkCandidates, recommendQuote, type CheckedCandidate, type Recommendation } from "./recommend";
import { QUOTES, VENDORS, WATER_HEATER_JOB } from "./seed";

export const COLLECTED: CheckedCandidate[] = checkCandidates(
  QUOTES.map((quote) => ({
    vendorId: quote.vendorId,
    vendorName: quote.vendorName,
    quote,
    license: VENDORS.find((v) => v.id === quote.vendorId)?.license ?? null,
  })),
  WATER_HEATER_JOB,
);

const recommendation = recommendQuote(COLLECTED);
if (!recommendation) throw new Error("The demo needs at least one collected quote");

export const PLAN: Recommendation = recommendation;

export function collectedFor(vendorId: string): CheckedCandidate | undefined {
  return COLLECTED.find((c) => c.vendorId === vendorId);
}
