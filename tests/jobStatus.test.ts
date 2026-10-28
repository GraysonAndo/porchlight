import { describe, expect, it } from "vitest";
import { APPROVED_MS, jobStatus } from "../lib/jobStatus";
import { INITIAL_STATE } from "../lib/seed";
import type { DemoState } from "../lib/types";

const T0 = Date.parse("2026-10-13T09:00:00Z");
const approval = { vendorId: "willow-glen", notToExceed: 2695, accessWindow: "Tomorrow, 9:00 to 11:00 AM", sentAt: "2026-10-13T09:00:00Z" };
const heater = { description: "The water heater is leaking", photos: [], submittedAt: "2026-10-13T08:00:00Z" };
const triage = { category: "Plumbing", urgency: "urgent" as const, summary: "", likelyCause: "", safetySteps: [], tenantQuestions: [], suggestedTrade: "", confidence: 0.8 };

const base = (patch: Partial<DemoState>): DemoState => ({ ...INITIAL_STATE, ...patch });

describe("jobStatus", () => {
  it("starts as quoted for the waiting sample request", () => {
    expect(jobStatus(base({}), T0)).toBe("quoted");
  });

  it("is quoted for a heater request once triaged", () => {
    expect(jobStatus(base({ request: heater, triage }), T0)).toBe("quoted");
  });

  it("is new while the tenant is still being asked about the problem, before any quotes exist", () => {
    for (const stage of ["asked_electrical", "steps_given", "quotes_pending"] as const) {
      const agent = { ...INITIAL_STATE.agent, triage: { ...INITIAL_STATE.agent.triage, stage } };
      expect(jobStatus(base({ request: heater, triage, agent }), T0)).toBe("new");
    }
  });

  it("is new for a request that has no quotes, like a clogged toilet", () => {
    expect(jobStatus(base({ request: { ...heater, description: "The toilet is clogged" }, triage: { ...triage } }), T0)).toBe("new");
  });

  it("shows approved right after the tap, then booked by itself", () => {
    const s = base({ approval });
    expect(jobStatus(s, T0 + 100)).toBe("approved");
    expect(jobStatus(s, T0 + APPROVED_MS - 1)).toBe("approved");
    expect(jobStatus(s, T0 + APPROVED_MS)).toBe("booked");
  });

  it("is booked after a reload long after approval", () => {
    expect(jobStatus(base({ approval }), T0 + 3600_000)).toBe("booked");
  });

  it("is done once the job is marked done, whatever else is true", () => {
    expect(jobStatus(base({ approval, jobCompletedAt: "2026-10-14T11:20:00Z" }), T0 + 100)).toBe("done");
  });
});
