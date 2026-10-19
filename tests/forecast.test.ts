import { describe, expect, it } from "vitest";
import { CURRENT_YEAR, buildForecast, statusFor } from "../lib/forecast";
import { EQUIPMENT } from "../lib/seed";

describe("statusFor", () => {
  it("marks past and current due years as overdue or due now", () => {
    expect(statusFor(2025, 2026)).toBe("overdue or due now");
    expect(statusFor(2026, 2026)).toBe("overdue or due now");
  });

  it("marks the next four years as within 5 years", () => {
    expect(statusFor(2027, 2026)).toBe("within 5 years");
    expect(statusFor(2030, 2026)).toBe("within 5 years");
  });

  it("marks later years as beyond 5 years", () => {
    expect(statusFor(2031, 2026)).toBe("beyond 5 years");
  });
});

describe("buildForecast with the seed equipment", () => {
  const result = buildForecast(EQUIPMENT);
  const byId = (id: string) => result.rows.find((r) => r.id === id)!;

  it("uses 2026 as the current year", () => {
    expect(CURRENT_YEAR).toBe(2026);
    expect(result.currentYear).toBe(2026);
  });

  it("marks the water heater overdue", () => {
    expect(byId("water-heater").dueYear).toBe(2025);
    expect(byId("water-heater").status).toBe("overdue or due now");
  });

  it("computes due years and statuses for the rest", () => {
    expect(byId("furnace").dueYear).toBe(2030);
    expect(byId("furnace").status).toBe("within 5 years");
    expect(byId("air-conditioner").dueYear).toBe(2027);
    expect(byId("dishwasher").dueYear).toBe(2028);
    expect(byId("refrigerator").dueYear).toBe(2030);
    expect(byId("roof").dueYear).toBe(2034);
    expect(byId("roof").status).toBe("beyond 5 years");
  });

  it("builds five yearly buckets, counting overdue items in the current year", () => {
    expect(result.years.map((y) => y.year)).toEqual([2026, 2027, 2028, 2029, 2030]);
    expect(result.years[0]).toEqual({ year: 2026, low: 1600, high: 2600 });
    expect(result.years[1]).toEqual({ year: 2027, low: 5500, high: 8500 });
    expect(result.years[2]).toEqual({ year: 2028, low: 700, high: 1200 });
    expect(result.years[3]).toEqual({ year: 2029, low: 0, high: 0 });
    expect(result.years[4]).toEqual({ year: 2030, low: 5600, high: 8900 });
  });

  it("leaves the roof out of the 5 year totals", () => {
    expect(result.totalLow).toBe(13400);
    expect(result.totalHigh).toBe(21200);
  });

  it("computes the set aside per year", () => {
    expect(result.setAsideLowPerYear).toBe(2680);
    expect(result.setAsideHighPerYear).toBe(4240);
  });

  it("computes the set aside per month over 60 months", () => {
    // 13,400 / 60 = 223.3 and 21,200 / 60 = 353.3
    expect(result.setAsideLowPerMonth).toBe(223);
    expect(result.setAsideHighPerMonth).toBe(353);
  });
});

describe("buildForecast edge cases", () => {
  it("returns zeros for an empty list", () => {
    const result = buildForecast([]);
    expect(result.totalLow).toBe(0);
    expect(result.setAsideHighPerYear).toBe(0);
    expect(result.years).toHaveLength(5);
  });

  it("respects a different current year", () => {
    const item = {
      id: "x",
      name: "Thing",
      installYear: 2020,
      typicalLifeYears: 10,
      replaceLow: 100,
      replaceHigh: 200,
    };
    expect(buildForecast([item], 2026).rows[0].status).toBe("within 5 years");
    expect(buildForecast([item], 2030).rows[0].status).toBe("overdue or due now");
  });
});
