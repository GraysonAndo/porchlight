import { describe, expect, it } from "vitest";
import { demoToday } from "../lib/demoDate";
import { dueStatus } from "../lib/payments";
import { comingUp } from "../lib/comingUp";

describe("demoToday", () => {
  it("is the real date while the sample is in its window", () => {
    const d = new Date(2026, 9, 23, 9);
    expect(demoToday(d)).toBe(d);
  });

  it("holds the sample at the end of its window, so it does not decay as the calendar moves", () => {
    for (const real of [new Date(2026, 10, 1), new Date(2026, 11, 20), new Date(2027, 5, 3)]) {
      const d = demoToday(real);
      expect(d.getFullYear()).toBe(2026);
      expect(d.getMonth()).toBe(9);
      expect(d.getDate()).toBe(30);
    }
  });

  it("holds the sample at the start of its window before that", () => {
    expect(demoToday(new Date(2026, 8, 1)).getDate()).toBe(5);
  });

  it("keeps the story the same on any real day: rent late, water and trash not yet due, a notice deadline ahead", () => {
    for (const real of [new Date(2026, 10, 15), new Date(2027, 2, 9)]) {
      const now = demoToday(real);
      expect(dueStatus("rent", now).overdue).toBe(true);
      expect(dueStatus("utilities", now).overdue).toBe(false);
      expect(comingUp({ now, utilitiesPaid: false }).map((i) => i.id)).toEqual(["utilities", "notice", "anniversary"]);
    }
  });
});
