import { describe, expect, it } from "vitest";
import { SAMPLE_QUOTE_TEXT, lineIdFor, parseQuoteText } from "../lib/quoteParse";
import { compareQuote } from "../lib/quote";
import { WATER_HEATER_JOB } from "../lib/seed";

describe("lineIdFor", () => {
  it.each([
    ["Water heater unit, 40 gal", "unit"],
    ["Labor (7 hrs)", "labor"],
    ["Installation", "labor"],
    ["Permit", "permit"],
    ["Haul away old unit", "haul"],
    ["Disposal fee", "haul"],
    ["Expansion tank", "expansion"],
    ["Gas flex line and fittings", "fittings"],
    ["Seismic strap kit", "seismic"],
  ])("maps %j to %s", (label, id) => {
    expect(lineIdFor(label)).toBe(id);
  });

  it("does not mistake an expansion tank for the unit", () => {
    expect(lineIdFor("Expansion tank")).toBe("expansion");
  });

  it("gives an unknown label its own id", () => {
    expect(lineIdFor("Fuel surcharge")).toMatch(/^other-/);
  });
});

describe("parseQuoteText", () => {
  it("reads the sample quote", () => {
    const q = parseQuoteText(SAMPLE_QUOTE_TEXT);
    expect(q.vendorName).toBe("Harbor View Plumbing");
    expect(q.lines).toHaveLength(7);
    expect(q.statedTotal).toBe(3170);
    expect(q.sumOfLines).toBe(3170);
    expect(q.total).toBe(3170);
    expect(q.mismatch).toBeNull();
    expect(q.lines.map((l) => l.id)).toEqual(["unit", "labor", "permit", "haul", "expansion", "fittings", "seismic"]);
  });

  it("gets a HIGH verdict on the sample quote, with labor flagged", () => {
    const q = parseQuoteText(SAMPLE_QUOTE_TEXT);
    const result = compareQuote({ vendorId: "pasted", vendorName: "x", total: q.total, lines: q.lines }, WATER_HEATER_JOB);
    expect(result.total.verdict).toBe("high");
    expect(result.lines.find((l) => l.id === "labor")?.verdict).toBe("high");
  });

  it("reads amounts with or without dollar signs, commas, and cents", () => {
    const q = parseQuoteText("Unit $780\nLabor: 1,330.50\nPermit 150\nTotal $2,260.50");
    expect(q.lines.map((l) => l.amount)).toEqual([780, 1330.5, 150]);
    expect(q.total).toBe(2260.5);
  });

  it("does not treat a dash separator as a negative sign", () => {
    const q = parseQuoteText("Seismic strapping kit - $40\nTotal $40");
    expect(q.lines[0].amount).toBe(40);
  });

  it("reads a discount as a negative line", () => {
    const q = parseQuoteText("Unit $800\nDiscount -$50\nTotal $750");
    expect(q.lines.find((l) => l.label === "Discount")?.amount).toBe(-50);
    expect(q.mismatch).toBeNull();
  });

  it("adds up the items when there is no total line, and says so", () => {
    const q = parseQuoteText("Unit $800\nLabor $900");
    expect(q.statedTotal).toBeNull();
    expect(q.total).toBe(1700);
    expect(q.warnings.join(" ")).toMatch(/no Total line/i);
  });

  it("warns when the items do not add up to the stated total", () => {
    const q = parseQuoteText("Unit $800\nLabor $900\nTotal $2,000");
    expect(q.mismatch).toBe(300);
    expect(q.total).toBe(2000);
    expect(q.warnings.join(" ")).toMatch(/\$300 difference/);
  });

  it("ignores subtotal, quote numbers, and header lines", () => {
    const q = parseQuoteText("Acme Plumbing\nQuote #1042\nUnit $800\nSubtotal $800\nTotal $800");
    expect(q.vendorName).toBe("Acme Plumbing");
    expect(q.lines).toHaveLength(1);
  });

  it("warns about items it cannot match to a typical price", () => {
    const q = parseQuoteText("Unit $800\nFuel surcharge $60\nTotal $860");
    expect(q.warnings.join(" ")).toMatch(/Fuel surcharge/);
  });

  it("asks for a better paste when it finds no prices", () => {
    const q = parseQuoteText("Please call me for a quote");
    expect(q.lines).toHaveLength(0);
    expect(q.warnings.join(" ")).toMatch(/could not find any prices/i);
  });

  it("handles an empty string", () => {
    expect(parseQuoteText("").total).toBe(0);
  });
});

describe("detectQuoteJob", () => {
  it("recognizes a water heater quote", async () => {
    const { detectQuoteJob, SAMPLE_QUOTE_TEXT } = await import("../lib/quoteParse");
    expect(detectQuoteJob(SAMPLE_QUOTE_TEXT)).toEqual({ kind: "water-heater" });
    expect(detectQuoteJob("Replace tankless water heater, $3,000")).toEqual({ kind: "water-heater" });
  });

  it("says unknown, with a guess, for a job that is not in the price table", async () => {
    const { detectQuoteJob } = await import("../lib/quoteParse");
    expect(detectQuoteJob("Furnace replacement\nLabor $2,000\nTotal $6,000")).toEqual({ kind: "unknown", guess: "a heating or cooling job" });
    expect(detectQuoteJob("Re-roof the garage\nTotal $9,000")).toEqual({ kind: "unknown", guess: "a roofing job" });
    expect(detectQuoteJob("Something else\nTotal $500")).toEqual({ kind: "unknown", guess: null });
  });
});

describe("license and phone numbers are not prices", () => {
  const body = `Harbor View Plumbing
CSLB #123456
Call us at (408) 555-0134
Water heater unit .......... $820.00
Labor .......... $1,080.00
TOTAL $1,900.00`;

  it("ignores a license number and a phone number", () => {
    const q = parseQuoteText(body);
    expect(q.lines.map((l) => l.label)).toEqual(["Water heater unit", "Labor"]);
    expect(q.sumOfLines).toBe(1900);
    expect(q.mismatch).toBeNull();
    expect(q.warnings.join(" ")).not.toMatch(/add up/);
  });

  it("still reads a plain amount after a space and a negative discount", () => {
    const q = parseQuoteText("Labor 500\nDiscount -$50\nTotal $450");
    expect(q.lines.map((l) => l.amount)).toEqual([500, -50]);
    expect(q.mismatch).toBeNull();
  });
});
