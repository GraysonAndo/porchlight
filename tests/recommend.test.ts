import { describe, expect, it } from "vitest";
import { checkCandidates, missingLines, recommendQuote, type Candidate } from "../lib/recommend";
import { A1_QUOTE, BAYSIDE_QUOTE, VENDORS, WATER_HEATER_JOB, WILLOW_QUOTE } from "../lib/seed";

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
