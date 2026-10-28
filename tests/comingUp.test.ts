import { describe, expect, it } from "vitest";
import { comingUp, inDaysText } from "../lib/comingUp";

const oct23 = new Date(2026, 9, 23);

describe("comingUp", () => {
  it("lists the bill, the notice deadline and the anniversary, soonest first, with real day counts", () => {
    const items = comingUp({ now: oct23, utilitiesPaid: false });
    expect(items.map((i) => i.id)).toEqual(["utilities", "notice", "anniversary"]);
    expect(items[0].inDays).toBe(8);
    expect(items[1].date).toBe("2026-11-14");
    expect(items[1].inDays).toBe(22);
    expect(items[2].inDays).toBe(52);
  });

  it("drops the water bill once it is paid, and drops anything already past", () => {
    expect(comingUp({ now: oct23, utilitiesPaid: true }).map((i) => i.id)).toEqual(["notice", "anniversary"]);
    expect(comingUp({ now: new Date(2026, 10, 20), utilitiesPaid: true }).map((i) => i.id)).toEqual(["anniversary"]);
    expect(comingUp({ now: new Date(2027, 0, 5), utilitiesPaid: true })).toEqual([]);
  });

  it("moves the notice deadline back for a 90 day notice", () => {
    const item = comingUp({ now: oct23, utilitiesPaid: true, noticeDays: 90 }).find((i) => i.id === "notice");
    expect(item).toBeUndefined();
  });

  it("words the day count", () => {
    expect(inDaysText(0)).toBe("today");
    expect(inDaysText(1)).toBe("tomorrow");
    expect(inDaysText(8)).toBe("in 8 days");
  });
});
