import { describe, expect, it } from "vitest";
import { CURRENT_YEAR, buildForecast, cashFlowFor, statusFor } from "../lib/forecast";
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
    expect(result.years[3]).toEqual({ year: 2029, low: 150, high: 400 });
    expect(result.years[4]).toEqual({ year: 2030, low: 5600, high: 8900 });
  });

  it("leaves the roof out of the 5 year totals", () => {
    expect(result.totalLow).toBe(13550);
    expect(result.totalHigh).toBe(21600);
  });

  it("computes the set aside per year", () => {
    expect(result.setAsideLowPerYear).toBe(2710);
    expect(result.setAsideHighPerYear).toBe(4320);
  });

  it("computes the set aside per month over 60 months", () => {
    // 13,550 / 60 = 225.8 and 21,600 / 60 = 360
    expect(result.setAsideLowPerMonth).toBe(226);
    expect(result.setAsideHighPerMonth).toBe(360);
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

describe("cash flow", () => {
  const years = [
    { year: 2026, low: 1600, high: 2600 },
    { year: 2027, low: 5500, high: 8500 },
    { year: 2028, low: 0, high: 0 },
  ];

  it("shows a shortfall when the monthly set-aside is spread evenly", () => {
    const cf = cashFlowFor(years, 223);
    expect(cf.firstShortYear).toBe(2026);
    expect(cf.rows[0].left).toBe(-2600);
    // 2027: 12 months of 223 = 2676, minus the 2026 bills (2600) = 76 on hand, against 8500.
    expect(cf.rows[1].onHand).toBe(76);
    expect(cf.rows[1].left).toBe(-8424);
  });

  it("is covered when enough is saved now and each month", () => {
    const cf = cashFlowFor(years, 800, 2600);
    expect(cf.rows[0].left).toBe(0);
    expect(cf.firstShortYear).toBeNull();
    expect(cf.worstShortfall).toBe(0);
  });

  it("says how much is needed now and how much each month covers the rest", () => {
    const cf = cashFlowFor(years, 0, 0);
    expect(cf.neededNow).toBe(2600);
    // Through 2027 the bills are 11,100, and 12 months of saving covers it at 925 a month.
    expect(cf.monthlyToCover).toBe(Math.ceil(11100 / 12));
    // With 2026 paid from savings, that monthly amount covers 2027.
    const covered = cashFlowFor(years, cf.monthlyToCover, 2600);
    expect(covered.rows[1].left).toBeGreaterThanOrEqual(-2600);
  });
});
