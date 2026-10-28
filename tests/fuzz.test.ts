import { describe, expect, it } from "vitest";
import { advanceTo, createWorld, nextTimerAt, openOwnerMessage, send } from "../lib/agents/engine";
import type { Ev, Msg, World } from "../lib/agents/types";

// A small seeded random generator, so a failing sequence can be replayed.
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

const TEXTS = [
  "water heater is leaking all over the garage", "1", "2", "yes", "no", "help", "HELP", "done", "Done", "I smell gas near the water heater",
  "How much is my rent?", "The toilet is clogged and overflowing", "", "   ", "x".repeat(2000), "<script>alert(1)</script>", "0", "99",
  "Can I have a dog?", "We have no heat and it is freezing", "the sink is clogged and backing up", "is it an emergency", "stop", "😀",
  "When is my lease up?", "water near the outlet", "1\n2", "approve", "call me", "cancel",
];
const OWNER_TEXTS = ["approve", "1", "2", "no", "yes", "Check my lease and rent", "A contractor sent me a quote", "", "help", "stop"];

function pick<T>(r: () => number, xs: T[]): T {
  return xs[Math.floor(r() * xs.length)];
}

function randomEvent(r: () => number, w: World): Ev {
  const n = r();
  if (n < 0.34) return { type: "tenant.text", text: pick(r, TEXTS) };
  if (n < 0.4) return { type: "tenant.photo", photo: "leak" };
  if (n < 0.5) return { type: "owner.text", text: pick(r, OWNER_TEXTS) };
  if (n < 0.62) {
    const open = openOwnerMessage(w);
    const msgs = w.timeline.filter((e): e is Msg => e.kind === "msg");
    const m = open ?? pick(r, msgs.length ? msgs : [{ id: "nope" } as Msg]);
    const actions = open?.actions?.map((a) => a.id) ?? ["approve", "call", "other", "x"];
    return { type: "owner.tap", msgId: m.id, action: pick(r, actions.length ? actions : ["approve"]) };
  }
  if (n < 0.67) return { type: "contractor.quote" };
  if (n < 0.69) return { type: "contractor.counter", total: pick(r, [0, -5, 100, 2000, 99999999, NaN]) };
  if (n < 0.73) return { type: "cron.lease" };
  if (n < 0.78) return { type: "rent.paid", paid: r() < 0.7 };
  if (n < 0.8) return { type: "rent.remind", daysLate: pick(r, [0, 1, 4, 22, -3]) };
  if (n < 0.83) return { type: "rent.cpi", confirmed: r() < 0.7 };
  if (n < 0.85) return { type: "utilities.paid", amount: "$92.18", confirmation: "C" + Math.floor(r() * 1000) };
  if (n < 0.87) return { type: "owner.markDone" };
  if (n < 0.89) return { type: "owner.autoApprove", limit: pick(r, [0, 500, 3000]) };
  if (n < 0.91) return { type: "owner.choose", vendorId: pick(r, ["willow-glen", "bayside", "a1-rapid", "nobody"]), notToExceed: pick(r, [0, 2695, 100]), accessWindow: "Tomorrow, 9:00 to 11:00 AM" };
  return { type: "timer", id: pick(r, ["quotes_in", "owner_nudge", "job_done", "notice_delivered"] as const) };
}

const tools = (w: World) => w.timeline.flatMap((e) => (e.kind === "tool" ? [e.tool] : []));
const count = (w: World, name: string) => tools(w).filter((t) => t === name).length;

