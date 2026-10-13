import { describe, expect, it } from "vitest";
import { autopilotNext } from "../lib/agents/autopilot";
import {
  START_CLOCK,
  advanceTo,
  clockText,
  countByEngine,
  createWorld,
  isQuietHours,
  nextTimerAt,
  openOwnerMessage,
  recordAt,
  send,
} from "../lib/agents/engine";
import type { Ev, Msg, World } from "../lib/agents/types";

function run(w: World, events: Ev[]): World {
  return events.reduce((acc, ev) => send(acc, ev), w);
}

/** Let the autopilot play until it has nothing left to do. */
function autoplay(start: World = createWorld(), maxSteps = 80): World {
  let w = start;
  for (let i = 0; i < maxSteps; i++) {
    const step = autopilotNext(w);
    if (!step) break;
    if ("jump" in step) {
      const t = nextTimerAt(w);
      if (t === null) break;
      w = advanceTo(w, t);
    } else {
      w = send(w, step.ev);
    }
  }
  return w;
}

const msgs = (w: World) => w.timeline.filter((e): e is Msg => e.kind === "msg");
const toolNames = (w: World) => w.timeline.flatMap((e) => (e.kind === "tool" ? [e.tool] : []));
const textFor = (w: World, party: Msg["party"], dir: Msg["dir"] = "out") =>
  msgs(w)
    .filter((m) => m.party === party && m.dir === dir)
    .map((m) => m.text)
    .join("\n");

const LEAK: Ev = { type: "tenant.text", text: "water heater is leaking all over the garage" };

describe("the full story with the autopilot", () => {
  const w = autoplay();

  it("runs all three loops to the end", () => {
    expect(w.triage.stage).toBe("done");
    expect(w.quote.stage).toBe("settled");
    expect(w.sentinel.stage).toBe("delivered");
  });

  it("never shows the tenant a price", () => {
    expect(textFor(w, "tenant")).not.toMatch(/\$|\bquote/i);
  });

  it("asks the owner for exactly one tap per decision: 3 taps in total", () => {
    // approve the plan, send the counter, accept the counter, mail the notice
    expect(w.stats.ownerTaps).toBe(4);
    expect(w.stats.saved).toBe(400);
  });

  it("writes the new heater into the house record without anyone typing it", () => {
    const rec = recordAt(w.timeline, w.timeline.length);
    expect(rec.values["heater.serial"]).toBe("26J0007-A");
    expect(rec.values["heater.age"]).toBe("Brand new");
    expect(rec.values["heater.source"]).toMatch(/installer/i);
    expect(rec.history.length).toBeGreaterThanOrEqual(4);
  });

  it("uses all four kinds of work, and mostly plain code for decisions", () => {
    const counts = countByEngine(w.timeline, w.timeline.length);
    expect(counts.ai).toBeGreaterThan(0);
    expect(counts.code).toBeGreaterThan(counts.ai);
    expect(counts.action).toBeGreaterThan(0);
    expect(counts.human).toBeGreaterThanOrEqual(4);
  });

  it("is deterministic: the same events give the same timeline", () => {
    expect(JSON.stringify(autoplay().timeline)).toBe(JSON.stringify(w.timeline));
  });

  it("keeps the clock moving forward", () => {
    const times = w.timeline.map((e) => e.at);
    for (let i = 1; i < times.length; i++) expect(times[i]).toBeGreaterThanOrEqual(times[i - 1]);
  });
});

