import { describe, expect, it } from "vitest";
import { COLLECTED, PLAN, collectedFor } from "../lib/plan";

describe("Porchlight's plan for the demo job", () => {
  it("collects three quotes with a verdict each", () => {
    expect(COLLECTED.map((c) => [c.vendorId, c.verdict])).toEqual([
      ["bayside", "slightly high"],
      ["willow-glen", "fair"],
      ["a1-rapid", "fair"],
    ]);
  });

  it("recommends Willow Glen with a limit 10% over the quote", () => {
    expect(PLAN.vendorId).toBe("willow-glen");
    expect(PLAN.total).toBe(2450);
    expect(PLAN.notToExceed).toBe(2695);
    expect(PLAN.savedVsHighest).toBe(400);
  });

  it("skips A1 because no license is shown, and Bayside because it is slightly high", () => {
    const reasons = Object.fromEntries(PLAN.skipped.map((s) => [s.vendorId, s.reason]));
    expect(reasons["a1-rapid"]).toMatch(/license/i);
    expect(reasons["bayside"]).toMatch(/slightly high/i);
  });

  it("notices the quote that leaves out a permit", () => {
    expect(collectedFor("a1-rapid")?.missingLines).toEqual(["a permit"]);
    expect(collectedFor("willow-glen")?.missingLines).toEqual([]);
  });
});
