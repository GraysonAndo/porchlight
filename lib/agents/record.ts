// Turns the agent's house record values (the text shown on screen) into a
// WaterHeaterRecord for the rest of the app, and back.

import type { WaterHeaterRecord } from "../types";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/** "March 2015" becomes "2015-03". Returns "" if it does not parse. */
export function isoMonthFromText(text: string): string {
  const m = /^([A-Za-z]+)\s+(\d{4})$/.exec(text.trim());
  if (!m) return "";
  const i = MONTHS.findIndex((name) => name.toLowerCase() === m[1].toLowerCase());
  return i < 0 ? "" : `${m[2]}-${String(i + 1).padStart(2, "0")}`;
}

/** The water heater record for the agent's values, or null while the brand is still "Not on file". */
export function recordFromValues(values: Record<string, string>): WaterHeaterRecord | null {
  const brand = values["heater.brand"];
  if (!brand || brand === "Not on file") return null;
  const serialRaw = values["heater.serial"] ?? "";
  const unconfirmed = /please confirm/i.test(serialRaw) ? ["serial"] : [];
  const age = values["heater.age"] ?? "";
  return {
    manufacturer: brand,
    model: values["heater.model"] ?? "",
    serial: serialRaw.replace(/\s*\(please confirm\)\s*/i, "").trim(),
    capacityGallons: Number(/\d+/.exec(values["heater.size"] ?? "")?.[0] ?? 0),
    fuelType: values["heater.fuel"] ?? "",
    manufactureDate: isoMonthFromText(values["heater.made"] ?? ""),
    ageYears: /new/i.test(age) ? 0 : Number(/\d+/.exec(age)?.[0] ?? 0),
    unconfirmed,
    photo: null,
    source: values["heater.source"] ?? "Porchlight",
  };
}
