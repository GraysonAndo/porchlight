import { describe, expect, it } from "vitest";
import { bookingEvents, isHeaterRequest, quoteEvents, recordEvents, triageEvents } from "../lib/agentLog";
import { NEW_HEATER_RECORD, SAMPLE_PHOTO, SEED_REQUEST } from "../lib/seed";
import { triageText } from "../lib/triage";
import type { WaterHeaterRecord } from "../lib/types";

const FROM_LABEL: WaterHeaterRecord = {
  manufacturer: "Hearthline",
  model: "HL-40G-NG",
  serial: "15C0412-X",
  capacityGallons: 40,
  fuelType: "Natural gas",
  manufactureDate: "2015-03",
  ageYears: 11,
  unconfirmed: ["serial"],
  photo: null,
  source: "Read from the tenant's photo of the label",
};

const tools = (events: { tool: string }[]) => events.map((e) => e.tool);

describe("triageEvents", () => {
  it("logs the seeded leak: read the photo, check rules, look up the record, pick steps, quiet heads-up", () => {
    const events = triageEvents({ request: SEED_REQUEST, triage: triageText(SEED_REQUEST.description), record: null });
    expect(tools(events)).toEqual(["read_photo", "check_emergency_rules", "lookup_house_record", "pick_safety_steps", "notify_owner"]);
    expect(events[1].detail).toMatch(/urgent, not an emergency/);
    expect(events[2].detail).toMatch(/Brand, model, and serial are missing/);
    expect(events[4].detail).toMatch(/no phone call/);
  });

  it("logs a gas smell as an emergency: no fix steps, and the owner is called", () => {
    const request = { description: "I smell gas near the water heater", photos: [] };
    const events = triageEvents({ request, triage: triageText(request.description), record: null });
    expect(tools(events)).toEqual(["check_emergency_rules", "lookup_house_record", "skip_fix_steps", "call_owner"]);
    expect(events[0].title).toMatch(/Emergency rule matched: Gas safety/);
    expect(events[0].detail).toMatch(/Fix steps are skipped/);
  });

  it("logs no heat as an alert with no fix steps", () => {
    const request = { description: "We have no heat", photos: [] };
    const events = triageEvents({ request, triage: triageText(request.description), record: null });
    expect(tools(events)).toContain("call_owner");
    expect(tools(events)).toContain("skip_fix_steps");
  });

  it("does not mention the water heater record for an unrelated problem", () => {
    const request = { description: "The toilet is clogged", photos: [] };
    const events = triageEvents({ request, triage: triageText(request.description), record: null });
    expect(events.find((e) => e.tool === "lookup_house_record")!.detail).not.toMatch(/water heater/i);
  });

  it("names the heater once the record knows it", () => {
    const events = triageEvents({ request: { description: "heater leaking", photos: [SAMPLE_PHOTO] }, triage: triageText("heater leaking"), record: FROM_LABEL });
    expect(events.find((e) => e.tool === "lookup_house_record")!.detail).toContain("Hearthline HL-40G-NG");
  });

  it("marks every code decision as plain code", () => {
    const events = triageEvents({ request: SEED_REQUEST, triage: triageText(SEED_REQUEST.description), record: null });
    for (const e of events.filter((x) => ["check_emergency_rules", "lookup_house_record", "pick_safety_steps"].includes(x.tool))) {
      expect(e.engine).toBe("code");
    }
    expect(events.find((e) => e.tool === "read_photo")!.engine).toBe("ai");
  });
});

describe("recordEvents", () => {
  it("is waiting for the photo when the record is missing", () => {
    const events = recordEvents(null, false);
    expect(tools(events)).toEqual(["request_label_photo"]);
    expect(events[0].detail).toMatch(/Only asked because the record has no model/);
  });

  it("says the owner is asked instead when the tenant could not reach the label", () => {
    expect(recordEvents(null, true)[0].detail).toMatch(/owner is asked to add the details/);
  });

  it("logs the reading and the record once a label is read, and flags low confidence", () => {
    const events = recordEvents(FROM_LABEL, false);
    expect(tools(events)).toEqual(["read_label", "update_house_record"]);
    expect(events[0].detail).toMatch(/needs a person to confirm/);
    expect(events[1].detail).toContain("Age: 11 years");
  });

  it("works for the new heater from the installer", () => {
    expect(recordEvents(NEW_HEATER_RECORD, false)[1].detail).toContain("Age: 0 years");
  });
});

describe("quoteEvents and bookingEvents", () => {
  it("shows the same events as the Watch it work story", () => {
    const events = quoteEvents();
    expect(tools(events)).toEqual(["repair_or_replace", "lookup_price_table", "request_quotes", "read_quotes", "check_quote", "check_quote", "check_quote", "recommend_vendor"]);
  });

  it("shows nothing about booking until the owner approves", () => {
    expect(bookingEvents(null)).toEqual([]);
    const events = bookingEvents({ vendorId: "willow-glen", notToExceed: 2695, accessWindow: "Tomorrow, 9:00 to 11:00 AM", sentAt: "x" });
    expect(tools(events)).toEqual(["owner_approval", "book_vendor", "message_tenant"]);
    expect(events[0].engine).toBe("human");
  });
});

describe("isHeaterRequest", () => {
  it("recognizes water heater wording", () => {
    expect(isHeaterRequest("The water heater is leaking")).toBe(true);
    expect(isHeaterRequest("no hot water")).toBe(true);
    expect(isHeaterRequest("the toilet is clogged")).toBe(false);
  });
});

describe("isHeaterJob", () => {
  it("is true for a heater leak and false for a gas smell near the heater", async () => {
    const { isHeaterJob } = await import("../lib/agentLog");
    const { triageText } = await import("../lib/triage");
    const leak = "The water heater is leaking from the bottom";
    const gas = "I smell gas near the water heater";
    expect(isHeaterJob(leak, triageText(leak))).toBe(true);
    expect(isHeaterJob(gas, triageText(gas))).toBe(false);
    expect(isHeaterJob("The toilet is clogged", null)).toBe(false);
    expect(isHeaterJob(leak, null)).toBe(true);
  });
});
