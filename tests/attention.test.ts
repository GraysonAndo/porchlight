import { describe, expect, it } from "vitest";
import { attentionFor } from "../lib/attention";
import { createWorld, advanceTo, nextTimerAt, send } from "../lib/agents/engine";

const run = (events: Parameters<typeof send>[1][]) => events.reduce((w, ev) => send(w, ev), createWorld());

describe("attentionFor", () => {
  it("is nothing for a fresh home with rent paid", () => {
    expect(attentionFor(createWorld(), { lateRent: false })).toEqual({ owner: 0, tenant: 0 });
  });

  it("counts late rent for the owner", () => {
    expect(attentionFor(createWorld(), { lateRent: true }).owner).toBe(1);
  });

  it("asks the tenant the safety question, then nothing while GoHome works", () => {
    const asked = run([{ type: "tenant.text", text: "water heater is leaking" }]);
    expect(attentionFor(asked, { lateRent: false }).tenant).toBe(1);
    const working = send(asked, { type: "tenant.text", text: "2" });
    expect(attentionFor(working, { lateRent: false }).tenant).toBe(0);
  });

  it("shows the owner the plan to approve, and clears it once approved; then asks the tenant to confirm the time", () => {
    let w = run([{ type: "tenant.text", text: "water heater is leaking" }, { type: "tenant.text", text: "2" }]);
    w = advanceTo(w, nextTimerAt(w)!);
    expect(attentionFor(w, { lateRent: false, now: Number.MAX_SAFE_INTEGER }).owner).toBe(1);
    const card = w.timeline.filter((e) => e.kind === "msg" && e.party === "owner" && e.actions && !e.usedAction).at(-1)!;
    w = send(w, { type: "owner.tap", msgId: card.id, action: "approve" });
    const a = attentionFor(w, { lateRent: false, now: Number.MAX_SAFE_INTEGER });
    expect(a.owner).toBe(0);
    expect(a.tenant).toBe(1);
    w = send(w, { type: "tenant.text", text: "1" });
    expect(attentionFor(w, { lateRent: false, now: Number.MAX_SAFE_INTEGER }).tenant).toBe(0);
  });

  it("does not count a message that has not appeared yet", () => {
    let w = run([{ type: "tenant.text", text: "water heater is leaking" }, { type: "tenant.text", text: "2" }]);
    w = advanceTo(w, nextTimerAt(w)!);
    // The app gives each new message a time it appears. One that is still in the future is not waiting on anyone yet.
    const later = { ...w, timeline: w.timeline.map((e) => (e.kind === "msg" && e.party === "owner" ? { ...e, revealAt: 5_000 } : e)) };
    expect(attentionFor(later, { lateRent: false, now: 1_000 }).owner).toBe(0);
    expect(attentionFor(later, { lateRent: false, now: 6_000 }).owner).toBe(1);
  });
});
