import { describe, expect, it } from "vitest";
import { isGasEmergency, triageText } from "../lib/triage";
import { SEED_REQUEST_TEXT } from "../lib/seed";

describe("triageText safety rules", () => {
  it.each([
    "I smell gas near the water heater",
    "There is a gas smell in the kitchen",
    "the house smells like rotten eggs",
    "Gas is leaking from the stove",
    "My carbon monoxide alarm is going off",
    "CO detector keeps beeping",
  ])("treats %j as a gas emergency with leave-the-home advice", (text) => {
    const r = triageText(text);
    expect(r.urgency).toBe("emergency");
    expect(r.category).toBe("Gas safety");
    expect(r.safetySteps[0].toLowerCase()).toContain("leave the home");
    expect(r.safetySteps.join(" ")).toContain("911");
  });

  it("gas smell beats the water heater scenario", () => {
    const r = triageText("water heater is leaking and I smell gas");
    expect(r.urgency).toBe("emergency");
    expect(r.category).toBe("Gas safety");
  });

  it.each(["There is smoke coming from the outlet", "The plug is sparking", "I smell something burning"])(
    "treats %j as a fire or electrical emergency",
    (text) => {
      const r = triageText(text);
      expect(r.urgency).toBe("emergency");
      expect(r.category).toBe("Fire or electrical safety");
    },
  );

  it.each(["A pipe burst and water is everywhere", "The bathroom is flooding", "sewage is coming up the drain"])(
    "treats %j as a flooding emergency",
    (text) => {
      const r = triageText(text);
      expect(r.urgency).toBe("emergency");
      expect(r.safetySteps[0].toLowerCase()).toContain("main water shut-off");
    },
  );

  it("does not call a normal gas stove request an emergency", () => {
    expect(isGasEmergency("The gas stove igniter clicks slowly")).toBe(false);
  });
});

describe("triageText seeded and generic results", () => {
  it("returns the seeded urgent plumbing scenario for the seed request", () => {
    const r = triageText(SEED_REQUEST_TEXT);
    expect(r.category).toBe("Plumbing");
    expect(r.urgency).toBe("urgent");
    expect(r.confidence).toBe(0.82);
    expect(r.safetySteps).toHaveLength(4);
  });

  it("gives a plumbing routine result for a clogged toilet, not the water heater result", () => {
    const r = triageText("The toilet is clogged");
    expect(r.category).toBe("Plumbing");
    expect(r.urgency).toBe("routine");
    expect(r.summary).toContain("toilet");
    expect(r.likelyCause).not.toContain("tank");
  });

  it.each([
    ["The furnace is not heating", "HVAC"],
    ["The outlet in the bedroom does not work", "Electrical"],
    ["The dishwasher will not drain", "Appliance"],
    ["I think we have mice", "Pests"],
  ])("categorizes %j as %s", (text, category) => {
    expect(triageText(text).category).toBe(category);
  });

  it("falls back to general maintenance with lower confidence", () => {
    const r = triageText("The cabinet door is loose");
    expect(r.category).toBe("General maintenance");
    expect(r.confidence).toBeLessThan(0.6);
  });

  it("is deterministic", () => {
    expect(triageText("The toilet is clogged")).toEqual(triageText("The toilet is clogged"));
  });

  it("handles an empty description", () => {
    expect(triageText("").category).toBe("General maintenance");
  });
});

describe("triageText escalation", () => {
  it("alerts the owner right away for every emergency", () => {
    for (const text of ["I smell gas", "smoke from the outlet", "a pipe burst and water is everywhere"]) {
      expect(triageText(text).alertOwnerNow).toBe(true);
    }
  });

  it("keeps the seeded leak quiet: the owner gets a heads-up, not an alarm", () => {
    const r = triageText(SEED_REQUEST_TEXT);
    expect(r.urgency).toBe("urgent");
    expect(r.alertOwnerNow).toBe(false);
  });

  it("gives no do-it-yourself fix steps for a gas smell, only getting out and calling for help", () => {
    const steps = triageText("I smell gas near the water heater").safetySteps.join(" ").toLowerCase();
    expect(steps).toContain("leave the home");
    expect(steps).not.toMatch(/valve|turn off the gas|relight|pilot/);
  });

  it("treats no heat as an alert with no fix steps", () => {
    const r = triageText("We have no heat and it is freezing");
    expect(r.category).toBe("HVAC");
    expect(r.alertOwnerNow).toBe(true);
    expect(r.safetySteps).toEqual([]);
  });

  it("does not mistake a cold water heater complaint for no heat", () => {
    expect(triageText("the water heater is not working, no hot water").category).not.toBe("HVAC");
  });
});

