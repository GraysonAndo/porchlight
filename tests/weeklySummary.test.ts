import { describe, expect, it } from "vitest";
import { weeklySummaryLines } from "../lib/weeklySummary";
import type { ActivityItem } from "../lib/agents/views";

const item = (over: Partial<ActivityItem>): ActivityItem => ({ id: "1", job: "Water heater repair", clock: "9:00 AM", stamp: "Oct 13, 2026, 9:00 AM", title: "Step", detail: null, engine: "code", ...over });

describe("weeklySummaryLines", () => {
  it("says so when nothing happened, and invents nothing", () => {
    const text = weeklySummaryLines({ address: "1200 Example Court", activity: [], coming: [], waitingOnOwner: 0 }).join("\n");
    expect(text).toContain("nothing needed you");
    expect(text).toContain("Nothing is waiting on you");
    expect(text).not.toMatch(/handled \d/);
  });

  it("counts only steps a person did not have to tap, and names the jobs", () => {
    const text = weeklySummaryLines({
      address: "1200 Example Court",
      activity: [item({}), item({ id: "2", engine: "action" }), item({ id: "3", engine: "human" }), item({ id: "4", job: "Rent increase" })],
      coming: [{ id: "n", date: "2026-11-14", title: "Last day to send a rent notice", detail: "", inDays: 22 }],
      waitingOnOwner: 2,
    }).join("\n");
    expect(text).toContain("handled 3 steps on its own, across 2 jobs: Water heater repair, Rent increase");
    expect(text).toContain("2 things are waiting on you");
    expect(text).toContain("- Last day to send a rent notice: November 14, 2026, in 22 days");
  });
});