describe("loop 1: the 4 AM triage and dispatch", () => {
  it("starts at 4:07 AM and asks the safety question first", () => {
    const w = send(createWorld(), LEAK);
    expect(clockText(START_CLOCK)).toBe("4:07 AM");
    expect(w.triage.stage).toBe("asked_electrical");
    expect(textFor(w, "tenant")).toMatch(/near an outlet/);
    expect(toolNames(w)).toEqual(["emergency_rules", "lookup_house_record"]);
  });

  it("sends the owner a silent heads-up, not a call, for an urgent leak", () => {
    const w = run(createWorld(), [LEAK, { type: "tenant.text", text: "2" }]);
    const heads = msgs(w).filter((m) => m.party === "owner");
    expect(heads).toHaveLength(1);
    expect(heads[0].silent).toBe(true);
    expect(heads[0].channel).toBe("sms");
  });

  it("treats water near electricity as an emergency: call, no fix steps, no quotes", () => {
    const w = run(createWorld(), [LEAK, { type: "tenant.text", text: "1" }]);
    expect(w.triage.stage).toBe("emergency");
    expect(msgs(w).some((m) => m.party === "owner" && m.channel === "call")).toBe(true);
    expect(toolNames(w)).toContain("skip_fix_steps");
    expect(toolNames(w)).not.toContain("request_quotes");
  });

  it("treats a gas smell as an emergency from the first text, with no photo request", () => {
    const w = send(createWorld(), { type: "tenant.text", text: "I smell gas near the water heater" });
    expect(w.triage.stage).toBe("emergency");
    expect(textFor(w, "tenant")).toMatch(/911/);
    expect(toolNames(w)).not.toContain("request_label_photo");
    expect(toolNames(w)).not.toContain("request_quotes");
    expect(msgs(w).some((m) => m.party === "owner" && m.channel === "call")).toBe(true);
    expect(w.pending).toHaveLength(0);
  });

  it("lets a gas smell interrupt a case that is already in progress", () => {
    const w = run(createWorld(), [LEAK, { type: "tenant.text", text: "2" }, { type: "tenant.text", text: "now I smell gas" }]);
    expect(w.triage.stage).toBe("emergency");
  });

  it("relays the owner's acknowledgement to the tenant", () => {
    let w = send(createWorld(), { type: "tenant.text", text: "I smell gas" });
    const open = openOwnerMessage(w);
    expect(open?.actions?.[0].id).toBe("ack");
    w = send(w, { type: "owner.tap", msgId: open!.id, action: "ack" });
    expect(w.triage.ownerAcked).toBe(true);
    expect(textFor(w, "tenant")).toMatch(/on it/i);
  });

  it("asks for a clearer photo when the first one is blurry, then offers to skip", () => {
    const base = run(createWorld(), [LEAK, { type: "tenant.text", text: "2" }, { type: "tenant.text", text: "done" }]);
    expect(base.triage.stage).toBe("asked_photo");
    const one = send(base, { type: "tenant.photo", photo: "blurry" });
    expect(textFor(one, "tenant")).toMatch(/too blurry/);
    expect(one.triage.stage).toBe("asked_photo");
    expect(recordAt(one.timeline, one.timeline.length).values["heater.brand"]).toBe("Not on file");
    const two = send(one, { type: "tenant.photo", photo: "blurry" });
    expect(two.timeline.at(-1)).toMatchObject({ kind: "msg", actions: [{ id: "skip" }] });
  });

  it("carries on without the label when the tenant cannot reach it, and says the age is an estimate", () => {
    const base = run(createWorld(), [LEAK, { type: "tenant.text", text: "2" }, { type: "tenant.text", text: "done" }, { type: "tenant.text", text: "skip" }]);
    expect(base.triage.labelSkipped).toBe(true);
    expect(base.triage.stage).toBe("quotes_pending");
    expect(textFor(base, "owner")).toMatch(/estimate/);
    expect(recordAt(base.timeline, base.timeline.length).values["heater.brand"]).toBe("Not on file");
  });

  it("asks the tenant to confirm the serial it read with low confidence", () => {
    const w = run(createWorld(), [LEAK, { type: "tenant.text", text: "2" }, { type: "tenant.text", text: "done" }, { type: "tenant.photo", photo: "label" }]);
    expect(w.triage.stage).toBe("confirm_serial");
    const rec = recordAt(w.timeline, w.timeline.length);
    expect(rec.values["heater.model"]).toBe("HL-40G-NG");
    expect(rec.values["heater.serial"]).toMatch(/please confirm/);
    const typed = send(w, { type: "tenant.text", text: "15c0412-z" });
    expect(recordAt(typed.timeline, typed.timeline.length).values["heater.serial"]).toBe("15C0412-Z");
  });

  it("answers HELP with a hand-written guide", () => {
    const w = run(createWorld(), [LEAK, { type: "tenant.text", text: "2" }, { type: "tenant.text", text: "help" }]);
    expect(w.triage.stage).toBe("steps_given");
    expect(toolNames(w)).toContain("send_guide");
  });

  it("answers a different, ordinary problem with a short triage and a quiet heads-up", () => {
    const w = send(createWorld(), { type: "tenant.text", text: "The toilet is clogged" });
    expect(w.triage.stage).toBe("closed");
    expect(msgs(w).filter((m) => m.party === "owner")[0].silent).toBe(true);
    expect(toolNames(w)).not.toContain("request_quotes");
  });

  it("calls the owner for no heat, with no fix steps", () => {
    const w = send(createWorld(), { type: "tenant.text", text: "We have no heat and it is freezing" });
    expect(msgs(w).some((m) => m.party === "owner" && m.channel === "call")).toBe(true);
    expect(toolNames(w)).toContain("skip_fix_steps");
  });
});