describe("triage covers the cases the QA report raised", () => {
  it.each([
    "I smell gas and I feel dizzy",
    "I feel dizzy and have a headache near the furnace",
    "My head is spinning, I am nauseous, and the heater smells strange",
  ])("treats %j as a gas or carbon monoxide emergency with no fix steps", (text) => {
    const r = triageText(text);
    expect(r.urgency).toBe("emergency");
    expect(r.alertOwnerNow).toBe(true);
    expect(r.safetySteps[0].toLowerCase()).toContain("leave the home");
  });

  it("does not return the water heater result for an overflowing toilet", () => {
    const r = triageText("The toilet is clogged and overflowing");
    expect(r.category).toBe("Plumbing");
    expect(r.urgency).toBe("urgent");
    expect(r.summary).toMatch(/toilet/i);
    expect(r.likelyCause).not.toMatch(/tank/i);
    expect(r.safetySteps.join(" ")).toMatch(/do not flush/i);
    expect(r.safetySteps.join(" ")).not.toMatch(/gas|heater/i);
  });

  it("gives 2 to 4 safe steps that match the problem for every ordinary category", () => {
    const cases: [string, RegExp][] = [
      ["The kitchen sink is clogged", /drain cleaner/i],
      ["The dishwasher will not drain", /unplug|appliance/i],
      ["The outlet in the bedroom does not work", /outlet/i],
      ["I think we have mice", /food/i],
      ["The roof is leaking in the hallway", /bucket/i],
    ];
    for (const [text, expected] of cases) {
      const r = triageText(text);
      expect(r.safetySteps.length).toBeGreaterThanOrEqual(2);
      expect(r.safetySteps.length).toBeLessThanOrEqual(4);
      expect(r.safetySteps.join(" ")).toMatch(expected);
    }
  });

  it("never tells a tenant to turn, open, or relight anything on a gas line, for any request", () => {
    const requests = [
      "water heater is leaking",
      "The water heater is leaking from the bottom and the floor in the garage is wet.",
      "I smell gas near the water heater",
      "We have no heat",
      "The furnace is making a loud noise",
      "The stove igniter clicks slowly",
      "The toilet is clogged and overflowing",
    ];
    for (const text of requests) {
      const steps = triageText(text).safetySteps.join(" ").toLowerCase();
      expect(steps).not.toMatch(/turn (the )?gas|gas (knob|valve) to|pilot|relight|shut off the gas/);
    }
  });

  it("labels urgency with the three buckets from the spec", async () => {
    const { URGENCY_LABEL } = await import("../lib/triage");
    expect(Object.values(URGENCY_LABEL)).toEqual(["EMERGENCY", "SOON", "ROUTINE"]);
  });
});

describe("triage: safety wording that used to slip through", () => {
  const level = (t: string) => triageText(t).urgency;
  it("treats a break-in as an emergency, with police first and no repair steps", () => {
    for (const t of ["someone is trying to break in", "I think there is an intruder", "my place was broken into", "a burglar got in"]) {
      expect(level(t)).toBe("emergency");
      expect(triageText(t).category).toBe("Security");
      expect(triageText(t).safetySteps.join(" ")).toMatch(/911/);
    }
  });

  it("treats a bare gas message as a possible gas leak, to be safe", () => {
    expect(level("gas")).toBe("emergency");
    expect(level("Gas!")).toBe("emergency");
    expect(level("my gas bill is too high")).not.toBe("emergency");
  });

  it("treats water at a light, a fan, an outlet or the wiring as an emergency", () => {
    for (const t of ["water is coming through the ceiling light fixture", "the ceiling fan is dripping water", "there is a leak by the breaker panel", "the outlet in the garage is wet"]) {
      expect(level(t)).toBe("emergency");
      expect(triageText(t).category).toBe("Fire or electrical safety");
    }
  });

  it("raises no hot water to urgent, without do-it-yourself steps", () => {
    const r = triageText("we have no hot water");
    expect(r.urgency).toBe("urgent");
    expect(r.safetySteps).toEqual([]);
    expect(r.alertOwnerNow).toBe(true);
  });

  it("does not mistake a toilet tank or a space heater for the water heater", () => {
    expect(triageText("the toilet tank keeps running").summary).not.toMatch(/water heater/i);
    expect(triageText("my space heater smells weird and stopped working").summary).not.toMatch(/water heater/i);
    expect(triageText("the water heater is leaking from the bottom").summary).toMatch(/water heater/i);
  });
});