describe("fuzz: random events never break the agent", () => {
  it("keeps its invariants over many random conversations", () => {
    const problems = new Map<string, string>();
    const note = (key: string, detail: string) => {
      if (!problems.has(key)) problems.set(key, detail);
    };
    const seeds = Number(process.env.FUZZ_SEEDS ?? 600);
    for (let seed = 1; seed <= seeds; seed++) {
      const r = rng(seed);
      let w = createWorld();
      const log: string[] = [];
      let prevStage = w.triage.stage;
      let cpiEvents = 0;
      let unpaidEvents = 0;
      for (let i = 0; i < 28; i++) {
        const ev = randomEvent(r, w);
        if (r() < 0.12) {
          const t = nextTimerAt(w);
          if (t !== null) {
            try {
              w = advanceTo(w, t);
              log.push("advance");
              prevStage = w.triage.stage;
            } catch (e) {
              note("advanceTo threw", `seed ${seed}: ${String(e)}`);
            }
            continue;
          }
        }
        if (ev.type === "rent.cpi") cpiEvents++;
        if (ev.type === "rent.paid" && !ev.paid) unpaidEvents++;
        log.push(JSON.stringify(ev).slice(0, 80));
        try {
          w = send(w, ev);
        } catch (e) {
          note("send threw", `seed ${seed} after ${log.slice(-4).join(" | ")}: ${String(e)}`);
          break;
        }
        // Stages only move along the real path, never backwards into the middle of a repair.
        const FORBIDDEN: Record<string, string[]> = {
          quotes_pending: ["steps_given", "asked_electrical", "idle"],
          decision_sent: ["steps_given", "asked_electrical", "quotes_pending", "idle"],
          booked: ["steps_given", "asked_electrical", "quotes_pending", "decision_sent", "idle"],
        };
        const stage = w.triage.stage;
        if (stage !== prevStage && (FORBIDDEN[prevStage] ?? []).includes(stage)) note("stage went backwards", `seed ${seed}: ${prevStage} to ${stage} after ${log.slice(-2).join(" | ")}`);
        if (prevStage === "done" && ["booked", "decision_sent", "quotes_pending"].includes(stage)) note("a finished repair came back to life", `seed ${seed}: done to ${stage}`);
        if (prevStage === "decision_sent" && stage === "done") note("repair finished without a booking", `seed ${seed}`);
        prevStage = stage;
        // The inflation figure and unpaid rent gate the lease card.
        for (const e of w.timeline) {
          if (e.kind === "msg" && e.party === "owner" && e.card?.kind === "lease" && cpiEvents === 0) {
            const row = e.card.facts.find((f) => f.label === "Legal maximum");
            if (row && !/Needs your inflation figure first/.test(row.value)) note("lease card shows a final maximum with no confirmed inflation figure", `seed ${seed}: ${row.value}`);
            if (e.actions?.some((a) => a.id === "rent5" || a.id === "rentmax")) note("lease card offers to mail before the inflation figure is confirmed", `seed ${seed}`);
          }
        }
        const scans = count(w, "scan_leases");
        if (scans > 0 && !w.rentPaid && unpaidEvents === 0 && w.sentinel.stage === "awaiting_owner") note("rent increase offered while rent is unpaid", `seed ${seed}`);
        const ids = w.timeline.map((e) => e.id);
        if (new Set(ids).size !== ids.length) note("duplicate timeline ids", `seed ${seed}`);
        for (let k = 1; k < w.timeline.length; k++) {
          if (w.timeline[k].at < w.timeline[k - 1].at - 1e-9) {
            note("timeline goes back in time", `seed ${seed}`);
            break;
          }
        }
        const tenantOut = w.timeline.filter((e): e is Msg => e.kind === "msg" && e.party === "tenant" && e.dir === "out");
        for (const m of tenantOut) {
          if (/\bquote\b|\$2,(450|850|100|695)|spending limit/i.test(m.text)) note("tenant told about quotes or vendors or prices", `seed ${seed}: ${m.text.slice(0, 120)}`);
          if (/undefined|NaN|\[object|null\b/.test(m.text)) note("tenant text has a broken value", `seed ${seed}: ${m.text.slice(0, 120)}`);
        }
        const ownerOut = w.timeline.filter((e): e is Msg => e.kind === "msg" && e.party === "owner" && e.dir === "out");
        for (const m of ownerOut) {
          if (/undefined|NaN|\[object|\bnull\b/.test(m.text)) note("owner text has a broken value", `seed ${seed}: ${m.text.slice(0, 120)}`);
          if (m.card && JSON.stringify(m.card).match(/undefined|NaN/)) note("owner card has a broken value", `seed ${seed}: ${JSON.stringify(m.card).slice(0, 160)}`);
        }
        if (count(w, "remind_rent") > 1) note("rent reminder sent twice", `seed ${seed}`);
        if (count(w, "installer_registration") > count(w, "book_vendor")) note("new heater recorded without a booking", `seed ${seed}`);
        if (count(w, "book_vendor") > count(w, "open_case")) note("more bookings than cases", `seed ${seed}: bookings ${count(w, "book_vendor")} cases ${count(w, "open_case")}`);
        const openCards = w.timeline.filter((e): e is Msg => e.kind === "msg" && e.dir === "out" && e.party === "owner" && !!e.card && !!e.actions && !e.usedAction);
        if (openCards.filter((m) => m.card?.kind === "decision").length > 1) note("two open decisions at once", `seed ${seed}`);
        if (w.rentPaid && count(w, "hold_for_late_rent") > 0 && w.sentinel.stage === "held" && w.cpiConfirmed && w.sentinel.stage === "held") {
          // held while paid is fine: it only moves on the next lease check
        }
      }
    }
    const report = [...problems.entries()].map(([k, v]) => `${k}: ${v}`).join("\n");
    if (report) console.log("FUZZ FINDINGS\n" + report);
    expect(problems.size).toBe(0);
  }, 120000);
});
