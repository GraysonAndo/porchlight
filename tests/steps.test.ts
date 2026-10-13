import { describe, expect, it } from "vitest";
import { FLOWS, STEPS, flowSteps, neighbors, positionOf, roleForPath, screenNameFor, stepById, stepForPath } from "../lib/steps";

describe("steps", () => {
  it("has unique ids and paths", () => {
    expect(new Set(STEPS.map((s) => s.id)).size).toBe(STEPS.length);
    expect(new Set(STEPS.map((s) => s.path)).size).toBe(STEPS.length);
  });

  it("keeps tenants and owners on their own sides", () => {
    for (const s of flowSteps("tenant")) expect(s.path.startsWith("/tenant")).toBe(true);
    for (const flow of ["owner", "tools", "optional"] as const) {
      for (const s of flowSteps(flow)) expect(s.path.startsWith("/owner")).toBe(true);
    }
  });

  it("gives the tenant 4 screens and the owner repair flow 5", () => {
    expect(flowSteps("tenant").map((s) => s.short)).toEqual(["Report", "Safety", "Photo", "Status"]);
    expect(flowSteps("owner").map((s) => s.short)).toEqual(["Request", "Record", "Quote", "Decide", "Book"]);
  });

  it("does not show owner decisions to tenants", () => {
    const tenantTitles = flowSteps("tenant").map((s) => s.title.toLowerCase()).join(" ");
    for (const word of ["quote", "forecast", "rent increase", "repair or replace", "label", "house record"]) {
      expect(tenantTitles).not.toContain(word);
    }
  });

  it("puts forecast and rent outside the numbered repair flow", () => {
    expect(FLOWS.tools.numbered).toBe(false);
    expect(FLOWS.optional.numbered).toBe(false);
    expect(flowSteps("owner").some((s) => s.id === "tools-forecast" || s.id === "tools-rent")).toBe(false);
  });

  it("finds a step by path, with or without a trailing slash", () => {
    expect(stepForPath("/owner/quote")?.id).toBe("owner-quote");
    expect(stepForPath("/owner/quote/")?.id).toBe("owner-quote");
    expect(stepForPath("/nope")).toBeUndefined();
  });

  it("computes position and neighbors inside a flow only", () => {
    const quote = stepById("owner-quote");
    expect(positionOf(quote)).toEqual({ index: 3, total: 5 });
    expect(neighbors(quote).prev?.id).toBe("owner-record");
    expect(neighbors(quote).next?.id).toBe("owner-decide");
    expect(neighbors(stepById("owner-request")).prev).toBeUndefined();
    expect(neighbors(stepById("owner-book")).next).toBeUndefined();
    expect(neighbors(stepById("tenant-status")).next).toBeUndefined();
  });

  it("names screens for the feedback notes", () => {
    expect(screenNameFor("/tenant/safety")).toBe("Tenant, screen 2 of 4: What to do right now");
    expect(screenNameFor("/owner/decide")).toBe("Owner, screen 4 of 5: Repair or replace");
    expect(screenNameFor("/owner/forecast")).toBe("Plan ahead: 5-year forecast");
    expect(screenNameFor("/owner")).toBe("Owner home");
    expect(screenNameFor("/")).toBe("Home");
  });

  it("knows which side a path belongs to", () => {
    expect(roleForPath("/tenant/status")).toBe("tenant");
    expect(roleForPath("/owner/record")).toBe("owner");
    expect(roleForPath("/")).toBeNull();
    expect(roleForPath("/feedback")).toBeNull();
  });
});
