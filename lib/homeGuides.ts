// Step-by-step picture guides, written by hand and tied to the equipment in the house record.
//
// Because GoHome already knows the brand, model, and where each item is in the home, a guide can
// say "the blue-handled valve on top of your Hearthline HL-40G-NG" instead of "find the valve".
// Every step has a picture (see components/GuideScene.tsx), so a tenant never has to leave the
// app to search for a video.
//
// These are general safety steps only, and they never ask a tenant to touch a gas line, a gas
// valve, or anything that has to be done by a licensed person. Have a licensed professional review
// them before real tenants rely on them (see README, "Before real use").

import { EQUIPMENT } from "./seed";
import type { EquipmentItem } from "./types";

export type SceneId = "heater" | "toilet" | "furnace" | "panel" | "dishwasher";

export interface GuideStep {
  /** What to do, in one or two plain sentences */
  text: string;
  /** Which part of the picture to point at (see GuideScene) */
  part: string;
  /** A valve or breaker that changes in this step */
  state?: "open" | "closed" | "off" | "on";
  /** A short line under the picture */
  caption: string;
  /** A warning for this step only */
  warn?: string;
}

export interface HomeGuide {
  id: string;
  title: string;
  /** The equipment this guide is for, or null for the whole home */
  equipmentId: string | null;
  scene: SceneId;
  time: string;
  youNeed: string;
  /** One sentence on when to use it */
  when: string;
  steps: GuideStep[];
  stopIf: string[];
  /** Brand, model, and location from the house record, shown on the guide */
  forItem: string | null;
}

function item(id: string): EquipmentItem {
  const found = EQUIPMENT.find((e) => e.id === id);
  if (!found) throw new Error(`Unknown equipment: ${id}`);
  return found;
}

const itemName = (e: EquipmentItem) => `${e.brand} ${e.model}`;
/** "in the garage, against the north wall" from a location like "Garage, against the north wall". */
const inWhere = (e: EquipmentItem) => `in the ${e.location.charAt(0).toLowerCase()}${e.location.slice(1)}`;

export const GAS_WARNING = "You smell gas. Leave the home right away, do not touch anything, and call 911.";