describe("the decision card and the approval gate", () => {
  const ready = () => {
    let w = createWorld();
    w = run(w, [LEAK, { type: "tenant.text", text: "2" }, { type: "tenant.text", text: "done" }, { type: "tenant.photo", photo: "label" }, { type: "tenant.text", text: "Y" }]);
    return advanceTo(w, nextTimerAt(w)!);
  };

  it("arrives 88 minutes after dispatch with the plan, the limit, and the saving", () => {
    const w = ready();
    expect(w.triage.stage).toBe("decision_sent");
    const card = openOwnerMessage(w)!;
    expect(card.text).toMatch(/DECISION NEEDED: replace/);
    expect(card.text).toContain("$2,450");
    expect(card.text).toContain("$2,695");
    expect(card.text).toContain("$400");
    expect(card.text).toMatch(/Bayside Plumbing\s+\$2,850\s+slightly high/);
    expect(card.text).toMatch(/A1 Rapid\s+\$2,100.*no license shown, no permit line/);
    expect(card.actions?.map((a) => a.id)).toEqual(["approve", "others", "call"]);
    expect(clockText(card.at)).toMatch(/^5:\d\d AM$/);
  });

  it("books nobody and sends no third party anything until the owner taps", () => {
    const w = ready();
    expect(msgs(w).filter((m) => m.party === "contractor")).toHaveLength(0);
    expect(toolNames(w)).not.toContain("book_vendor");
    expect(toolNames(w)).not.toContain("approval_gate");
  });

  it("books after one tap, and the gate entry comes before the booking", () => {
    let w = ready();
    const card = openOwnerMessage(w)!;
    w = send(w, { type: "owner.tap", msgId: card.id, action: "approve" });
    const names = toolNames(w);
    expect(names.indexOf("approval_gate")).toBeGreaterThan(-1);
    expect(names.indexOf("approval_gate")).toBeLessThan(names.indexOf("book_vendor"));
    expect(w.triage.stage).toBe("booked");
    expect(textFor(w, "contractor")).toContain("Not-to-exceed $2,695");
  });

  it("ignores a second tap on the same card", () => {
    let w = ready();
    const card = openOwnerMessage(w)!;
    w = send(w, { type: "owner.tap", msgId: card.id, action: "approve" });
    const count = w.timeline.length;
    w = send(w, { type: "owner.tap", msgId: card.id, action: "approve" });
    expect(w.timeline).toHaveLength(count);
    expect(w.stats.ownerTaps).toBe(1);
  });

  it("accepts a typed 1 as the same thing as the Approve button", () => {
    let w = ready();
    w = send(w, { type: "owner.text", text: "1" });
    expect(w.triage.stage).toBe("booked");
  });

  it("nudges the owner by text and call after 45 minutes of silence, without booking", () => {
    let w = ready();
    w = advanceTo(w, w.clock + 45);
    expect(toolNames(w)).toContain("nudge_owner");
    expect(msgs(w).filter((m) => m.party === "owner" && m.channel === "call")).toHaveLength(1);
    expect(w.triage.stage).toBe("decision_sent");
    expect(toolNames(w)).not.toContain("book_vendor");
  });

  it("does not nudge once the owner has approved", () => {
    let w = ready();
    w = send(w, { type: "owner.tap", msgId: openOwnerMessage(w)!.id, action: "approve" });
    w = advanceTo(w, w.clock + 120);
    expect(toolNames(w)).not.toContain("nudge_owner");
  });

  it("shows the other quotes on request", () => {
    let w = ready();
    w = send(w, { type: "owner.tap", msgId: openOwnerMessage(w)!.id, action: "others" });
    expect(textFor(w, "owner")).toMatch(/Bayside Plumbing and Heating: \$2,850/);
    expect(w.triage.stage).toBe("decision_sent");
  });

  it("lets the tenant ask for a different time after booking", () => {
    let w = ready();
    w = send(w, { type: "owner.tap", msgId: openOwnerMessage(w)!.id, action: "approve" });
    w = send(w, { type: "tenant.text", text: "2" });
    expect(toolNames(w)).toContain("request_new_time");
  });
});

