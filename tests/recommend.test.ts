import { describe, expect, it } from "vitest";
import { availabilityDaysFrom, checkCandidates, missingLines, recommendQuote, type Candidate } from "../lib/recommend";
import { A1_QUOTE, BAYSIDE_QUOTE, QUOTES, VENDORS, WATER_HEATER_JOB, WILLOW_QUOTE } from "../lib/seed";

const candidates: Candidate[] = VENDORS.map((v) => ({
  vendorId: v.id,
  vendorName: v.name,
  license: v.license,
  quote: [BAYSIDE_QUOTE, WILLOW_QUOTE, A1_QUOTE].find((q) => q.vendorId === v.id)!,
}));

describe("recommendQuote with the seed vendors", () => {
  const checked = checkCandidates(candidates, WATER_HEATER_JOB);
  const rec = recommendQuote(checked)!;

  it("rates Bayside slightly high, Willow Glen and A1 fair", () => {
    expect(checked.map((c) => c.verdict)).toEqual(["slightly high", "fair", "fair"]);
  });

  it("recommends Willow Glen, not the cheaper A1 with no license", () => {
    expect(rec.vendorId).toBe("willow-glen");
    expect(rec.total).toBe(2450);
  });

  it("explains who it skipped and why", () => {
    const a1 = rec.skipped.find((s) => s.vendorId === "a1-rapid")!;
    expect(a1.reason).toMatch(/license/i);
    const bayside = rec.skipped.find((s) => s.vendorId === "bayside")!;
    expect(bayside.reason).toMatch(/slightly high/);
  });

  it("sets the limit to the quote plus 10%, rounded to the dollar", () => {
    expect(rec.notToExceed).toBe(2695);
  });

  it("reports the saving against the highest quote", () => {
    expect(rec.savedVsHighest).toBe(400);
    expect(rec.reasons.join(" ")).toContain("$400 less than the highest quote");
  });
});

describe("missingLines", () => {
  it("finds that A1 does not list a permit", () => {
    expect(missingLines(A1_QUOTE, WATER_HEATER_JOB)).toEqual(["a permit"]);
  });
  it("finds nothing missing on Bayside", () => {
    expect(missingLines(BAYSIDE_QUOTE, WATER_HEATER_JOB)).toEqual([]);
  });
});

describe("recommendQuote edge cases", () => {
  it("returns null with no quotes", () => {
    expect(recommendQuote([])).toBeNull();
  });

  it("does not auto-recommend a quote that is below the usual range", () => {
    const cheap = { ...WILLOW_QUOTE, vendorId: "cheap", total: 900 };
    const checked = checkCandidates(
      [
        { vendorId: "cheap", vendorName: "Cheap Co", license: "CSLB #1", quote: cheap },
        { vendorId: "willow-glen", vendorName: "Willow", license: "CSLB #2", quote: WILLOW_QUOTE },
      ],
      WATER_HEATER_JOB,
    );
    expect(recommendQuote(checked)!.vendorId).toBe("willow-glen");
  });

  it("falls back to the cheapest fair quote when nobody shows a license", () => {
    const checked = checkCandidates(
      [
        { vendorId: "a", vendorName: "A", license: null, quote: { ...WILLOW_QUOTE, vendorId: "a", total: 2300 } },
        { vendorId: "b", vendorName: "B", license: null, quote: { ...WILLOW_QUOTE, vendorId: "b", total: 2500 } },
      ],
      WATER_HEATER_JOB,
    );
    expect(recommendQuote(checked)!.vendorId).toBe("a");
  });
});

