import { describe, expect, it } from "vitest";
import { advanceTo, createWorld, nextTimerAt, openOwnerMessage, send } from "../lib/agents/engine";
import { flowPromptFor } from "../lib/agents/prompts";
import type { Ev, World } from "../lib/agents/types";

const run = (w: World, evs: Ev[]) => evs.reduce((acc, ev) => send(acc, ev), w);
const LEAK: Ev = { type: "tenant.text", text: "water heater is leaking all over the garage" };

/** Plays a prompt's call to action, as the button would. */
function tap(w: World, role: "tenant" | "owner"): World {
  const p = flowPromptFor(role, w);
  if (!p || !p.cta || !("events" in p.cta)) throw new Error("no action to tap");
  return run(w, p.cta.events);
}

describe("live preview prompts", () => {
  it("lets an owner with nothing to do start a tenant report, so one person can see both sides", () => {
    const p = flowPromptFor("owner", createWorld())!;
    expect(p.cta).toMatchObject({ label: expect.stringMatching(/Act as the tenant/) });
    const w = tap(createWorld(), "owner");
    expect(w.triage.stage).toBe("asked_electrical");
  });

  it("walks the whole repair from either side, one tap at a time, until the job is done", () => {
    let w = createWorld();
    w = tap(w, "owner"); // the tenant reports the leak
    w = tap(w, "owner"); // the tenant answers the safety question
    expect(w.triage.stage).toBe("quotes_pending"); // GoHome does not wait for the steps to be finished
    w = advanceTo(w, nextTimerAt(w)!);
    expect(w.triage.stage).toBe("decision_sent");
    w = tap(w, "tenant"); // acting as the owner, from the tenant's screen
    expect(w.triage.stage).toBe("booked");
    w = tap(w, "owner"); // acting as the tenant
    expect(w.triage.tenantConfirmed).toBe(true);
    w = tap(w, "tenant"); // the plumber finishes
    expect(w.triage.stage).toBe("done");
  });

  it("shows each person what the other one sees right now", () => {
    const w = run(createWorld(), [LEAK, { type: "tenant.text", text: "2" }]);
    const ownerSide = flowPromptFor("tenant", w)!;
    expect(ownerSide.preview?.who).toBe("The owner sees");
    expect(ownerSide.preview?.text).toMatch(/Water heater leak/);
    const quoted = advanceTo(w, nextTimerAt(w)!);
    const tenantSide = flowPromptFor("owner", quoted)!;
    expect(tenantSide.preview?.who).toBe("The tenant sees");
    expect(tenantSide.preview?.text).toMatch(/choosing a plumber/i);
  });

  it("answers an emergency from the tenant's screen by letting them act as the owner", () => {
    const w = send(createWorld(), { type: "tenant.text", text: "I smell gas" });
    const p = flowPromptFor("tenant", w)!;
    expect(p.title).toMatch(/phone is ringing/);
    expect(openOwnerMessage(w)).not.toBeNull();
    expect(tap(w, "tenant").triage.ownerAcked).toBe(true);
    expect(flowPromptFor("tenant", tap(w, "tenant"))).toBeNull();
  });

  it("changes its key when the situation changes, so a dismissed prompt returns for the next step", () => {
    const a = run(createWorld(), [LEAK]);
    const b = run(a, [{ type: "tenant.text", text: "2" }]);
    expect(flowPromptFor("owner", a)!.key).not.toBe(flowPromptFor("owner", b)!.key);
  });

  it("points a tenant to the pay page once the job is done and rent is unpaid", () => {
    let w = createWorld();
    for (let i = 0; i < 2; i++) w = tap(w, "owner");
    w = advanceTo(w, nextTimerAt(w)!);
    w = tap(w, "tenant");
    w = tap(w, "owner");
    w = tap(w, "tenant");
    const p = flowPromptFor("tenant", w)!;
    expect(p.cta).toMatchObject({ href: "/tenant/pay" });
    expect(flowPromptFor("tenant", send(w, { type: "rent.paid", paid: true }))).toBeNull();
  });

  it("offers a contractor quote, then the lease check, once the repair is finished", () => {
    let w = createWorld();
    for (let i = 0; i < 2; i++) w = tap(w, "owner");
    w = advanceTo(w, nextTimerAt(w)!);
    w = tap(w, "tenant");
    w = tap(w, "owner");
    w = tap(w, "tenant");
    expect(flowPromptFor("owner", w)!.cta).toMatchObject({ label: expect.stringMatching(/contractor/) });
    w = tap(w, "owner");
    expect(flowPromptFor("owner", w)!.cta).toMatchObject({ label: expect.stringMatching(/lease check/) });
    w = tap(w, "owner");
    expect(flowPromptFor("owner", w)).toBeNull();
  });
});
