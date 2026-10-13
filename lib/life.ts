// Where an item is in its typical life. Used for the lifespan bars and badges.

import { CURRENT_YEAR } from "./forecast";
import type { EquipmentItem } from "./types";

export type LifeTone = "good" | "caution" | "urgent";

export interface LifeStage {
  ageYears: number;
  percentOfLife: number;
  tone: LifeTone;
  label: string;
}

export function ageOf(item: Pick<EquipmentItem, "installYear">, currentYear = CURRENT_YEAR): number {
  return Math.max(0, currentYear - item.installYear);
}

export function lifeStage(ageYears: number, typicalLifeYears: number): LifeStage {
  const percentOfLife = typicalLifeYears > 0 ? Math.round((ageYears / typicalLifeYears) * 100) : 100;
  if (percentOfLife >= 100) return { ageYears, percentOfLife, tone: "urgent", label: "Past typical life" };
  if (percentOfLife >= 80) return { ageYears, percentOfLife, tone: "caution", label: "Near end of life" };
  return { ageYears, percentOfLife, tone: "good", label: "Within typical life" };
}
