import { describe, expect, it } from "vitest";
import {
  buildNotice,
  calculateRent,
  capPercentFor,
  effectiveDateFor,
  maxNewRentFor,
  noticeDaysFor,
  MAX_SANE_RENT,
  noticeKindFor,
  rentLooksTooHigh,
  roundToCents,
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
  leaseHasExemptionWording: true,
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

describe("money rounding and sanity", () => {
  it("rounds to the cent, so a typed 1234.567 never carries a float tail", () => {
    expect(roundToCents(1234.567)).toBe(1234.57);
    expect(roundToCents(3520.01)).toBe(3520.01);
    expect(roundToCents(0.1 + 0.2)).toBe(0.3);
    expect(String(roundToCents(1234.5670166015625))).toBe("1234.57");
  });

  it("flags a rent too high to be real for one home", () => {
    expect(rentLooksTooHigh(99999999)).toBe(true);
    expect(rentLooksTooHigh(3200)).toBe(false);
    expect(rentLooksTooHigh(MAX_SANE_RENT)).toBe(false);
  });
});

describe("the notice matches the change", () => {
  const input = { ownerName: "O", tenantName: "T", address: "A", currentRent: 3200, newRent: 3360, noticeDate: "2026-10-19", noticeDays: 30 as const };

  it("tells an increase, a decrease, and no change apart", () => {
    expect(noticeKindFor(3200, 3360)).toBe("increase");
    expect(noticeKindFor(3200, 3000)).toBe("decrease");
    expect(noticeKindFor(3200, 3200)).toBe("none");
  });

  it("titles a rent decrease as a decrease, never as an increase", () => {
    const text = buildNotice({ ...input, newRent: 3000 });
    expect(text).toContain("NOTICE OF RENT DECREASE");
    expect(text).not.toContain("RENT INCREASE");
    expect(text).not.toMatch(/gives you \d+ days/);
    expect(text).toContain("$3,000.00");
  });

  it("keeps the increase wording and the notice days for an increase", () => {
    const text = buildNotice(input);
    expect(text).toContain("NOTICE OF RENT INCREASE");
    expect(text).toContain("This notice gives you 30 days");
  });

  it("says nothing is changing when the rent stays the same", () => {
    const text = buildNotice({ ...input, newRent: 3200 });
    expect(text).toContain("NOTICE OF NO RENT CHANGE");
    expect(text).not.toContain("new rent will be");
  });
});

describe("an increase already given uses up part of the yearly room", () => {
  it("is the same as before when there was no earlier increase", () => {
    expect(maxNewRentFor(3200, 8, 0)).toBe(maxNewRentFor(3200, 8));
  });

  it("is lower after an earlier increase, measured from the rent a year ago", () => {
    // Rent a year ago was 3200 / 1.03 = 3106.796, and 8% on that is 3355.33 after rounding down to the cent.
    expect(maxNewRentFor(3200, 8, 3)).toBe(3355.33);
    expect(maxNewRentFor(3200, 8, 3)).toBeLessThan(maxNewRentFor(3200, 8));
  });

  it("flows through calculateRent", () => {
    const r = calculateRent({ ...base, increasesInLast12Months: 1, priorIncreasePercent: 3, proposedRent: 3360 });
    expect(r.maxNewRent).toBe(3355.33);
    expect(r.withinCap).toBe(false);
    expect(r.tooManyIncreases).toBe(false);
  });
});

describe("the letter uses the start date the owner picked", () => {
  const input = { ownerName: "O", tenantName: "T", address: "A", currentRent: 3200, newRent: 3360, noticeDate: "2026-10-19", noticeDays: 30 };

  it("shows the chosen start date when the notice is early enough", () => {
    expect(buildNotice({ ...input, startDate: "2026-12-14" })).toContain("Starting December 14, 2026");
  });

  it("falls back to the earliest possible date when the chosen one is too soon", () => {
    expect(buildNotice({ ...input, startDate: "2026-10-30" })).toContain("Starting November 18, 2026");
  });

  it("names the delivery method, the owner address, and the basis", () => {
    const text = buildNotice({ ...input, serviceMethod: "first-class mail", ownerAddress: "PO Box 100", basis: "Within Civil Code section 1947.12." });
    expect(text).toContain("Delivery: first-class mail");
    expect(text).toContain("Owner mailing address: PO Box 100");
    expect(text).toContain("Within Civil Code section 1947.12.");
  });
});

describe("the home exemption needs the notice and the lease wording", () => {
  it("needs both", () => {
    expect(calculateRent({ ...base, exemptionNoticeGiven: true, leaseHasExemptionWording: false }).mayBeExempt).toBe(false);
    expect(calculateRent({ ...base, exemptionNoticeGiven: false, leaseHasExemptionWording: true }).mayBeExempt).toBe(false);
    expect(calculateRent({ ...base, exemptionNoticeGiven: true, leaseHasExemptionWording: true }).mayBeExempt).toBe(true);
  });
});
