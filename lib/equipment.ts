import { EQUIPMENT, NEW_HEATER_RECORD } from "./seed";
import type { DemoState, EquipmentEdit, EquipmentItem, WaterHeaterRecord } from "./types";

/** Year from an ISO "YYYY-MM" date, or null if it does not parse. */
export function yearOf(isoMonth: string): number | null {
  const match = /^(\d{4})/.exec(isoMonth);
  return match ? Number(match[1]) : null;
}

/** The heater's record from the house record. It is filled in at move-in, so this is normally never null. */
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

/** True when the record has what GoHome needs, so nobody should be asked for a photo. */
export function recordIsComplete(record: WaterHeaterRecord | null): boolean {
  return record !== null && Boolean(record.manufacturer && record.model && record.serial);
}

/**
 * The equipment list for the record and forecast screens. If the record is known,
 * the water heater uses its manufacture year and source. Otherwise the home
 * inspection estimate (about 2015) is used.
 */
export function equipmentFor(record: WaterHeaterRecord | null, edits: Record<string, EquipmentEdit> = {}, extras: EquipmentItem[] = []): EquipmentItem[] {
  return applyEdits([...baseEquipment(record), ...extras], edits);
}

/** The owner's corrections laid over the recorded details. Blank corrections are ignored. */
export function applyEdits(items: EquipmentItem[], edits: Record<string, EquipmentEdit>): EquipmentItem[] {
  return items.map((item) => {
    const e = edits[item.id];
    if (!e) return item;
    return {
      ...item,
      brand: e.brand?.trim() || item.brand,
      model: e.model?.trim() || item.model,
      serial: e.serial?.trim() || item.serial,
      location: e.location?.trim() || item.location,
      summary: e.summary?.trim() || item.summary,
      installYear: e.installYear !== undefined && Number.isInteger(e.installYear) && e.installYear >= 1950 && e.installYear <= 2100 ? e.installYear : item.installYear,
    };
  });
}

function baseEquipment(record: WaterHeaterRecord | null): EquipmentItem[] {
  if (!record) return EQUIPMENT;
  const year = yearOf(record.manufactureDate);
  return EQUIPMENT.map((item) =>
    item.id === "water-heater"
      ? {
          ...item,
          installYear: year ?? item.installYear,
          source: record.source,
          brand: record.manufacturer,
          model: record.model,
          serial: record.serial,
          summary: `${record.capacityGallons} gallon, ${record.fuelType.toLowerCase()}, tank type`,
        }
      : item,
  );
}
