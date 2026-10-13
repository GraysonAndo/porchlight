import { describe, expect, it } from "vitest";
import { currentHeater, equipmentFor, heaterBeforeRepair, recordIsComplete, yearOf } from "../lib/equipment";
import { buildForecast } from "../lib/forecast";
import { NEW_HEATER_RECORD } from "../lib/seed";
import type { WaterHeaterRecord } from "../lib/types";

const FROM_LABEL: WaterHeaterRecord = {
  manufacturer: "Hearthline",
  model: "HL-40G-NG",
  serial: "15C0412-X",
  capacityGallons: 40,
  fuelType: "Natural gas",
  manufactureDate: "2015-03",
  ageYears: 11,
  unconfirmed: [],
  photo: null,
  source: "Read from the tenant's photo of the label",
};

describe("house record heater", () => {
  it("starts without brand, model, or serial: the home inspection only knows about 2015", () => {
    expect(heaterBeforeRepair({ houseRecord: null })).toBeNull();
    expect(recordIsComplete(null)).toBe(false);
    const water = equipmentFor(null)[0];
    expect(water.installYear).toBe(2015);
    expect(water.source).toMatch(/inspection/i);
  });

  it("is complete once a label has been read", () => {
    expect(recordIsComplete(FROM_LABEL)).toBe(true);
    expect(recordIsComplete({ ...FROM_LABEL, serial: "" })).toBe(false);
  });

  it("uses the label's manufacture year and source after it is read", () => {
    const water = equipmentFor(FROM_LABEL)[0];
    expect(water.installYear).toBe(2015);
    expect(water.source).toBe(FROM_LABEL.source);
  });

  it("adds the new heater automatically after the job is done", () => {
    expect(currentHeater({ houseRecord: null, jobCompletedAt: null })).toBeNull();
    expect(currentHeater({ houseRecord: FROM_LABEL, jobCompletedAt: null })).toBe(FROM_LABEL);
    expect(currentHeater({ houseRecord: FROM_LABEL, jobCompletedAt: "2026-10-14T09:00:00.000Z" })).toBe(NEW_HEATER_RECORD);
    expect(NEW_HEATER_RECORD.serial).not.toBe(FROM_LABEL.serial);
    expect(recordIsComplete(NEW_HEATER_RECORD)).toBe(true);
  });

  it("parses the year from a manufacture date", () => {
    expect(yearOf("2015-03")).toBe(2015);
    expect(yearOf("nope")).toBeNull();
  });

  it("feeds the forecast: the old heater is overdue, the new one is not", () => {
    const old = buildForecast(equipmentFor(null)).rows.find((r) => r.id === "water-heater")!;
    expect(old.status).toBe("overdue or due now");
    const fresh = buildForecast(equipmentFor(NEW_HEATER_RECORD)).rows.find((r) => r.id === "water-heater")!;
    expect(fresh.dueYear).toBe(2036);
    expect(fresh.status).toBe("beyond 5 years");
  });
});