describe("loop 2: the quote audit and counter-negotiation", () => {
  const audited = () => send(createWorld(), { type: "contractor.quote" });

  it("reads the quote and flags the labor line in dollars per hour", () => {
    const w = audited();
    const card = openOwnerMessage(w)!;
    expect(card.text).toContain("$3,170");
    expect(card.text).toMatch(/22% above the top/);
    expect(card.text).toMatch(/\$230 an hour for 7 hours/);
    expect(card.attachment?.body).toMatch(/labor breakdown/);
    expect(card.actions?.map((a) => a.id)).toEqual(["qsend", "qedit", "qskip"]);
  });

  it("sends nothing to the contractor until the owner says so", () => {
    const w = audited();
    expect(msgs(w).filter((m) => m.party === "contractor" && m.dir === "out")).toHaveLength(0);
    expect(toolNames(w)).not.toContain("send_email");
  });

  it("sends the approved draft word for word", () => {
    let w = audited();
    const draft = openOwnerMessage(w)!.attachment!.body;
    w = send(w, { type: "owner.tap", msgId: openOwnerMessage(w)!.id, action: "qsend" });
    const out = msgs(w).filter((m) => m.party === "contractor" && m.dir === "out");
    expect(out).toHaveLength(1);
    expect(out[0].text).toBe(draft);
    expect(w.quote.stage).toBe("sent");
  });

  it("redrafts firmer when the owner asks", () => {
    let w = audited();
    w = send(w, { type: "owner.tap", msgId: openOwnerMessage(w)!.id, action: "qedit" });
    w = send(w, { type: "owner.text", text: "make it firmer" });
    const open = openOwnerMessage(w)!;
    expect(open.attachment?.body).toMatch(/can only approve a total at or under \$2,600/);
    expect(w.quote.stage).toBe("awaiting_owner");
  });

  it("re-checks a counter: $2,650 is still above the range, $2,550 is fair", () => {
    const sent = (() => {
      const w = audited();
      return send(w, { type: "owner.tap", msgId: openOwnerMessage(w)!.id, action: "qsend" });
    })();
    const high = send(sent, { type: "contractor.counter", total: 2650 });
    expect(openOwnerMessage(high)!.text).toMatch(/still slightly high/);
    expect(openOwnerMessage(high)!.actions?.map((a) => a.id)).toEqual(["qrecounter", "qhold"]);
    const fair = send(sent, { type: "contractor.counter", total: 2550 });
    expect(openOwnerMessage(fair)!.text).toMatch(/inside the typical range/);
    expect(openOwnerMessage(fair)!.actions?.map((a) => a.id)).toEqual(["qaccept", "qhold"]);
  });

  it("ignores a counter that nobody asked for", () => {
    const w = send(audited(), { type: "contractor.counter", total: 2000 });
    expect(w.quote.stage).toBe("awaiting_owner");
  });

  it("skips quietly when the owner says skip", () => {
    let w = audited();
    w = send(w, { type: "owner.text", text: "skip" });
    expect(w.quote.stage).toBe("settled");
    expect(msgs(w).filter((m) => m.party === "contractor" && m.dir === "out")).toHaveLength(0);
  });
});

