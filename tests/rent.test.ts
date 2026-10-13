import { describe, expect, it } from "vitest";
import {
  buildNotice,
  calculateRent,
  capPercentFor,
  effectiveDateFor,
  maxNewRentFor,
  noticeDaysFor,
  type RentInputs,
} from "../lib/rent";

const base: RentInputs = {
  currentRent: 3200,
  cpiPercent: 3.0,
  proposedRent: 3360,
  tenancy12Plus: true,
  increasesInLast12Months: 0,
  singleFamilyOrCondo: true,
  notCorporateOwned: true,
  exemptionNoticeGiven: false,
  buildingUnder15Years: false,
};

describe("cap and max rent", () => {
  it("seed case: cap = min(5 + 3.0, 10) = 8.0%", () => {
    expect(capPercentFor(3.0)).toBe(8);
  });

  it("seed case: max new rent for $3,200 is $3,456.00", () => {
    expect(maxNewRentFor(3200, 8)).toBe(3456);
    expect(calculateRent(base).maxNewRent).toBe(3456);
  });

  it("caps the percentage at 10", () => {
    expect(capPercentFor(7)).toBe(10);
    expect(capPercentFor(5)).toBe(10);
    expect(capPercentFor(4.9)).toBeCloseTo(9.9, 10);
  });

  it("rounds the max rent down to the cent", () => {
    // 1234.56 * 1.0833 = 1337.3988, down to 1337.39
    expect(maxNewRentFor(1234.56, 8.33)).toBe(1337.39);
    // 999.99 * 1.08 = 1079.9892, down to 1079.98
    expect(maxNewRentFor(999.99, 8)).toBe(1079.98);
  });
});

describe("notice period", () => {
  it("seed case: 30 days for a 5% increase", () => {
    expect(noticeDaysFor(3200, 3360)).toBe(30);
  });

  it("seed case: 90 days for an 11% increase", () => {
    expect(noticeDaysFor(3200, 3552)).toBe(90);
  });

  it("is 30 days at exactly 10% and 90 days one cent over", () => {
    expect(noticeDaysFor(3200, 3520)).toBe(30);
    expect(noticeDaysFor(3200, 3520.01)).toBe(90);
  });
});

describe("calculateRent", () => {
  it("is within the cap at 5%", () => {
    const r = calculateRent(base);
    expect(r.withinCap).toBe(true);
    expect(r.overCapBy).toBe(0);
    expect(r.increasePercent).toBeCloseTo(5, 10);
    expect(r.noticeDays).toBe(30);
  });

  it("is within the cap at exactly the max", () => {
    const r = calculateRent({ ...base, proposedRent: 3456 });
    expect(r.withinCap).toBe(true);
  });

  it("reports how far over the cap a 10% increase is", () => {
    const r = calculateRent({ ...base, proposedRent: 3520 });
    expect(r.withinCap).toBe(false);
    expect(r.overCapBy).toBe(64);
  });

  it("uses a 90 day notice for an 11% increase", () => {
    const r = calculateRent({ ...base, proposedRent: 3552 });
    expect(r.noticeDays).toBe(90);
    expect(r.withinCap).toBe(false);
  });

  it("treats a decrease as within the cap", () => {
    const r = calculateRent({ ...base, proposedRent: 3000 });
    expect(r.withinCap).toBe(true);
    expect(r.increaseAmount).toBe(-200);
  });

  it("flags two increases already given in the last 12 months", () => {
    expect(calculateRent({ ...base, increasesInLast12Months: 1 }).tooManyIncreases).toBe(false);
    expect(calculateRent({ ...base, increasesInLast12Months: 2 }).tooManyIncreases).toBe(true);
  });
});

describe("exemptions", () => {
  it("is not exempt by default", () => {
    expect(calculateRent(base).mayBeExempt).toBe(false);
  });

  it("may be exempt when the house, owner, and notice checks all pass", () => {
    const r = calculateRent({ ...base, exemptionNoticeGiven: true });
    expect(r.mayBeExempt).toBe(true);
    expect(r.exemptionReason).toContain("exemption notice");
  });

  it("is not exempt when the written notice was not given", () => {
    const r = calculateRent({ ...base, exemptionNoticeGiven: false });
    expect(r.mayBeExempt).toBe(false);
  });

  it("is not exempt when owned by a corporation", () => {
    const r = calculateRent({ ...base, exemptionNoticeGiven: true, notCorporateOwned: false });
    expect(r.mayBeExempt).toBe(false);
  });

  it("may be exempt when the building is less than 15 years old", () => {
    const r = calculateRent({ ...base, singleFamilyOrCondo: false, buildingUnder15Years: true });
    expect(r.mayBeExempt).toBe(true);
    expect(r.exemptionReason).toContain("15 years");
  });

  it("still computes the cap when exempt", () => {
    const r = calculateRent({ ...base, exemptionNoticeGiven: true });
    expect(r.maxNewRent).toBe(3456);
  });
});

describe("notice draft", () => {
  it("adds the notice days to the notice date", () => {
    expect(effectiveDateFor("2026-10-13", 30)).toBe("2026-11-12");
    expect(effectiveDateFor("2026-12-15", 90)).toBe("2027-03-15");
  });

  it("is stamped as a draft and includes the key facts", () => {
    const text = buildNotice({
      ownerName: "Sample Owner",
      tenantName: "Sample Tenant",
      address: "1200 Example Court, San Jose, CA 95100",
      currentRent: 3200,
      newRent: 3360,
      noticeDate: "2026-10-13",
      noticeDays: 30,
    });
    expect(text.startsWith("DRAFT, NOT LEGAL ADVICE")).toBe(true);
    expect(text).toContain("Sample Tenant");
    expect(text).toContain("1200 Example Court");
    expect(text).toContain("$3,200.00");
    expect(text).toContain("$3,360.00");
    expect(text).toContain("November 12, 2026");
    expect(text).toContain("Owner signature");
  });
});
