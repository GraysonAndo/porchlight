import { EQUIPMENT, NEW_HEATER_RECORD, SEED_HEATER_RECORD } from "./seed";
import type { DemoState, EquipmentItem, WaterHeaterRecord } from "./types";

/** Year from an ISO "YYYY-MM" date, or null if it does not parse. */
export function yearOf(isoMonth: string): number | null {
  const match = /^(\d{4})/.exec(isoMonth);
  return match ? Number(match[1]) : null;
}

/**
 * The heater that is leaking. The house record already knows it (from the
 * installer's registration). If the owner checked it against a label photo,
 * that checked copy is used instead.
 */
export function heaterBeforeRepair(state: Pick<DemoState, "houseRecord">): WaterHeaterRecord {
  return state.houseRecord ?? SEED_HEATER_RECORD;
}

/**
 * The heater in the home right now. After the plumber finishes the job (simulated),
 * the new heater is added to the record automatically.
 */
export function currentHeater(state: Pick<DemoState, "houseRecord" | "jobCompletedAt">): WaterHeaterRecord {
  return state.jobCompletedAt ? NEW_HEATER_RECORD : heaterBeforeRepair(state);
}

/**
 * The equipment list for the record and forecast screens. The water heater uses
 * the details from the given record (manufacture year and source).
 */
export function equipmentFor(record: WaterHeaterRecord): EquipmentItem[] {
  const year = yearOf(record.manufactureDate);
  return EQUIPMENT.map((item) =>
    item.id === "water-heater"
      ? { ...item, installYear: year ?? item.installYear, source: record.source }
      : item,
  );
}
