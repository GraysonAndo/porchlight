import { describe, expect, it } from "vitest";
import { decideRepairOrReplace } from "../lib/decision";

describe("decideRepairOrReplace", () => {
  it("seed case: recommends replace for the 11 year old leaking water heater", () => {
    const result = decideRepairOrReplace({
      item: "Water heater",
      ageYears: 11,
      typicalLifeYears: 10,
      repairCost: 450,
      replaceCost: 2850,
      failureMode: "tank leak",
    });
    expect(result.recommendation).toBe("replace");
    expect(result.numbers.agePercentOfLife).toBe(110);
    expect(result.reasons).toHaveLength(2);
    expect(result.reasons[0]).toContain("110%");
    expect(result.reasons[1]).toContain("leaking");
  });

  it("recommends repair when no rule triggers", () => {
    const result = decideRepairOrReplace({
      item: "Dishwasher",
      ageYears: 3,
      typicalLifeYears: 10,
      repairCost: 150,
      replaceCost: 900,
      failureMode: "other",
    });
    expect(result.recommendation).toBe("repair");
    expect(result.reasons).toEqual([]);
    expect(result.checks.every((c) => !c.triggered)).toBe(true);
  });

  it("replaces at exactly 80% of typical life", () => {
    const result = decideRepairOrReplace({
      item: "Furnace",
      ageYears: 8,
      typicalLifeYears: 10,
      repairCost: 100,
      replaceCost: 5000,
      failureMode: "other",
    });
    expect(result.recommendation).toBe("replace");
  });

  it("repairs just under 80% of typical life", () => {
    const result = decideRepairOrReplace({
      item: "Furnace",
      ageYears: 7.9,
      typicalLifeYears: 10,
      repairCost: 100,
      replaceCost: 5000,
      failureMode: "other",
    });
    expect(result.recommendation).toBe("repair");
  });

  it("replaces when the repair costs exactly half of a new one", () => {
    const result = decideRepairOrReplace({
      item: "Air conditioner",
      ageYears: 2,
      typicalLifeYears: 15,
      repairCost: 3000,
      replaceCost: 6000,
      failureMode: "other",
    });
    expect(result.recommendation).toBe("replace");
    expect(result.checks.find((c) => c.id === "cost")?.triggered).toBe(true);
  });

  it("replaces a leaking tank even when it is new and cheap to patch", () => {
    const result = decideRepairOrReplace({
      item: "Water heater",
      ageYears: 1,
      typicalLifeYears: 10,
      repairCost: 50,
      replaceCost: 2500,
      failureMode: "tank leak",
    });
    expect(result.recommendation).toBe("replace");
    expect(result.reasons).toHaveLength(1);
  });

  it("returns the numbers it used", () => {
    const result = decideRepairOrReplace({
      item: "Roof",
      ageYears: 20,
      typicalLifeYears: 25,
      repairCost: 1000,
      replaceCost: 12000,
      failureMode: "other",
    });
    expect(result.numbers).toEqual({
      ageYears: 20,
      typicalLifeYears: 25,
      agePercentOfLife: 80,
      repairCost: 1000,
      replaceCost: 12000,
      repairPercentOfReplace: 8,
    });
  });
});