describe("loop 3: the compliance sentinel", () => {
  const alerted = () => send(createWorld(), { type: "cron.lease" });

  it("texts the exact legal maximum, the notice period, and a draft stamped as not legal advice", () => {
    const w = alerted();
    const card = openOwnerMessage(w)!;
    expect(card.text).toContain("8.0%");
    expect(card.text).toContain("$3,456.00");
    expect(card.text).toMatch(/30 days \(90 if over 10%\)/);
    expect(card.text).toMatch(/DRAFT, NOT LEGAL ADVICE/);
    expect(card.attachment?.body).toMatch(/^DRAFT, NOT LEGAL ADVICE/);
    expect(card.actions?.map((a) => a.id)).toEqual(["rent5", "rentmax", "renthold"]);
  });

  it("runs on a Monday morning at 9:00 AM, days later", () => {
    const w = alerted();
    const card = openOwnerMessage(w)!;
    expect(clockText(card.at)).toMatch(/9:00 AM$/);
    expect(card.at).toBeGreaterThan(START_CLOCK + 2 * 1440);
  });

  it("mails the notice, not texts it, and saves proof to the record", () => {
    let w = alerted();
    w = send(w, { type: "owner.tap", msgId: openOwnerMessage(w)!.id, action: "rentmax" });
    expect(toolNames(w)).toContain("mail_notice");
    const detail = w.timeline.find((e) => e.kind === "tool" && e.tool === "mail_notice");
    expect(detail && detail.kind === "tool" && detail.detail).toMatch(/properly served/);
    expect(recordAt(w.timeline, w.timeline.length).values["lease.notice"]).toContain("$3,456.00");
    expect(msgs(w).filter((m) => m.party === "tenant")).toHaveLength(0);
    expect(nextTimerAt(w)).not.toBeNull();
  });

  it("holds without sending anything", () => {
    let w = alerted();
    w = send(w, { type: "owner.tap", msgId: openOwnerMessage(w)!.id, action: "renthold" });
    expect(w.sentinel.stage).toBe("held");
    expect(toolNames(w)).not.toContain("mail_notice");
  });

  it("fires earlier timers on the way to the Monday check", () => {
    let w = createWorld();
    w = run(w, [LEAK, { type: "tenant.text", text: "2" }, { type: "tenant.text", text: "done" }, { type: "tenant.photo", photo: "label" }, { type: "tenant.text", text: "Y" }]);
    w = send(w, { type: "cron.lease" });
    // the vendor quotes and the nudge came due before the lease check
    expect(toolNames(w)).toContain("read_quotes");
    expect(toolNames(w).indexOf("read_quotes")).toBeLessThan(toolNames(w).indexOf("scan_leases"));
  });
});

describe("clock helpers", () => {
  it("formats times across days", () => {
    expect(clockText(0)).toBe("12:00 AM");
    expect(clockText(12 * 60)).toBe("12:00 PM");
    expect(clockText(1440 + 11 * 60 + 20)).toBe("Tue 11:20 AM");
  });

  it("knows Do Not Disturb hours", () => {
    expect(isQuietHours(4 * 60 + 7)).toBe(true);
    expect(isQuietHours(9 * 60)).toBe(false);
    expect(isQuietHours(23 * 60)).toBe(true);
  });
});

describe("the house record", () => {
  it("starts with the inspection and the lease only, and tracks which fields just changed", () => {
    const w0 = createWorld();
    expect(recordAt(w0.timeline, 0).values["heater.brand"]).toBe("Not on file");
    const w = run(w0, [LEAK, { type: "tenant.text", text: "2" }, { type: "tenant.text", text: "done" }, { type: "tenant.photo", photo: "label" }]);
    const rec = recordAt(w.timeline, w.timeline.length);
    expect(rec.values["heater.brand"]).toBe("Hearthline");
    expect(rec.changed).toContain("heater.model");
    expect(recordAt(w.timeline, 3).values["heater.brand"]).toBe("Not on file");
  });
});