function build(): HomeGuide[] {
  const heater = item("water-heater");
  const furnace = item("furnace");
  const dish = item("dishwasher");

  return [
    {
      id: "heater-water-off",
      title: "Shut off the water to your water heater",
      equipmentId: "water-heater",
      scene: "heater",
      time: "About 3 minutes",
      youNeed: "A towel. No tools.",
      when: "The heater is leaking and you want to stop more water coming out.",
      forItem: `${itemName(heater)}, ${inWhere(heater)}`,
      steps: [
        {
          part: "tank",
          caption: `Your ${itemName(heater)} is ${inWhere(heater)}.`,
          text: `Go to your water heater. It is the tall ${heater.summary.split(",")[0]} tank ${inWhere(heater)}. If the floor around it is wet, step carefully and keep your shoes dry.`,
          warn: "If the water is near an outlet or anything plugged in, stay away and tell GoHome. That is an emergency.",
        },
        {
          part: "cold-valve",
          caption: "The cold water pipe is the one with the blue ring, on the right of the top.",
          text: "Look at the top of the tank. Two pipes go in. The one with the blue ring is the cold water pipe, and its shut-off valve is the handle just above the tank.",
        },
        {
          part: "cold-valve",
          state: "closed",
          caption: "Handle across the pipe means closed.",
          text: "Turn the handle a quarter turn so it sits across the pipe, like a plus sign. If it is a round wheel, turn it to the right until it stops. That stops new water from filling the tank.",
        },
        {
          part: "pan",
          caption: "Towels on the floor, valuables up and away.",
          text: "Lay towels around the base of the tank and move boxes or anything that can get wet. A small leak that stops now often causes no damage.",
        },
        {
          part: "gas",
          caption: "Leave the gas control alone. It is the plumber's job.",
          text: "Do not touch the gas control at the bottom front of the heater, and do not try to light or relight anything. GoHome has already told your landlord, and a licensed plumber will handle the gas side.",
          warn: GAS_WARNING,
        },
        {
          part: "tank",
          caption: "Tap Done in the chat. GoHome takes it from here.",
          text: "That is it. Tap Done in the chat and GoHome will arrange the repair with your landlord. You do not need to call anyone.",
        },
      ],
      stopIf: [GAS_WARNING, "Water is near an outlet, a cord, or the breaker panel.", "The valve will not turn, or water keeps pouring out. Leave it and tell GoHome."],
    },
    {
      id: "heater-leak-check",
      title: "Find where the water is coming from",
      equipmentId: "water-heater",
      scene: "heater",
      time: "About 2 minutes",
      youNeed: "A flashlight and a dry paper towel.",
      when: "You want to tell GoHome exactly where the leak is, so the plumber comes prepared.",
      forItem: `${itemName(heater)}, ${inWhere(heater)}`,
      steps: [
        {
          part: "tank",
          caption: "Stand back and look at the whole tank first.",
          text: "Stay a step away and look over the whole tank with your flashlight. Is it dripping, or is the floor just wet?",
        },
        {
          part: "cold-valve",
          caption: "Top: where the pipes enter the tank.",
          text: "Look at the two pipe fittings on top. Wipe one with a dry paper towel. If the towel is wet right away, the leak is at the top.",
        },
        {
          part: "relief",
          caption: "Side: the relief valve and the pipe running down from it.",
          text: "Find the small valve on the side with a pipe running down. A drip here is common and a safety valve doing its job, but tell GoHome so the plumber checks it.",
        },
        {
          part: "pan",
          caption: "Bottom: water pooling under the tank.",
          text: "Look at the bottom. Water slowly running out from underneath usually means the tank itself has failed. That is the most serious kind of leak.",
        },
        {
          part: "tank",
          caption: "Tell GoHome what you saw. A photo helps.",
          text: "Type what you saw into the chat (top, side, or bottom) and tap the camera to send one photo if you can. Do not touch any wet electrical item.",
        },
      ],
      stopIf: [GAS_WARNING, "You see sparks, hear buzzing, or smell something burning.", "The floor is flooding. Shut off the water (see the other guide) and tell GoHome."],
    },
    {
      id: "toilet-overflow",
      title: "Stop an overflowing toilet",
      equipmentId: null,
      scene: "toilet",
      time: "About 2 minutes",
      youNeed: "Towels. A bucket helps.",
      when: "The toilet is filling up or overflowing.",
      forItem: null,
      steps: [
        {
          part: "supply",
          caption: "The shut-off valve is on the wall, behind and below the tank.",
          text: "Find the small oval handle on the pipe coming out of the wall behind the toilet.",
        },
        {
          part: "supply",
          state: "closed",
          caption: "Turn it to the right until it stops.",
          text: "Turn the handle clockwise (to the right) until it stops. The water stops filling the tank. Do not flush again.",
        },
        {
          part: "lid",
          caption: "If the handle is stuck, lift the tank lid and hold the float up.",
          text: "If the valve will not turn, lift the lid off the tank and set it on the floor. Lift the float (the ball or cup) up so the water stops rising.",
        },
        {
          part: "floor",
          caption: "Towels down, then tell GoHome.",
          text: "Put towels around the base. Tell GoHome in the chat. Do not use the toilet until it has been looked at.",
          warn: "Keep towels and water away from outlets and power strips.",
        },
      ],
      stopIf: ["Water is reaching an outlet or the ceiling below.", "Sewage is coming up from a drain in the floor or the bathtub."],
    },
    {
      id: "furnace-no-heat",
      title: "Furnace not heating: three quick checks",
      equipmentId: "furnace",
      scene: "furnace",
      time: "About 5 minutes",
      youNeed: "Nothing. A new filter if yours is dirty.",
      when: "The house is cold. Check these before anything else, and tell GoHome either way.",
      forItem: `${itemName(furnace)}, ${inWhere(furnace)}`,
      steps: [
        {
          part: "thermostat",
          caption: "Set to Heat, and 5 degrees above the room temperature.",
          text: "At the thermostat, set the mode to Heat and set the temperature a few degrees above the room. Wait two minutes to hear the system start.",
        },
        {
          part: "switch",
          state: "on",
          caption: `The power switch is on the side of your ${furnace.model}.`,
          text: `Look at the side of the furnace ${inWhere(furnace)}. There is a switch that looks like a light switch. It should be up (on). If it is off, switch it on once.`,
        },
        {
          part: "filter",
          caption: "Pull the filter out by its tab and hold it to the light.",
          text: "Slide the filter out of the slot at the bottom. If you cannot see light through it, it is clogged. A clogged filter can shut a furnace off.",
        },
        {
          part: "thermostat",
          caption: "Still cold after 15 minutes? Tell GoHome.",
          text: "If it is still not heating after 15 minutes, tell GoHome. Your landlord will be told right away. Do not open the furnace panel or touch the burner.",
          warn: GAS_WARNING,
        },
      ],
      stopIf: [GAS_WARNING, "You hear banging or see smoke or sparks.", "Anyone feels dizzy or gets a headache. Get fresh air and call 911."],
    },
    {
      id: "breaker-reset",
      title: "Reset a tripped breaker",
      equipmentId: null,
      scene: "panel",
      time: "About 2 minutes",
      youNeed: "A dry floor and dry hands. A flashlight helps.",
      when: "A room or an outlet lost power and nothing is sparking or smoking.",
      forItem: null,
      steps: [
        {
          part: "panel",
          caption: "The breaker panel is in the garage.",
          text: "Find the gray metal panel on the garage wall. Make sure the floor is dry and your hands are dry before you open the door.",
          warn: "If the floor is wet, do not touch the panel. Tell GoHome.",
        },
        {
          part: "tripped",
          caption: "A tripped breaker sits in the middle, or shows a little orange.",
          text: "Look for a switch that is not lined up with the others. It will be in the middle position or show orange.",
        },
        {
          part: "tripped",
          state: "off",
          caption: "Push it fully to OFF first.",
          text: "Push the handle firmly all the way to OFF. You will feel a click.",
        },
        {
          part: "tripped",
          state: "on",
          caption: "Then push it to ON. Only try this once.",
          text: "Now push it back to ON. If the power returns, you are done. If it flips off again, leave it off and tell GoHome.",
          warn: "Never keep resetting a breaker that keeps tripping.",
        },
      ],
      stopIf: ["You smell burning, or see scorch marks or sparks.", "The panel is hot or buzzing.", "The breaker trips again right away."],
    },
    {
      id: "dishwasher-drain",
      title: "Dishwasher will not drain",
      equipmentId: "dishwasher",
      scene: "dishwasher",
      time: "About 10 minutes",
      youNeed: "A towel, a cup, and an old toothbrush.",
      when: "There is standing water at the bottom after a cycle.",
      forItem: `${itemName(dish)}, ${inWhere(dish)}`,
      steps: [
        {
          part: "door",
          caption: `Cancel the cycle and open your ${dish.model}.`,
          text: "Press Cancel, wait a minute, and open the door. Put a towel on the floor in front. Scoop out standing water with a cup.",
        },
        {
          part: "rack",
          caption: "Lift out the bottom rack.",
          text: "Slide the bottom rack out so you can see the floor of the dishwasher.",
        },
        {
          part: "filter",
          caption: "Twist the round filter counterclockwise and lift it out.",
          text: "At the bottom center there is a round filter. Twist it to the left and lift it out. Rinse it under the tap and scrub with the toothbrush.",
        },
        {
          part: "filter",
          state: "closed",
          caption: "Put it back and twist until it stops. Run a rinse.",
          text: "Put the filter back, twist to lock, replace the rack, and run a short rinse cycle. If water is still standing, tell GoHome.",
        },
      ],
      stopIf: ["Water is leaking onto the floor from the door or underneath.", "You see sparks or smell burning."],
    },
  ];
}

const GUIDES = build();

export function guideById(id: string): HomeGuide | null {
  return GUIDES.find((g) => g.id === id) ?? null;
}

export function guidesForEquipment(equipmentId: string): HomeGuide[] {
  return GUIDES.filter((g) => g.equipmentId === equipmentId);
}

/** Guides for the whole home (not tied to one item), such as a tripped breaker. */
export function homeWideGuides(): HomeGuide[] {
  return GUIDES.filter((g) => g.equipmentId === null);
}

export function allGuides(): HomeGuide[] {
  return GUIDES;
}

/** A guide that fits what the tenant wrote, or null. Used so the agent can offer a picture guide. */
export function guideForText(text: string): string | null {
  const t = text.toLowerCase();
  if (/toilet|overflow/.test(t) && !/gas/.test(t)) return "toilet-overflow";
  if (/dishwasher/.test(t)) return "dishwasher-drain";
  if (/breaker|power (is )?out|no power|outlet.*(dead|not working)|lost power/.test(t) && !/spark|smok|burn/.test(t)) return "breaker-reset";
  return null;
}
