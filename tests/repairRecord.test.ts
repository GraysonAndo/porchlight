import { describe, expect, it } from "vitest";
import { repairRecordText } from "../lib/repairRecord";
import type { ActivityItem } from "../lib/agents/views";

const item = (over: Partial<ActivityItem>): ActivityItem => ({ id: "1", job: "Water heater repair", clock: "9:06 AM", stamp: "Oct 13, 2026, 9:06 AM", title: "Opened a case", detail: null, engine: "code", ...over });

describe("repairRecordText", () => {
  it("groups entries by job and gives every entry a full date", () => {
    const text = repairRecordText("1200 Example Court", "Sample Owner", [
      item({}),
      item({ id: "2", job: "Rent increase", stamp: "Oct 14, 2026, 8:00 AM", title: "Held the check", detail: "Rent is late.\nSecond line." }),
      item({ id: "3", title: "Picked a plumber" }),
    ]);
    expect(text).toContain("WATER HEATER REPAIR");
    expect(text).toContain("RENT INCREASE");
    expect(text.indexOf("Picked a plumber")).toBeLessThan(text.indexOf("RENT INCREASE"));
    expect(text).toContain("Oct 14, 2026, 8:00 AM  Held the check");
    expect(text).toContain("Rent is late. Second line.");
    expect(text).toContain("fictional");
  });

  it("makes an empty record that says so, with no invented entries", () => {
    const text = repairRecordText("1200 Example Court", "Sample Owner", []);
    expect(text).toContain("REPAIR RECORD");
    expect(text).not.toMatch(/\d{4}, \d/);
  });
});
