import { describe, expect, it } from "vitest";
import { SCENARIOS, agentEventsFor, sceneAt, scenarioById, statsFor } from "../lib/scenario";

const leak = scenarioById("leak");
const gas = scenarioById("gas");
const DASHES = new RegExp(`${String.fromCharCode(0x2014)}|${String.fromCharCode(0x2013)}`);

const tenantText = (s: typeof leak) =>
  s.steps
    .flatMap((st) => st.tenant)
    .map((t) => [t.text, ...(t.steps ?? [])].join(" "))
    .join(" ");

describe("scenarios in general", () => {
  it("has the leak and gas scenarios, and falls back to the first for an unknown id", () => {
    expect(SCENARIOS.map((s) => s.id)).toEqual(["leak", "gas"]);
    expect(scenarioById("nope").id).toBe("leak");
  });

  it("moves forward in time and has unique step ids", () => {
    for (const s of SCENARIOS) {
      const times = s.steps.map((st) => st.at);
      expect([...times].sort((a, b) => a - b)).toEqual(times);
      expect(new Set(s.steps.map((st) => st.id)).size).toBe(s.steps.length);
    }
  });

  it("gives every agent event a tool, an engine, a title, and a detail", () => {
    for (const s of SCENARIOS) {
      for (const e of s.steps.flatMap((st) => st.agent)) {
        expect(e.tool).toMatch(/^[a-z_]+$/);
        expect(["ai", "code", "action", "human"]).toContain(e.engine);
        expect(e.title.length).toBeGreaterThan(3);
        expect(e.detail.length).toBeGreaterThan(10);
      }
    }
  });

  it("uses no em or en dashes", () => {
    expect(JSON.stringify(SCENARIOS)).not.toMatch(DASHES);
  });
});

describe("what each side may see", () => {
  it("never shows the tenant a price, a quote, or an owner decision", () => {
    for (const s of SCENARIOS) {
      const text = tenantText(s);
      expect(text).not.toMatch(/\$/);
      expect(text.toLowerCase()).not.toMatch(/quote|approve|repair or replace|forecast|rent increase/);
    }
  });

  it("shows the tenant who is coming and when, without a price", () => {
    const booking = leak.steps.flatMap((s) => s.tenant).find((t) => t.kind === "booking")!;
    expect(booking.text).toContain("Willow Glen Water Heater Co.");
    expect(booking.text).toMatch(/Tomorrow, 9:00 to 11:00 AM/i);
  });

  it("shows the owner the decision with the money, the limit, and who was skipped", () => {
    const decision = leak.steps.flatMap((s) => s.owner).find((o) => o.kind === "decision")!.decision!;
    expect(decision.vendorName).toBe("Willow Glen Water Heater Co.");
    expect(decision.total).toBe(2450);
    expect(decision.limit).toBe(2695);
    expect(decision.saved).toBe(400);
    expect(decision.skipped.join(" ")).toMatch(/A1 Rapid Plumbing: No license number/);
  });
});

