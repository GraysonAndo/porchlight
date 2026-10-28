import { describe, expect, it } from "vitest";
import { send } from "../lib/agents/engine";
import { normalizeState, normalizeWorld } from "../lib/persist";
import { INITIAL_STATE } from "../lib/seed";

describe("normalizeState: whatever was saved, the app starts sound", () => {
  it("starts clean from anything that is not a saved state", () => {
    for (const bad of [null, undefined, 5, "text", [], true]) expect(normalizeState(bad)).toBe(INITIAL_STATE);
  });

  it("keeps good saved data", () => {
    const s = normalizeState({ ...INITIAL_STATE, rentPaidAt: "2026-10-05T10:00:00Z", prefs: { ...INITIAL_STATE.prefs, ownerAutoApprove: 500 } });
    expect(s.rentPaidAt).toBe("2026-10-05T10:00:00Z");
    expect(s.prefs.ownerAutoApprove).toBe(500);
  });

  it("fills in the parts an older version left out, so the agent can still run", () => {
    const s = normalizeState({ agent: { timeline: [], clock: 300 } });
    expect(s.agent.triage.stage).toBe("idle");
    expect(s.agent.sentinel.stage).toBe("idle");
    expect(s.agent.quote.stage).toBe("idle");
    expect(s.agent.stats.ownerTaps).toBe(0);
    expect(s.agent.pending).toEqual([]);
    expect(s.agent.clock).toBe(300);
    // The agent keeps working on it.
    const after = send(s.agent, { type: "tenant.text", text: "water heater is leaking" });
    expect(after.triage.stage).toBe("asked_electrical");
  });

  it("drops broken entries and timers instead of crashing on them", () => {
    const w = normalizeWorld({ timeline: [{ kind: "msg", id: "a", at: 1, party: "tenant", dir: "in", text: "hi" }, null, { nope: 1 }, "x", { kind: "tool", id: "b", at: "late" }], pending: [{ at: 5, id: "quotes_in" }, { at: "x" }, null] });
    expect(w.timeline).toHaveLength(1);
    expect(w.pending).toHaveLength(1);
  });

  it("puts a setting of the wrong type back to its default", () => {
    const s = normalizeState({ prefs: { ownerAutoApprove: "lots", ownerEmail: "yes", tenantAutopay: 1, ownerPhone: 5 } });
    expect(s.prefs.ownerAutoApprove).toBe(0);
    expect(s.prefs.ownerEmail).toBe(INITIAL_STATE.prefs.ownerEmail);
    expect(s.prefs.tenantAutopay).toBe(false);
    expect(s.prefs.ownerPhone).toBe(INITIAL_STATE.prefs.ownerPhone);
    expect(normalizeState({ prefs: { ownerAutoApprove: -50 } }).prefs.ownerAutoApprove).toBe(0);
  });

  it("ignores a request that is not shaped like one, and lists that are not lists", () => {
    const s = normalizeState({ request: { description: 5 }, payments: "none", feedback: {}, guideProgress: [], equipmentEdits: 3, extraEquipment: null });
    expect(s.request).toBeNull();
    expect(s.payments).toEqual([]);
    expect(s.feedback).toEqual([]);
    expect(s.guideProgress).toEqual({});
    expect(s.equipmentEdits).toEqual({});
    expect(s.extraEquipment).toEqual([]);
  });
});
