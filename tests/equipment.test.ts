import { describe, expect, it } from "vitest";
import { currentHeater, equipmentFor, heaterBeforeRepair, yearOf } from "../lib/equipment";
import { buildForecast } from "../lib/forecast";
import { NEW_HEATER_RECORD, SEED_HEATER_RECORD } from "../lib/seed";

describe("house record heater", () => {
  it("already knows the heater, with no label read needed", () => {
    const heater = heaterBeforeRepair({ houseRecord: null });
    expect(heater.manufacturer).toBe("Hearthline");
    expect(heater.model).toBe("HL-40G-NG");
    expect(heater.serial).toBe("15C0412-X");
    expect(heater.fuelType).toBe("Natural gas");
    expect(heater.unconfirmed).toEqual([]);
    expect(heater.source).toMatch(/registration/i);
  });

  it("uses the owner's checked copy when there is one", () => {
    const checked = { ...SEED_HEATER_RECORD, verified: true, source: "Checked against a label photo by the owner" };
    expect(heaterBeforeRepair({ houseRecord: checked })).toBe(checked);
  });

  it("adds the new heater automatically after the job is done", () => {
    expect(currentHeater({ houseRecord: null, jobCompletedAt: null })).toBe(SEED_HEATER_RECORD);
    expect(currentHeater({ houseRecord: null, jobCompletedAt: "2026-10-14T09:00:00.000Z" })).toBe(NEW_HEATER_RECORD);
    expect(NEW_HEATER_RECORD.serial).not.toBe(SEED_HEATER_RECORD.serial);
  });

  it("parses the year from a manufacture date", () => {
    expect(yearOf("2015-03")).toBe(2015);
    expect(yearOf("nope")).toBeNull();
  });

  it("feeds the forecast: the old heater is overdue, the new one is not", () => {
    const old = buildForecast(equipmentFor(SEED_HEATER_RECORD)).rows.find((r) => r.id === "water-heater")!;
    expect(old.status).toBe("overdue or due now");
    const fresh = buildForecast(equipmentFor(NEW_HEATER_RECORD)).rows.find((r) => r.id === "water-heater")!;
    expect(fresh.dueYear).toBe(2036);
    expect(fresh.status).toBe("beyond 5 years");
  });

  it("carries the record's source onto the equipment list", () => {
    const heater = equipmentFor(NEW_HEATER_RECORD)[0];
    expect(heater.source).toBe(NEW_HEATER_RECORD.source);
  });
});