describe("scope-adjusted comparison", () => {
  const checked = checkCandidates(
    QUOTES.map((quote) => ({ vendorId: quote.vendorId, vendorName: quote.vendorName, quote, license: VENDORS.find((v) => v.id === quote.vendorId)?.license ?? null })),
    WATER_HEATER_JOB,
  );
  const plan = recommendQuote(checked)!;

  it("still picks Willow Glen and explains why the cheaper A1 Rapid is not the pick", () => {
    expect(plan.vendorId).toBe("willow-glen");
    const a1 = plan.comparisons.find((c) => c.startsWith("A1 Rapid Plumbing"))!;
    expect(a1).toMatch(/\$350 cheaper on paper \(\$2,100\)/);
    expect(a1).toMatch(/\$2,225/);
    expect(a1).toMatch(/\$225 less/);
    expect(a1).toMatch(/no license number/);
  });

  it("compares the others on the same scope", () => {
    expect(plan.comparisons.find((c) => c.startsWith("Bayside"))).toMatch(/\$400 more/);
    expect(plan.savedVsHighest).toBe(400);
  });

  it("uses distinct fictional license numbers", () => {
    const lic = VENDORS.map((v) => v.license).filter(Boolean);
    expect(new Set(lic).size).toBe(lic.length);
    expect(lic.every((l) => /fictional/.test(l!))).toBe(true);
  });
});

describe("recommendQuote tells the truth about its pick", () => {
  const quote = (vendorId: string, total: number) => ({ ...WILLOW_QUOTE, vendorId, vendorName: vendorId, total, lines: WILLOW_QUOTE.lines.map((l) => ({ ...l })) });
  const cand = (vendorId: string, total: number, license: string | null, availabilityDays?: number | null): Candidate => ({ vendorId, vendorName: vendorId, license, quote: quote(vendorId, total), availabilityDays });

  it("does not claim a fair price and a license when nothing passed", () => {
    const checked = checkCandidates([cand("a", 3400, null), cand("b", 3600, null)], WATER_HEATER_JOB);
    const rec = recommendQuote(checked)!;
    expect(rec.reasons[0]).toMatch(/No quote passed every check/);
    expect(rec.reasons[0]).not.toMatch(/fair price from a vendor that shows a license/);
    expect(rec.reasons[0]).toMatch(/Get another quote/);
  });

  it("says the license is missing when a fair quote with no license is the closest", () => {
    const checked = checkCandidates([cand("a", 2300, null), cand("b", 3600, "CSLB #1")], WATER_HEATER_JOB);
    const rec = recommendQuote(checked)!;
    expect(rec.vendorId).toBe("a");
    expect(rec.reasons[0]).toMatch(/no license number is shown/);
  });

  it("for an urgent job, takes a visit a day sooner when it costs only a little more", () => {
    const checked = checkCandidates([cand("slow", 2300, "CSLB #1", 2), cand("fast", 2380, "CSLB #2", 1)], WATER_HEATER_JOB);
    const rec = recommendQuote(checked, { urgent: true })!;
    expect(rec.vendorId).toBe("fast");
    expect(rec.reasons.join(" ")).toMatch(/1 day sooner/);
    expect(rec.reasons.join(" ")).toMatch(/\$80 more/);
  });

  it("keeps the cheapest when the sooner one costs more than the small margin, or the job is not urgent", () => {
    const checked = checkCandidates([cand("slow", 2300, "CSLB #1", 2), cand("fast", 2500, "CSLB #2", 1)], WATER_HEATER_JOB);
    expect(recommendQuote(checked, { urgent: true })!.vendorId).toBe("slow");
    const close = checkCandidates([cand("slow", 2300, "CSLB #1", 2), cand("fast", 2380, "CSLB #2", 1)], WATER_HEATER_JOB);
    expect(recommendQuote(close)!.vendorId).toBe("slow");
  });

  it("never lets a sooner visit override a license or a fair price", () => {
    const checked = checkCandidates([cand("slow", 2300, "CSLB #1", 2), cand("fast", 2350, null, 0)], WATER_HEATER_JOB);
    expect(recommendQuote(checked, { urgent: true })!.vendorId).toBe("slow");
  });
});

describe("availabilityDaysFrom", () => {
  it("reads the vendor's own words, and leaves the unknown unknown", () => {
    expect(availabilityDaysFrom("Today, 3:00 PM")).toBe(0);
    expect(availabilityDaysFrom("Tomorrow, 9:00 to 11:00 AM")).toBe(1);
    expect(availabilityDaysFrom("In 2 days, 9:00 to 11:00 AM")).toBe(2);
    expect(availabilityDaysFrom("Next week")).toBeNull();
    expect(availabilityDaysFrom(null)).toBeNull();
  });
});
