import { EQUIPMENT, NEW_HEATER_RECORD } from "./seed";
import type { DemoState, EquipmentItem, WaterHeaterRecord } from "./types";

/** Year from an ISO "YYYY-MM" date, or null if it does not parse. */
export function yearOf(isoMonth: string): number | null {
  const match = /^(\d{4})/.exec(isoMonth);
  return match ? Number(match[1]) : null;
}

/**
 * The leaking heater's record, or null if Porchlight does not know its brand,
 * model, and serial yet. The home inspection only says "water heater, about
 * 2015". The label photo (from the tenant, or typed in by the owner) fills it in.
 */
export function heaterBeforeRepair(state: Pick<DemoState, "houseRecord">): WaterHeaterRecord | null {
  return state.houseRecord;
}

/**
 * The heater in the home right now. After the plumber finishes the job (simulated),
 * the installer registers the new heater and it is added to the record automatically.
 */
export function currentHeater(state: Pick<DemoState, "houseRecord" | "jobCompletedAt">): WaterHeaterRecord | null {
  return state.jobCompletedAt ? NEW_HEATER_RECORD : heaterBeforeRepair(state);
}

/** True when the record has what Porchlight needs, so nobody should be asked for a photo. */
export function recordIsComplete(record: WaterHeaterRecord | null): boolean {
  return record !== null && Boolean(record.manufacturer && record.model && record.serial);
}

/**
 * The equipment list for the record and forecast screens. If the record is known,
 * the water heater uses its manufacture year and source. Otherwise the home
 * inspection estimate (about 2015) is used.
 */
export function equipmentFor(record: WaterHeaterRecord | null): EquipmentItem[] {
  if (!record) return EQUIPMENT;
  const year = yearOf(record.manufactureDate);
  return EQUIPMENT.map((item) =>
    item.id === "water-heater"
      ? { ...item, installYear: year ?? item.installYear, source: record.source }
      : item,
  );
}
