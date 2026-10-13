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
  "The toilet is clogged and overflowing",
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

  it("never gives a tenant a guide for operating a gas valve", () => {
    expect(guideForStep("Turn the gas valve to pilot or off.")).toBeNull();
    const g = guideForStep("If you smell gas at any time, leave the home and call 911 or your gas company. Do not touch the gas valve.")!;
    expect(g.id).toBe("gas-smell-any-time");
    const text = g.steps.join(" ");
    expect(text).toMatch(/leave the home/i);
    expect(text).toMatch(/do not touch the gas valve/i);
    expect(text).not.toMatch(/turn the knob|pilot|relight/i);
  });

  it("returns null for text it has no guide for", () => {
    expect(guideForStep("Do a cartwheel.")).toBeNull();
  });

  it("never tells people to go back in for the leak during a gas emergency", () => {
    const g = guideForStep("Leave the home now, with everyone inside, and leave the door open.")!;
    expect(g.stopIf.join(" ")).toMatch(/never go back in/i);
  });
});
