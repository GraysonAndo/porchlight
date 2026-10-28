// Rule-based triage used by the mock AI. Plain keyword rules, deterministic.
//
// 1. Safety words (gas, fire, flooding) always win and give emergency advice.
// 2. A water heater problem returns the seeded scenario for the demo.
// 3. Anything else gets a short, honest generic result for its category.

import type { TriageResult, Urgency } from "./types";

/** The three buckets from the product spec, as shown on screen. */
export const URGENCY_LABEL: Record<Urgency, string> = {
  emergency: "EMERGENCY",
  urgent: "SOON",
  routine: "ROUTINE",
};

/** Lower case, for use inside a sentence. */
export function urgencyWord(urgency: Urgency): string {
  return URGENCY_LABEL[urgency].toLowerCase();
}

interface Rule {
  test: RegExp;
}

const GAS: Rule = {
  test: /^\s*gas\s*[!?.]*\s*$|(smell|smells|smelling|odor|odour|whiff|hiss|hissing)[^.]{0,30}\bgas\b|\bgas\b[^.]{0,30}(smell|smells|odor|odour|leak|leaking|hiss)|rotten egg|sulfur|sulphur/i,
};
// Carbon monoxide: the alarm, or dizziness and headaches near a gas appliance.
const CARBON_MONOXIDE: Rule = {
  test: /carbon monoxide|\bco (alarm|detector)|co alarm|(dizzy|dizziness|lightheaded|light-headed|nauseous|nausea|headache)[^.]{0,60}(gas|fumes|furnace|heater|stove|alarm)|(gas|fumes|furnace|heater|stove|alarm)[^.]{0,60}(dizzy|dizziness|lightheaded|light-headed|nauseous|nausea|headache)/i,
};
const FIRE_OR_SPARKS: Rule = {
  test: /\bfire\b|\bsmoke\b|smoking|burning smell|smells?( like)?( something)? burning|something (is )?burning|sparks?\b|sparking|arc(ing)?\b|melted (outlet|plug|wire)/i,
};
const FLOODING: Rule = {
  test: /flood(ing|ed)?\b|burst pipe|pipe (burst|broke)|water (is )?(pouring|gushing|everywhere)|gushing|sewage|sewer (backup|back up)/i,
};

// Someone trying to get in, or already in, is a police matter first. Nothing here is a do-it-yourself fix.
const SECURITY: Rule = {
  test: /break(ing|s)?[\s-]?in\b|broke in|broken into|burglar|burglary|intruder|prowler|trespass|someone (is )?(trying to get|getting|got) in|being robbed|robbery|stalker|threatening me/i,
};
// Water meeting wiring is a shock and fire risk, not a plumbing problem first.
const WATER_AND_ELECTRIC: Rule = {
  test: /(water|leak|leaking|leaks|dripping|drips|dripped|wet|soaked|flood(ing|ed)?)[^.]{0,40}(light fixture|ceiling light|ceiling fan|outlet|socket|breaker|electrical panel|fuse box|wiring)|(light fixture|ceiling light|ceiling fan|outlet|socket|breaker|electrical panel|fuse box|wiring)[^.]{0,40}(water|leak|leaking|leaks|dripping|drips|wet|soaked|flood)/i,
};
const NO_HOT_WATER: Rule = { test: /no hot water|without hot water|hot water (is )?(out|off|gone|not working)|(won'?t|doesn'?t|not) (get|gets|getting|run|running) hot|only (cold|lukewarm) water|water (is )?(only )?(cold|lukewarm)/i };

/** Words that mean a space heater or a wall heater, which is not the water heater the demo is about. */
const OTHER_HEATER = /space heater|baseboard|portable heater|electric heater|wall heater|heat lamp|radiant|towel (warmer|heater)/i;
/** A water heater problem, not a toilet tank or a space heater. */
export function mentionsWaterHeater(text: string): boolean {
  if (/water heater|hot water (heater|tank)|water tank|tankless/i.test(text)) return true;
  return /\bheater\b/i.test(text) && !OTHER_HEATER.test(text);
}

const SEEDED_HEATER: Rule = { test: /./ };

export function isGasEmergency(text: string): boolean {
  return GAS.test.test(text) || CARBON_MONOXIDE.test.test(text);
}

/**
 * Emergencies skip do-it-yourself fixes. The tenant only gets the safety action
 * (get out, call for help), and the owner is alerted right away.
 */
