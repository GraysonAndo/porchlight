import { describe, expect, it } from "vitest";
import { guideForStep } from "../lib/safetyGuides";
import { triageText } from "../lib/triage";
import { SEED_REQUEST_TEXT } from "../lib/seed";

// Built from character codes so this file itself contains no dash characters.
const DASHES = new RegExp(`${String.fromCharCode(0x2014)}|${String.fromCharCode(0x2013)}`);

// Every kind of request the mock triage can produce.
const REQUESTS = [
  SEED_REQUEST_TEXT,
  "I smell gas near the water heater",
  "There is smoke coming from the outlet",
  "A pipe burst and water is everywhere",
  "The toilet is clogged",
  "The cabinet door is loose",
];

const ALL_STEPS = Array.from(new Set(REQUESTS.flatMap((r) => triageText(r).safetySteps)));

describe("safety guides", () => {
  it("covers every safety step the triage can produce", () => {
    const missing = ALL_STEPS.filter((step) => guideForStep(step) === null);
    expect(missing).toEqual([]);
  });

  it("gives every guide a title, a reason, and at least three steps", () => {
    for (const step of ALL_STEPS) {
      const g = guideForStep(step)!;
      expect(g.title.length).toBeGreaterThan(5);
      expect(g.why.length).toBeGreaterThan(20);
      expect(g.steps.length).toBeGreaterThanOrEqual(3);
      expect(g.time.length).toBeGreaterThan(0);
      expect(g.youNeed.length).toBeGreaterThan(0);
    }
  });

  it("uses no em or en dashes", () => {
    for (const step of ALL_STEPS) {
      const g = guideForStep(step)!;
      const text = JSON.stringify(g);
      expect(text).not.toMatch(DASHES);
    }
  });

  it("gives the water valve guide a valve diagram and a stop-and-get-help list", () => {
    const g = guideForStep("Turn off the water supply valve to the heater.")!;
    expect(g.diagram).toBe("valve");
    expect(g.stopIf.length).toBeGreaterThan(0);
    expect(g.steps.join(" ")).toMatch(/clockwise/);
  });

  it("warns about gas inside the gas valve guide", () => {
    const g = guideForStep("Turn the gas valve to pilot or off.")!;
    expect(g.steps[0]).toMatch(/smell gas/i);
    expect(g.stopIf.join(" ")).toMatch(/smell gas/i);
    expect(g.steps.join(" ")).toMatch(/PILOT/);
  });

  it("tells a tenant not to relight the pilot", () => {
    const g = guideForStep("Turn the gas valve to pilot or off.")!;
    expect(g.steps.join(" ")).toMatch(/not try to relight/i);
  });

  it("uses the house record: an electric heater gets breaker steps, not a gas knob", () => {
    const g = guideForStep("Turn the gas valve to pilot or off.", {
      manufacturer: "Hearthline",
      model: "HL-40E",
      fuelType: "Electric",
    })!;
    expect(g.id).toBe("heater-power-off");
    expect(g.title).toMatch(/power/i);
    expect(g.steps.join(" ")).toMatch(/breaker/i);
    expect(g.steps.join(" ")).not.toMatch(/PILOT/);
    expect(g.recordNote).toContain("electric");
  });

  it("uses the house record: a gas heater mentions the saved brand, model, and fuel", () => {
    const g = guideForStep("Turn the gas valve to pilot or off.", {
      manufacturer: "Hearthline",
      model: "HL-40G-NG",
      fuelType: "Natural gas",
    })!;
    expect(g.id).toBe("gas-valve");
    expect(g.recordNote).toContain("Hearthline HL-40G-NG");
    expect(g.recordNote).toContain("natural gas");
  });

  it("points to the label step when the fuel type is not known", () => {
    const g = guideForStep("Turn the gas valve to pilot or off.")!;
    expect(g.recordNote).toMatch(/label/i);
  });

  it("returns null for text it has no guide for", () => {
    expect(guideForStep("Do a cartwheel.")).toBeNull();
  });

  it("never tells people to go back in for the leak during a gas emergency", () => {
    const g = guideForStep("Leave the home now, with everyone inside, and leave the door open.")!;
    expect(g.stopIf.join(" ")).toMatch(/never go back in/i);
  });
});
