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
