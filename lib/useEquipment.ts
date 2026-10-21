"use client";

import { currentHeater, equipmentFor } from "./equipment";
import { useDemo } from "./store";
import type { EquipmentItem } from "./types";

/** The equipment in the home as it is now: the home record, the new heater after a replacement, and the owner's corrections. */
export function useEquipment(): EquipmentItem[] {
  const { state } = useDemo();
  return equipmentFor(currentHeater(state), state.equipmentEdits, state.extraEquipment);
}
