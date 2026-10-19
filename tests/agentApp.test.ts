import { describe, expect, it } from "vitest";
import { advanceTo, createWorld, nextTimerAt, openOwnerMessage, send } from "../lib/agents/engine";
import { stampReveal } from "../lib/agents/pacing";
import { isoMonthFromText, recordFromValues } from "../lib/agents/record";
import { syncFromWorld } from "../lib/agents/sync";
import { sampleRepairEvents } from "../lib/agents/useAgent";
import type { Ev, Msg, World } from "../lib/agents/types";
import { classifyTenantText } from "../lib/houseQa";
import { INITIAL_STATE } from "../lib/seed";

const run = (w: World, events: Ev[]) => events.reduce((acc, ev) => send(acc, ev), w);
const msgs = (w: World, party: Msg["party"]) => w.timeline.filter((e): e is Msg => e.kind === "msg" && e.party === party && e.dir === "out");
const lastText = (w: World, party: Msg["party"]) => msgs(w, party).at(-1)?.text ?? "";

describe("tenant texts: a question is answered from the record, a problem starts a case", () => {
  it("classifies texts", () => {
    expect(classifyTenantText("How old is the water heater?")).toBe("question");
    expect(classifyTenantText("Can I have a dog?")).toBe("question");
    expect(classifyTenantText("Why is my water heater leaking?")).toBe("problem");
    expect(classifyTenantText("water heater is leaking all over the garage")).toBe("problem");
    expect(classifyTenantText("The toilet is clogged")).toBe("problem");
    expect(classifyTenantText("my sink")).toBe("problem");
  });

  it("answers a question without starting a repair", () => {
    const w = send(createWorld(), { type: "tenant.text", text: "How much is my rent?" });
    expect(w.triage.stage).toBe("idle");
    expect(lastText(w, "tenant")).toContain("$3,200");
    expect(msgs(w, "owner")).toHaveLength(0);
  });

  it("says it does not know, and can pass the question to the owner", () => {
    let w = send(createWorld(), { type: "tenant.text", text: "Can I have a dog?" });
    const reply = msgs(w, "tenant").at(-1)!;
    expect(reply.text).toMatch(/I don't know/);
    expect(reply.actions?.[0].text).toMatch(/^Please ask/);
    w = send(w, { type: "tenant.text", text: reply.actions![0].text! });
    expect(lastText(w, "tenant")).toMatch(/Sent/);
    expect(lastText(w, "owner")).toContain("Can I have a dog?");
    expect(msgs(w, "owner").at(-1)?.silent).toBe(true);
  });

  it("answers about the water heater from the label photo, once it is read", () => {
    let w = run(createWorld(), sampleRepairEvents());
    w = send(w, { type: "tenant.text", text: "What model is my water heater?" });
    expect(lastText(w, "tenant")).toContain("HL-40G-NG");
  });

  it("still treats a problem as a repair", () => {
    const w = send(createWorld(), { type: "tenant.text", text: "water heater is leaking all over the garage" });
    expect(w.triage.stage).toBe("asked_electrical");
  });
});

describe("text updates to both people", () => {
  const afterQuotes = () => {
    const w = run(createWorld(), sampleRepairEvents());
    return advanceTo(w, nextTimerAt(w)!);
  };

  it("tells the tenant when the quotes are in, without a price", () => {
    const w = afterQuotes();
    expect(lastText(w, "tenant")).toMatch(/landlord is choosing/);
    expect(lastText(w, "tenant")).not.toMatch(/\$/);
  });

  it("texts both people when rent is paid, and nothing when it is undone", () => {
    let w = send(createWorld(), { type: "rent.paid", paid: true });
    expect(lastText(w, "tenant")).toMatch(/marked paid/);
    expect(lastText(w, "owner")).toMatch(/paid October 2026 rent/);
    const count = w.timeline.length;
    w = send(w, { type: "rent.paid", paid: false });
    expect(w.timeline).toHaveLength(count);
    expect(w.rentPaid).toBe(false);
  });

  it("answers a rent question using the paid status", () => {
    let w = send(createWorld(), { type: "rent.paid", paid: true });
    w = send(w, { type: "tenant.text", text: "Did my rent payment go through?" });
    expect(lastText(w, "tenant")).toMatch(/marked paid/);
  });

  it("books the vendor the owner picked by hand, and tells the tenant that one", () => {
    let w = afterQuotes();
    w = send(w, { type: "owner.choose", vendorId: "bayside", notToExceed: 3135, accessWindow: "Tomorrow, 1:00 to 3:00 PM" });
    w = send(w, { type: "owner.tap", msgId: openOwnerMessage(w)!.id, action: "approve" });
    expect(lastText(w, "tenant")).toContain("Bayside Plumbing and Heating");
    expect(lastText(w, "tenant")).toContain("1:00 to 3:00 PM");
    expect(lastText(w, "owner")).toContain("$3,135");
  });

  it("finishes a booked job when the owner taps Mark done, and updates the record", () => {
    let w = afterQuotes();
    w = send(w, { type: "owner.tap", msgId: openOwnerMessage(w)!.id, action: "approve" });
    expect(w.triage.stage).toBe("booked");
    w = send(w, { type: "owner.markDone" });
    expect(w.triage.stage).toBe("done");
    expect(lastText(w, "tenant")).toMatch(/All fixed/);
    expect(w.pending.find((p) => p.id === "job_done")).toBeUndefined();
  });

  it("ignores Mark done before a job is booked", () => {
    const w = afterQuotes();
    expect(send(w, { type: "owner.markDone" }).triage.stage).toBe("decision_sent");
  });

  it("gives the owner's decision as a card with a price, a limit, and a saving", () => {
    const card = openOwnerMessage(afterQuotes())!.card!;
    expect(card.kind).toBe("decision");
    expect(card.title).toContain("Willow Glen");
    expect(card.facts.map((f) => f.value).join(" ")).toMatch(/\$2,450.*\$2,695.*\$400/);
  });

  it("offers the picture guide for the exact heater under the first safety message", () => {
    const w = run(createWorld(), [
      { type: "tenant.text", text: "water heater is leaking" },
      { type: "tenant.text", text: "2" },
    ]);
    const steps = msgs(w, "tenant").at(-1)!;
    expect(steps.guide).toBe("heater-water-off");
    expect(steps.text).toMatch(/never touch the gas valve/);
  });
});

describe("keeping the detail screens in step with the agent", () => {
  it("copies the home record, then the booking, then the finish into the app state", () => {
    let state = INITIAL_STATE;
    let world = state.agent;
    for (const ev of sampleRepairEvents()) {
      const next = send(world, ev);
      state = { ...state, agent: next, ...syncFromWorld(state, world, next, ev, "2026-10-14T09:00:00Z") };
      world = next;
    }
    expect(state.request?.description).toMatch(/water heater is leaking/);
    expect(state.triage?.category).toBe("Plumbing");
    expect(state.houseRecord?.model).toBe("HL-40G-NG");
    expect(state.houseRecord?.unconfirmed).toEqual([]);
    expect(state.approval).toBeNull();

    const quoted = advanceTo(world, nextTimerAt(world)!);
    const tapped = send(quoted, { type: "owner.tap", msgId: openOwnerMessage(quoted)!.id, action: "approve" });
    state = { ...state, agent: tapped, ...syncFromWorld(state, quoted, tapped, { type: "owner.tap", msgId: "x", action: "approve" }, "2026-10-14T09:05:00Z") };
    expect(state.approval?.vendorId).toBe("willow-glen");
    expect(state.approval?.notToExceed).toBe(2695);
    expect(state.jobCompletedAt).toBeNull();

    const done = send(tapped, { type: "owner.markDone" });
    state = { ...state, agent: done, ...syncFromWorld(state, tapped, done, { type: "owner.markDone" }, "2026-10-15T11:20:00Z") };
    expect(state.jobCompletedAt).toBe("2026-10-15T11:20:00Z");
    expect(state.houseRecord?.model).toBe("HL-40G-NG");
  });

  it("starts a fresh request when a new problem is reported, and does not for a question", () => {
    const w0 = createWorld();
    const q = send(w0, { type: "tenant.text", text: "How much is my rent?" });
    expect(syncFromWorld(INITIAL_STATE, w0, q, { type: "tenant.text", text: "How much is my rent?" }, "t").request).toBeUndefined();
    const p = send(w0, { type: "tenant.text", text: "The toilet is clogged and overflowing" });
    const patch = syncFromWorld(INITIAL_STATE, w0, p, { type: "tenant.text", text: "The toilet is clogged and overflowing" }, "t");
    expect(patch.request?.description).toMatch(/toilet/);
    expect(patch.triage?.category).toBe("Plumbing");
  });
});

describe("the house record values", () => {
  it("turns the agent's text values into a record, or null while the brand is unknown", () => {
    expect(recordFromValues({ "heater.brand": "Not on file" })).toBeNull();
    const r = recordFromValues({
      "heater.brand": "Hearthline",
      "heater.model": "HL-40G-NG",
      "heater.serial": "15C0412-X (please confirm)",
      "heater.size": "40 gallons",
      "heater.fuel": "Natural gas",
      "heater.made": "March 2015",
      "heater.age": "11 years",
      "heater.source": "Read from a label photo sent by the tenant",
    })!;
    expect(r).toMatchObject({ serial: "15C0412-X", capacityGallons: 40, manufactureDate: "2015-03", ageYears: 11, unconfirmed: ["serial"] });
    expect(isoMonthFromText("September 2026")).toBe("2026-09");
    expect(isoMonthFromText("nonsense")).toBe("");
  });
});

describe("pacing", () => {
  it("gives new entries increasing reveal times and leaves old ones alone", () => {
    let w = send(createWorld(), { type: "tenant.text", text: "water heater is leaking" });
    w = stampReveal(w, 0, 1000);
    const times = w.timeline.map((e) => e.revealAt!);
    for (let i = 1; i < times.length; i++) expect(times[i]).toBeGreaterThan(times[i - 1]);
    const before = w.timeline.length;
    const old = times.slice();
    w = stampReveal(send(w, { type: "tenant.text", text: "2" }), before, 500);
    expect(w.timeline.slice(0, before).map((e) => e.revealAt)).toEqual(old);
    expect(w.timeline[before].revealAt!).toBeGreaterThan(old[old.length - 1]);
  });
});