function emergency(partial: Omit<TriageResult, "urgency" | "confidence" | "suggestedTrade" | "alertOwnerNow"> & { suggestedTrade: string }): TriageResult {
  return { ...partial, urgency: "emergency", confidence: 0.9, alertOwnerNow: true };
}

const TOILET_OVERFLOW: Rule = { test: /toilet[^.]{0,50}(overflow|overflowing|spilling|running over|will not stop|won'?t stop)|overflow(ing)?[^.]{0,20}toilet/i };

const NO_HEAT: Rule = { test: /no heat|without heat|heat (is )?(out|off|not working)|furnace (is )?(out|off|not (working|heating))|heater (is )?(not|n't) (working|heating)|house is freezing|freezing in (here|the house)/i };

const GENERIC_QUESTIONS = [
  "When did this start, and is it getting worse?",
  "Is anything else affected, like other rooms, outlets, or appliances?",
  "Is there any water, smoke, or smell that you have not mentioned yet?",
];

interface Category {
  name: string;
  trade: string;
  test: RegExp;
  urgency: "urgent" | "routine";
  /** 2 to 4 safe steps that match the problem. Never a gas valve, never opening an appliance. */
  steps: string[];
}

const GENERAL_STEPS = [
  "Stop using the item or area until it has been checked.",
  "Keep children and pets away from it.",
  "If you see water, smoke, sparks, or smell gas, tell us right away and follow the emergency steps.",
];

// Checked in order. First match wins. Appliances and roofs come before plumbing,
// so "dishwasher will not drain" and "roof leak" are not mistaken for pipe problems.
const CATEGORIES: Category[] = [
  {
    name: "HVAC", trade: "Licensed HVAC technician", urgency: "urgent",
    test: /no heat|heater (is )?(not|n't) working|furnace|thermostat|air condition|\ba\/c\b|\bac\b|no cooling|hvac/i,
    steps: [
      "Check that the thermostat is set to the right mode and has power.",
      "If you can see a clean filter slot, check that the filter is not blocked.",
      "Do not open the unit or touch any gas parts.",
    ],
  },
  {
    name: "Appliance", trade: "Appliance repair technician", urgency: "routine",
    test: /fridge|refrigerator|dishwasher|oven|stove|\brange\b|washer|dryer|microwave|freezer/i,
    steps: [
      "Stop using the appliance, and unplug it only if the cord is dry and easy to reach.",
      "Keep the floor around it dry.",
      "Do not take it apart.",
    ],
  },
  {
    name: "Roof and structure", trade: "Roofer or general contractor", urgency: "urgent",
    test: /roof|ceiling|gutter|crack|mold|mould|leaning|foundation/i,
    steps: [
      "Move furniture and valuables away from any drip or stain.",
      "Put a bucket under a drip, and keep the room as dry as you can.",
      "Stay out of a room if the ceiling is sagging.",
    ],
  },
  {
    name: "Plumbing", trade: "Licensed plumber", urgency: "routine",
    test: /toilet|clog|drain|sink|faucet|shower|bathtub|\btub\b|pipe|plumb|leak|drip/i,
    steps: [
      "Stop using the fixture, and do not pour chemical drain cleaner into it.",
      "Put a towel or bucket under any drip.",
      "If water will not stop, turn the small valve under the sink or behind the toilet clockwise.",
    ],
  },
  {
    name: "Electrical", trade: "Licensed electrician", urgency: "routine",
    test: /outlet|electric|breaker|light switch|\blights?\b|wiring|power (is )?out|no power/i,
    steps: [
      "Stop using the outlet, switch, or light that is not working.",
      "Do not touch bare wires, and keep the area dry.",
      "Check whether the problem is only one room. Tell us what you find.",
    ],
  },
  {
    name: "Locks and doors", trade: "Locksmith or handyperson", urgency: "urgent",
    test: /\block\b|locked out|\bkey\b|front door|back door|door (won'?t|will not|does not)|broken window|window won'?t/i,
    steps: [
      "Do not force the lock or the door.",
      "If you are locked out, wait somewhere safe and tell us.",
      "If a window or door will not lock, do not leave the home unattended.",
    ],
  },
  {
    name: "Pests", trade: "Pest control", urgency: "routine",
    test: /mice|mouse|\brats?\b|roach|cockroach|\bants?\b|bed ?bugs?|termite|pest|bugs/i,
    steps: [
      "Keep food in sealed containers and take out the trash.",
      "Do not set out poison. It can harm children and pets.",
      "Take a photo of anything you find, so the owner can pick the right treatment.",
    ],
  },
];

function snippet(text: string): string {
  const clean = text.trim().replace(/\s+/g, " ");
  return clean.length > 80 ? `${clean.slice(0, 77)}...` : clean;
}

/** The seeded water heater scenario. */
export function seededHeaterTriage(): TriageResult {
  return {
    category: "Plumbing",
    urgency: "urgent",
    summary:
      "The water heater is leaking from the bottom and the garage floor is wet. This needs a plumber soon. It is not an emergency unless the leak is large or water is reaching living areas.",
    likelyCause:
      "Tank failure or a corroded tank bottom. A leak from the bottom of the tank usually means the tank has worn through, not that a fitting came loose.",
    safetySteps: [
      "Turn off the water supply valve to the heater.",
      "Lay towels around the base and move anything that can get wet.",
      "Do not touch the heater if you are standing in water near anything electrical.",
      "If you smell gas at any time, leave the home and call 911 or your gas company. Do not touch the gas valve.",
    ],
    tenantQuestions: [
      "How fast is the leak: a slow drip, a steady stream, or a gush?",
      "Is any water reaching the living areas of the house?",
      "Do you smell gas near the heater?",
    ],
    suggestedTrade: "Licensed plumber",
    confidence: 0.82,
    alertOwnerNow: false,
  };
}

export function triageText(description: string): TriageResult {
  const text = description ?? "";

  if (isGasEmergency(text)) {
    return emergency({
      category: "Gas safety",
      summary:
        "A gas smell can be dangerous. Treat this as an emergency until a professional says it is safe.",
      likelyCause:
        "A gas leak at an appliance, a gas line, or a fitting. It cannot be judged safely from a description or a photo.",
      safetySteps: [
        "Leave the home now, with everyone inside, and leave the door open.",
        "Do not use light switches, phones, lighters, or anything that could spark while you are inside.",
        "From outside, call 911 or your gas company's emergency number (PG&E customers: 1-800-743-5000).",
        "Do not go back in until they tell you it is safe.",
      ],
      tenantQuestions: [
        "Is everyone out of the home, including pets?",
        "Did you call 911 or the gas company?",
        "Where was the smell strongest?",
      ],
      suggestedTrade: "Gas company, then a licensed plumber",
    });
  }

  if (FIRE_OR_SPARKS.test.test(text)) {
    return emergency({
      category: "Fire or electrical safety",
      summary: "Smoke, burning smells, or sparks can mean a fire risk. Treat this as an emergency.",
      likelyCause: "An overheated or damaged wire, outlet, or appliance. It needs a professional right away.",
      safetySteps: [
        "If you see flames or heavy smoke, get everyone out and call 911.",
        "If it is safe, unplug the item or turn off its breaker. Do not touch anything that is wet or sparking.",
        "Stay out of the area until a professional says it is safe.",
        "Do not use the outlet, appliance, or circuit again until it is checked.",
      ],
      tenantQuestions: [
        "Is anyone in danger, and is everyone out?",
        "Where is the smoke, smell, or sparking coming from?",
        "Did you call 911 or the fire department?",
      ],
      suggestedTrade: "Fire department if there is fire, then a licensed electrician",
    });
  }

  if (SECURITY.test.test(text)) {
    return emergency({
      category: "Security",
      summary: "Someone getting in, or trying to, is a police matter first. Treat this as an emergency.",
      likelyCause: "A break-in or someone who should not be there. It is not a repair problem.",
      safetySteps: [
        "If you are in danger, get to a safe place and call 911. Do not confront anyone.",
        "If you cannot leave safely, lock yourself in a room with a phone and stay quiet until help comes.",
        "Do not go back in or clean up until the police say it is safe.",
        "Tell GoHome once you are safe so your landlord can arrange a lock repair.",
      ],
      tenantQuestions: ["Are you and everyone with you safe?", "Did you call 911?", "Is a door, window, or lock damaged?"],
      suggestedTrade: "Police (911), then a locksmith",
    });
  }

  if (WATER_AND_ELECTRIC.test.test(text)) {
    return emergency({
      category: "Fire or electrical safety",
      summary: "Water near wiring, lights, or outlets can cause a shock or a fire. Treat this as an emergency.",
      likelyCause: "A leak that has reached electrical parts, often from the floor above or the roof. It needs an electrician and a plumber.",
      safetySteps: [
        "Stay away from the wet area and do not touch any light, switch, outlet, or fixture that is wet or near water.",
        "If you can reach the breaker panel without stepping in water, switch off the power to that area.",
        "If you see sparks, smoke, or smell burning, get everyone out and call 911.",
        "Do not use that light or outlet again until it has been checked.",
      ],
      tenantQuestions: ["Is water dripping from a light or a ceiling fan?", "Can you reach the breaker panel without standing in water?", "Did you call 911 if you saw sparks or smoke?"],
      suggestedTrade: "Licensed electrician, then a plumber",
    });
  }

  if (FLOODING.test.test(text)) {
    return emergency({
      category: "Plumbing",
      summary: "A lot of water is escaping. Stop the water first to limit damage.",
      likelyCause: "A burst or failed pipe, a supply line, or a backup. A plumber needs to find the source.",
      safetySteps: [
        "Turn off the main water shut-off valve for the home.",
        "If water is near outlets or appliances, stay away and turn off power at the breaker only if it is dry and safe to reach.",
      ],
      tenantQuestions: [
        "Where is the water coming from, and can you find the main shut-off?",
        "Is water reaching outlets, ceilings, or other rooms?",
        "How long has it been running?",
      ],
      suggestedTrade: "Emergency plumber",
    });
  }

  if (TOILET_OVERFLOW.test.test(text)) {
    return {
      category: "Plumbing",
      urgency: "urgent",
      summary: `A toilet is overflowing: "${snippet(text)}". Stop the water first to limit damage, then a plumber should look at it soon.`,
      likelyCause: "A blockage in the toilet or the drain line, or a fill valve that is stuck open.",
      safetySteps: [
        "Do not flush again.",
        "Lift the tank lid and push the flapper down, or turn the small valve behind the toilet clockwise to stop the water.",
        "Put towels around the base, and keep power strips and outlets away from the water.",
      ],
      tenantQuestions: [
        "Did the water stop after you closed the valve?",
        "Is water reaching other rooms, carpet, or outlets?",
        "Are other drains in the home also slow or backing up?",
      ],
      suggestedTrade: "Licensed plumber",
      confidence: 0.78,
      alertOwnerNow: false,
    };
  }

  if (NO_HEAT.test.test(text) && !/water heater|hot water/i.test(text)) {
    return {
      category: "HVAC",
      urgency: "urgent",
      summary: "There is no heat. In cold weather that needs fast attention, so the owner has been alerted right away.",
      likelyCause: "A furnace or thermostat problem. A technician has to find which.",
      // No do-it-yourself steps: furnaces are gas appliances and should not be opened by a tenant.
      safetySteps: [],
      tenantQuestions: [
        "Is the thermostat set to heat, and does it have power or a blank screen?",
        "Do you smell gas or anything burning?",
        "Is anyone in the home very young, elderly, or unwell?",
      ],
      suggestedTrade: "Licensed HVAC technician",
      confidence: 0.7,
      alertOwnerNow: true,
    };
  }

  if (NO_HOT_WATER.test.test(text) && !mentionsWaterHeater(text)) {
    return {
      category: "Plumbing",
      urgency: "urgent",
      summary: "There is no hot water. In California hot water counts as a basic need, so the owner has been alerted.",
      likelyCause: "A water heater problem, such as a pilot light, a thermostat, a tripped breaker, or a failed part. A technician has to find which.",
      // No do-it-yourself steps: water heaters are often gas appliances and should not be opened by a tenant.
      safetySteps: [],
      tenantQuestions: ["Is there no hot water anywhere, or just at one tap?", "Do you smell gas or anything burning near the water heater?", "Is there any water on the floor near the water heater?"],
      suggestedTrade: "Licensed plumber",
      confidence: 0.7,
      alertOwnerNow: true,
    };
  }

  if (mentionsWaterHeater(text)) return seededHeaterTriage();

  const category = CATEGORIES.find((c) => c.test.test(text));
  const name = category?.name ?? "General maintenance";
  const trade = category?.trade ?? "Handyperson";
  const urgency = category?.urgency ?? "routine";
  return {
    category: name,
    urgency,
    summary: `This sounds like ${/^[aeiou]/i.test(name) ? "an" : "a"} ${name.toLowerCase()} issue: "${snippet(text)}". ${
      urgency === "urgent"
        ? "It should be looked at soon, but it does not sound like an emergency."
        : "It can wait for a normal visit unless it gets worse."
    }`,
    likelyCause:
      "Hard to say from the description alone. A photo or a visit will confirm the cause. This is a rough sample guess.",
    safetySteps: category ? category.steps : GENERAL_STEPS,
    tenantQuestions: GENERIC_QUESTIONS,
    suggestedTrade: trade,
    confidence: category ? 0.64 : 0.5,
  };
}
