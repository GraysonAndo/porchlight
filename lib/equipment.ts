import { EQUIPMENT } from "./seed";
import type { EquipmentItem, WaterHeaterRecord } from "./types";

/** Year from an ISO "YYYY-MM" date, or null if it does not parse. */
export function yearOf(isoMonth: string): number | null {
  const match = /^(\d{4})/.exec(isoMonth);
  return match ? Number(match[1]) : null;
}

/**
 * The equipment list for the forecast and record screens. If the owner saved a
 * label read, the water heater uses that manufacture year instead of the seed.
 */
export function equipmentFor(record: WaterHeaterRecord | null): EquipmentItem[] {
  const year = record ? yearOf(record.manufactureDate) : null;
  return EQUIPMENT.map((item) =>
    item.id === "water-heater" && year !== null ? { ...item, installYear: year } : item,
  );
}
