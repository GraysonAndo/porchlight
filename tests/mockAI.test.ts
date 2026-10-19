import { describe, expect, it } from "vitest";
import { createMockAI } from "../lib/mockAI";
import { BAYSIDE_QUOTE, WATER_HEATER_JOB } from "../lib/seed";

// No delay in tests.
const ai = createMockAI({ minDelayMs: 0, maxDelayMs: 0 });

describe("mockAI", () => {
  it("triage returns the seeded urgent plumbing scenario for a water heater leak", async () => {
    const r = await ai.triageRequest({ description: "The water heater is leaking from the bottom", photos: [] });
    expect(r.category).toBe("Plumbing");
    expect(r.urgency).toBe("urgent");
    expect(r.safetySteps).toHaveLength(4);
    expect(r.tenantQuestions).toHaveLength(3);
  });

  it("label read returns the seeded reading with the serial flagged for review", async () => {
    const r = await ai.readLabel({ photo: null });
    expect(r.manufacturer).toBe("Hearthline");
    expect(r.model).toBe("HL-40G-NG");
    expect(r.serial).toBe("15C0412-X");
    expect(r.capacityGallons).toBe(40);
    expect(r.manufactureDate).toBe("2015-03");
    expect(r.ageYears).toBe(11);
    expect(r.fieldsNeedingReview).toEqual(["serial"]);
  });

  it("quote check is slightly high, flags labor and the expansion tank, and estimates savings", async () => {
    const r = await ai.checkQuote({ quote: BAYSIDE_QUOTE, item: WATER_HEATER_JOB });
    expect(r.verdict).toBe("slightly high");
    expect(r.marketLow).toBe(1600);
    expect(r.marketHigh).toBe(2600);
    expect(r.flaggedLines.map((f) => f.line)).toEqual(["Labor", "Expansion tank"]);
    expect(r.questionsToAsk).toHaveLength(2);
    // Bayside's quote already has a permit line, so GoHome does not ask about the permit.
    expect(r.questionsToAsk.join(" ")).not.toMatch(/permit/i);
    expect(r.estimatedSavingsLow).toBe(250);
    expect(r.estimatedSavingsHigh).toBe(500);
  });

  it("quote check finds no savings for a fair quote", async () => {
    const fair = { ...BAYSIDE_QUOTE, total: 2100, lines: [] };
    const r = await ai.checkQuote({ quote: fair, item: WATER_HEATER_JOB });
    expect(r.verdict).toBe("fair");
    expect(r.estimatedSavingsLow).toBe(0);
    expect(r.estimatedSavingsHigh).toBe(0);
  });

  it("vendor message includes the amounts and asks for a license when it was not shown", async () => {
    const text = await ai.draftVendorMessage({
      ownerName: "Sample Owner",
      vendorName: "A1 Rapid Plumbing",
      address: "1200 Example Court, San Jose, CA 95100",
      jobDescription: "Replace a leaking 40 gallon natural gas water heater.",
      quoteTotal: 2100,
      notToExceed: 2310,
      accessWindow: "Tomorrow, 9:00 to 11:00 AM",
      licenseShown: false,
    });
    expect(text).toContain("$2,100");
    expect(text).toContain("$2,310");
    expect(text).toContain("did not show a license number");
  });

  it("tenant message includes the visit window", async () => {
    const text = await ai.draftTenantMessage({
      tenantName: "Sample Tenant",
      ownerName: "Sample Owner",
      vendorName: "Willow Glen Water Heater Co.",
      address: "1200 Example Court, San Jose, CA 95100",
      accessWindow: "Tomorrow, 1:00 to 3:00 PM",
    });
    expect(text).toContain("Tomorrow, 1:00 to 3:00 PM");
    expect(text).toContain("Willow Glen Water Heater Co.");
  });
});
