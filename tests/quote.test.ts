import { describe, expect, it } from "vitest";
import { compareQuote, percentOverTop, rangeBarScale, verdictFor } from "../lib/quote";
import { BAYSIDE_QUOTE, WATER_HEATER_JOB } from "../lib/seed";

const range = { low: 1600, high: 2600 };

describe("verdictFor", () => {
  it("is fair inside the range, including both edges", () => {
    expect(verdictFor(1600, range)).toBe("fair");
    expect(verdictFor(2100, range)).toBe("fair");
    expect(verdictFor(2600, range)).toBe("fair");
  });

  it("is slightly high up to 15% above the top", () => {
    expect(verdictFor(2601, range)).toBe("slightly high");
    expect(verdictFor(2990, range)).toBe("slightly high");
  });

  it("is high more than 15% above the top", () => {
    expect(verdictFor(2991, range)).toBe("high");
    expect(verdictFor(4000, range)).toBe("high");
  });

  it("is low below the bottom of the range", () => {
    expect(verdictFor(1599, range)).toBe("low");
    expect(verdictFor(500, range)).toBe("low");
  });
});

describe("compareQuote with the seed quote", () => {
  const result = compareQuote(BAYSIDE_QUOTE, WATER_HEATER_JOB);

  it("seed case: the $2,850 total is slightly high", () => {
    expect(result.total.verdict).toBe("slightly high");
    expect(result.total.percentOverTop).toBeCloseTo(9.6, 1);
  });

  it("flags labor as high and nothing else", () => {
    const flagged = result.lines.filter((l) => l.verdict && l.verdict !== "fair");
    expect(flagged.map((l) => l.id)).toEqual(["labor"]);
    expect(flagged[0].verdict).toBe("high");
  });

  it("the lines add up to the total", () => {
    const sum = BAYSIDE_QUOTE.lines.reduce((s, l) => s + l.amount, 0);
    expect(sum).toBe(BAYSIDE_QUOTE.total);
  });

  it("has a null verdict for a line with no market range", () => {
    const quote = {
      ...BAYSIDE_QUOTE,
      lines: [{ id: "mystery", label: "Mystery fee", amount: 99 }],
    };
    expect(compareQuote(quote, WATER_HEATER_JOB).lines[0].verdict).toBeNull();
  });
});

describe("other vendors", () => {
  it("rates $2,450 and $2,100 as fair", () => {
    expect(verdictFor(2450, WATER_HEATER_JOB.marketTotal)).toBe("fair");
    expect(verdictFor(2100, WATER_HEATER_JOB.marketTotal)).toBe("fair");
  });
});

describe("percentOverTop", () => {
  it("is negative inside the range", () => {
    expect(percentOverTop(2000, range)).toBeLessThan(0);
  });
});

describe("rangeBarScale", () => {
  it("keeps every position between 0 and 100 and in order", () => {
    const scale = rangeBarScale(2850, range);
    expect(scale.rangeStartPct).toBeGreaterThanOrEqual(0);
    expect(scale.rangeEndPct).toBeLessThanOrEqual(100);
    expect(scale.rangeStartPct).toBeLessThan(scale.rangeEndPct);
    expect(scale.markerPct).toBeGreaterThan(scale.rangeEndPct);
    expect(scale.markerPct).toBeLessThanOrEqual(100);
  });

  it("puts a low quote left of the range", () => {
    const scale = rangeBarScale(1000, range);
    expect(scale.markerPct).toBeLessThan(scale.rangeStartPct);
  });

  it("puts a fair quote inside the range", () => {
    const scale = rangeBarScale(2100, range);
    expect(scale.markerPct).toBeGreaterThan(scale.rangeStartPct);
    expect(scale.markerPct).toBeLessThan(scale.rangeEndPct);
  });
});

describe("the price table is consistent with itself", () => {
  it("makes the total typical range the sum of the line ranges", async () => {
    const { WATER_HEATER_JOB } = await import("../lib/seed");
    const lines = Object.values(WATER_HEATER_JOB.marketLines);
    expect(lines.reduce((s, r) => s + r.low, 0)).toBe(WATER_HEATER_JOB.marketTotal.low);
    expect(lines.reduce((s, r) => s + r.high, 0)).toBe(WATER_HEATER_JOB.marketTotal.high);
  });

  it("makes every sample quote add up to its own total", async () => {
    const { QUOTES } = await import("../lib/seed");
    for (const q of QUOTES) expect(q.lines.reduce((s, l) => s + l.amount, 0)).toBe(q.total);
  });

  it("keeps the story: Bayside labor is high, the fair quotes have no high lines", async () => {
    const { QUOTES, WATER_HEATER_JOB } = await import("../lib/seed");
    const { compareQuote } = await import("../lib/quote");
    const flagged = (id: string) =>
      compareQuote(QUOTES.find((q) => q.vendorId === id)!, WATER_HEATER_JOB)
        .lines.filter((l) => l.verdict && l.verdict !== "fair")
        .map((l) => l.id);
    expect(flagged("bayside")).toEqual(["labor"]);
    expect(flagged("willow-glen")).toEqual([]);
    expect(flagged("a1-rapid")).toEqual([]);
  });
});