describe("leak scenario: the agent works within limits", () => {
  const events = leak.steps.flatMap((s) => s.agent);
  const index = (tool: string) => events.findIndex((e) => e.tool === tool);

  it("treats the leak as urgent, not an emergency, and sends only a quiet heads-up", () => {
    expect(events.find((e) => e.tool === "check_emergency_rules")!.detail).toMatch(/urgent, not an emergency/);
    const owner = leak.steps.flatMap((s) => s.owner);
    expect(owner[0].kind).toBe("push");
    expect(owner.some((o) => o.kind === "call")).toBe(false);
  });

  it("only asks for the label because the record is missing it", () => {
    expect(events.find((e) => e.tool === "request_label_photo")!.detail).toMatch(/only asked because/i);
    expect(index("lookup_house_record")).toBeLessThan(index("request_label_photo"));
  });

  it("sends a human check for the low confidence serial before the record is trusted", () => {
    expect(index("read_label")).toBeLessThan(index("confirm_field"));
    expect(events.find((e) => e.tool === "confirm_field")!.engine).toBe("human");
  });

  it("decides repair or replace and every price check with plain code, not the model", () => {
    for (const tool of ["repair_or_replace", "lookup_price_table", "check_quote", "recommend_vendor", "check_emergency_rules"]) {
      for (const e of events.filter((x) => x.tool === tool)) expect(e.engine).toBe("code");
    }
  });

  it("only the AI reads photos and quotes and writes text", () => {
    for (const tool of ["read_photo", "read_label", "read_quotes", "message_tenant"]) {
      expect(events.find((e) => e.tool === tool)!.engine).toBe("ai");
    }
  });

  it("checks three quotes", () => {
    expect(events.filter((e) => e.tool === "check_quote")).toHaveLength(3);
  });

  it("does not spend or book anything until the owner taps", () => {
    expect(index("owner_approval")).toBeGreaterThan(-1);
    expect(index("book_vendor")).toBeGreaterThan(index("owner_approval"));
    const before = events.slice(0, index("owner_approval"));
    expect(before.some((e) => e.tool === "book_vendor")).toBe(false);
    expect(events.find((e) => e.tool === "request_quotes")!.detail).toMatch(/No money committed/);
    expect(events.find((e) => e.tool === "owner_approval")!.engine).toBe("human");
  });

  it("caps spending when it books", () => {
    expect(events.find((e) => e.tool === "book_vendor")!.detail).toMatch(/capped at \$2,695/);
  });

  it("keeps the owner asleep until the decision is ready", () => {
    const wake = leak.steps.findIndex((s) => s.id === "owner-wakes");
    leak.steps.slice(0, wake).forEach((s) => expect(s.ownerAsleep).toBe(true));
    leak.steps.slice(wake).forEach((s) => expect(s.ownerAsleep).toBe(false));
  });

  it("updates the record from the installer at the end, with no photo or typing", () => {
    const last = leak.steps[leak.steps.length - 1];
    expect(last.agent[0].detail).toMatch(/No photo, no typing/);
    expect(last.owner[0].text).toContain("26J0007-A");
  });

  it("gets the owner from a 4 AM text to one tap with minimal owner time", () => {
    const stats = statsFor(leak);
    expect(stats.tenantWaitMinutes).toBe(1);
    expect(stats.ownerTaps).toBe(1);
    expect(stats.ownerMinutes).toBe(1);
    expect(stats.saved).toBe(400);
    expect(stats.quotesChecked).toBe(3);
  });
});

describe("gas scenario: an emergency skips the steps and calls the owner", () => {
  const events = gas.steps.flatMap((s) => s.agent);

  it("fires the emergency rule and gives only get-out advice", () => {
    expect(events[0].tool).toBe("check_emergency_rules");
    expect(events[0].detail).toMatch(/No fix steps are given/);
    const advice = gas.steps.flatMap((s) => s.tenant).find((t) => t.kind === "steps")!;
    expect(advice.urgency).toBe("emergency");
    expect(advice.steps!.join(" ").toLowerCase()).toContain("leave the home");
    expect(advice.steps!.join(" ").toLowerCase()).not.toMatch(/valve|pilot|relight/);
  });

  it("calls the owner instead of sending a quiet message", () => {
    const owner = gas.steps.flatMap((s) => s.owner);
    expect(owner[0].kind).toBe("call");
    expect(events.some((e) => e.tool === "call_owner")).toBe(true);
  });

  it("books no vendor and requests no quotes until the home is cleared", () => {
    expect(events.some((e) => ["book_vendor", "request_quotes"].includes(e.tool))).toBe(false);
    expect(events.some((e) => e.tool === "hold_repair_workflow")).toBe(true);
  });
});

describe("sceneAt", () => {
  it("accumulates what has happened so far", () => {
    const early = sceneAt(leak, 0);
    expect(early.tenant).toHaveLength(2);
    expect(early.agent).toHaveLength(0);
    const later = sceneAt(leak, 5);
    expect(later.tenant.length).toBeGreaterThan(early.tenant.length);
    expect(later.agent.length).toBeGreaterThan(0);
  });

  it("clamps out of range steps and flags the last one as done", () => {
    expect(sceneAt(leak, -5).index).toBe(0);
    const end = sceneAt(leak, 999);
    expect(end.index).toBe(leak.steps.length - 1);
    expect(end.done).toBe(true);
    expect(sceneAt(leak, 0).done).toBe(false);
  });

  it("returns the events for named steps", () => {
    const events = agentEventsFor(leak, ["check-quotes"]);
    expect(events.map((e) => e.tool)).toEqual(["check_quote", "check_quote", "check_quote", "recommend_vendor"]);
  });
});
