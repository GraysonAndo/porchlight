import { describe, expect, it } from "vitest";
import { answerHouseQuestion } from "../lib/houseQa";
import { NEW_HEATER_RECORD, PROPERTY } from "../lib/seed";
import type { WaterHeaterRecord } from "../lib/types";

const FROM_LABEL: WaterHeaterRecord = {
  manufacturer: "Hearthline",
  model: "HL-40G-NG",
  serial: "15C0412-X",
  capacityGallons: 40,
  fuelType: "Natural gas",
  manufactureDate: "2015-03",
  ageYears: 11,
  unconfirmed: [],
  photo: null,
  source: "Read from a label photo sent by the tenant",
};

const none = { heater: null, rentPaidAt: null };
const withHeater = { heater: FROM_LABEL, rentPaidAt: null };

describe("tenant Q&A: answers only from the data on file", () => {
  it("answers the rent amount from the lease", () => {
    const a = answerHouseQuestion("How much is my rent?", none);
    expect(a.known).toBe(true);
    expect(a.answer).toContain("$3,200");
    expect(a.source).toBe("Lease on file");
  });

  it("says it does not know what day rent is due, because that is not on file", () => {
    const a = answerHouseQuestion("What day is rent due?", none);
    expect(a.known).toBe(false);
    expect(a.answer).toMatch(/I don't know/);
    expect(a.answer).toContain(PROPERTY.owner);
  });

  it("reports the demo rent status", () => {
    expect(answerHouseQuestion("Did my rent payment go through?", none).answer).toMatch(/not marked paid/);
    expect(answerHouseQuestion("Did my rent payment go through?", { ...none, rentPaidAt: "2026-10-13T10:00:00Z" }).answer).toMatch(/marked paid/);
  });

  it("answers about the water heater from the record, and says so when the record is empty", () => {
    expect(answerHouseQuestion("How old is the water heater?", withHeater).answer).toMatch(/about 11 years old/);
    expect(answerHouseQuestion("What model is my water heater?", withHeater).answer).toContain("HL-40G-NG");
    expect(answerHouseQuestion("Is the water heater gas or electric?", withHeater).answer).toMatch(/natural gas/);
    const empty = answerHouseQuestion("What brand is the water heater?", none);
    expect(empty.answer).toMatch(/not on file yet/);
    expect(empty.answer).not.toContain("Hearthline");
  });

  it("never invents a warranty", () => {
    const a = answerHouseQuestion("Is the water heater under warranty?", withHeater);
    expect(a.known).toBe(false);
    expect(a.answer).toMatch(/I don't know/);
  });

  it("answers the new heater after it is installed", () => {
    expect(answerHouseQuestion("What is the serial number of the water heater?", { heater: NEW_HEATER_RECORD, rentPaidAt: null }).answer).toContain("26J0007-A");
  });

  it("answers the lease anniversary, and does not claim to know about renewal", () => {
    expect(answerHouseQuestion("When is my lease anniversary?", none).answer).toContain("December 14, 2026");
    const renew = answerHouseQuestion("Will my lease renew?", none);
    expect(renew.answer).toMatch(/don't have that decision/);
  });

  it("answers other equipment from the inspection and gives no brand or warranty", () => {
    expect(answerHouseQuestion("How old is the furnace?", none).answer).toMatch(/installed in 2012/);
    expect(answerHouseQuestion("What brand is the dishwasher?", none).known).toBe(false);
  });

  it.each([
    "Can I have a dog?",
    "Can I get a cat?",
    "How much is my security deposit?",
    "Is there guest parking?",
    "Can I smoke on the patio?",
    "Who pays for internet?",
    "What is the owner's phone number?",
    "What is the capital of France?",
  ])("says I don't know for %j instead of guessing", (q) => {
    const a = answerHouseQuestion(q, withHeater);
    expect(a.known).toBe(false);
    expect(a.answer).toMatch(/I don't know/);
    expect(a.answer).toContain(PROPERTY.owner);
  });

  it("does not mention a rent change when asked, because none is on file", () => {
    const a = answerHouseQuestion("Is my rent going up?", none);
    expect(a.known).toBe(false);
    expect(a.answer).toMatch(/I don't know about any rent change/);
  });

  it("handles an empty question", () => {
    expect(answerHouseQuestion("   ", none).answer).toMatch(/Ask me/);
  });
});
