import { describe, expect, it } from "vitest";
import {
  BILLS,
  SAMPLE_BANK,
  SAMPLE_CARD,
  accountValid,
  confirmationNumber,
  cvcValid,
  daysUntil,
  dueStatus,
  expiryValid,
  feeCents,
  formatCardNumber,
  formatExpiry,
  lastFour,
  luhnValid,
  money,
  routingValid,
  totalCents,
  zipValid,
} from "../lib/payments";

describe("amounts", () => {
  it("bills rent and utilities in whole cents", () => {
    expect(BILLS.map((b) => b.cents)).toEqual([320000, 9218]);
    expect(BILLS.every((b) => Number.isInteger(b.cents))).toBe(true);
  });

  it("charges nothing extra for a bank transfer, and 2.9% plus 30 cents for a card", () => {
    expect(feeCents(329218, "bank")).toBe(0);
    expect(feeCents(329218, "card")).toBe(Math.round(329218 * 0.029) + 30);
    expect(totalCents(320000, "card")).toBe(320000 + 9280 + 30);
    expect(totalCents(0, "card")).toBe(0);
  });

  it("formats money with cents and never shows a float artifact", () => {
    expect(money(329218)).toBe("$3,292.18");
    expect(money(352001)).toBe("$3,520.01");
    expect(money(0)).toBe("$0.00");
  });
});

describe("card checks", () => {
  it("groups card digits and caps the length", () => {
    expect(formatCardNumber("4242424242424242")).toBe("4242 4242 4242 4242");
    expect(formatCardNumber("42a42")).toBe("4242");
    expect(formatCardNumber("1".repeat(30)).replace(/\s/g, "")).toHaveLength(19);
  });

  it("accepts the sample card and rejects a number that fails the Luhn check", () => {
    expect(luhnValid(SAMPLE_CARD.number)).toBe(true);
    expect(luhnValid("4242 4242 4242 4241")).toBe(false);
    expect(luhnValid("1234")).toBe(false);
    expect(luhnValid("")).toBe(false);
  });

  it("checks the expiry month and that the date has not passed", () => {
    const now = new Date(2026, 9, 19);
    expect(formatExpiry("1230")).toBe("12/30");
    expect(expiryValid("12/30", now)).toBe(true);
    expect(expiryValid("10/26", now)).toBe(true);
    expect(expiryValid("09/26", now)).toBe(false);
    expect(expiryValid("13/30", now)).toBe(false);
    expect(expiryValid("00/30", now)).toBe(false);
    expect(expiryValid("1/30", now)).toBe(false);
  });

  it("checks CVC and ZIP", () => {
    expect(cvcValid("123")).toBe(true);
    expect(cvcValid("1234")).toBe(true);
    expect(cvcValid("12")).toBe(false);
    expect(zipValid("95100")).toBe(true);
    expect(zipValid("9510")).toBe(false);
  });

  it("keeps only the last four digits", () => {
    expect(lastFour(SAMPLE_CARD.number)).toBe("4242");
    expect(lastFour("12")).toBe("");
  });
});

describe("bank checks", () => {
  it("accepts a routing number with a good checksum and nine digits", () => {
    expect(routingValid(SAMPLE_BANK.routing)).toBe(true);
    expect(routingValid("110000001")).toBe(false);
    expect(routingValid("12345")).toBe(false);
  });

  it("accepts an account number of 4 to 17 digits", () => {
    expect(accountValid(SAMPLE_BANK.account)).toBe(true);
    expect(accountValid("123")).toBe(false);
    expect(accountValid("1".repeat(18))).toBe(false);
  });
});

describe("confirmation numbers", () => {
  it("count up from the number of earlier payments", () => {
    expect(confirmationNumber(0)).toBe("GH-100042");
    expect(confirmationNumber(2)).toBe("GH-100044");
  });
});

describe("when a bill is due", () => {
  it("counts whole calendar days", () => {
    expect(daysUntil("2026-10-31", new Date(2026, 9, 20, 22, 0))).toBe(11);
    expect(daysUntil("2026-10-01", new Date(2026, 9, 19, 1, 0))).toBe(-18);
    expect(daysUntil("2026-10-19", new Date(2026, 9, 19, 23, 59))).toBe(0);
  });

  it("calls only a bill past its date overdue", () => {
    const rent = dueStatus("rent", new Date(2026, 9, 19));
    expect(rent.overdue).toBe(true);
    expect(rent.badge).toBe("Overdue");
    expect(rent.text).toBe("18 days late. It was due Oct 1.");
    const utilities = dueStatus("utilities", new Date(2026, 9, 20));
    expect(utilities.overdue).toBe(false);
    expect(utilities.badge).toBe("Due Oct 31");
    expect(utilities.text).toBe("Due Oct 31, in 11 days.");
  });

  it("says due today on the day", () => {
    expect(dueStatus("utilities", new Date(2026, 9, 31)).badge).toBe("Due today");
  });
});
