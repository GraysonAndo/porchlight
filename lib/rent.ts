// California AB 1482 rent increase screen. Plain math, no AI.
// DRAFT, NOT LEGAL ADVICE. Local rules can be stricter than state law.
//
// Money math runs in whole cents so results never drift by a penny.

import { addDays, longDate, usdCents } from "./format";

export const BASE_CAP_PERCENT = 5;
export const MAX_CAP_PERCENT = 10;
export const DEFAULT_CPI_PERCENT = 3.0;
export const MAX_INCREASES_PER_12_MONTHS = 2;

export interface RentInputs {
  currentRent: number;
  /** Local CPI change, in percent. Placeholder until the owner looks it up. */
  cpiPercent: number;
  proposedRent: number;
  tenancy12Plus: boolean;
  increasesInLast12Months: number;
  singleFamilyOrCondo: boolean;
  /** Not owned by a REIT, a corporation, or an LLC with a corporate member */
  notCorporateOwned: boolean;
  /** Tenant was given the required written exemption notice */
  exemptionNoticeGiven: boolean;
  buildingUnder15Years: boolean;
}

export interface RentResult {
  capPercent: number;
  /** Rounded down to the cent */
  maxNewRent: number;
  proposedRent: number;
  increaseAmount: number;
  increasePercent: number;
  withinCap: boolean;
  /** Dollars over the cap, zero when within it */
  overCapBy: number;
  noticeDays: 30 | 90;
  mayBeExempt: boolean;
  exemptionReason: string | null;
  /** True when two increases were already given in the last 12 months */
  tooManyIncreases: boolean;
}

export function capPercentFor(cpiPercent: number): number {
  return Math.min(BASE_CAP_PERCENT + cpiPercent, MAX_CAP_PERCENT);
}

const toCents = (dollars: number) => Math.round(dollars * 100);

/** Highest allowed new rent: current rent times (1 + cap), rounded down to the cent. */
export function maxNewRentFor(currentRent: number, capPercent: number): number {
  const cents = toCents(currentRent);
  // Cap in units of 0.0001 percent, so 8.0% is 80000 over a base of 1,000,000.
  const capUnits = Math.round(capPercent * 10000);
  return Math.floor((cents * (1000000 + capUnits)) / 1000000) / 100;
}

/** 30 days when the increase is 10% or less, otherwise 90 days. */
export function noticeDaysFor(currentRent: number, proposedRent: number): 30 | 90 {
  const current = toCents(currentRent);
  const increase = toCents(proposedRent) - current;
  return increase * 100 <= current * 10 ? 30 : 90;
}

export function exemptionFor(inputs: RentInputs): { mayBeExempt: boolean; reason: string | null } {
  const houseExemption =
    inputs.singleFamilyOrCondo && inputs.notCorporateOwned && inputs.exemptionNoticeGiven;
  if (houseExemption) {
    return {
      mayBeExempt: true,
      reason:
        "Single family home or condo, not owned by a REIT, corporation, or LLC with a corporate member, and the written exemption notice was given.",
    };
  }
  if (inputs.buildingUnder15Years) {
    return { mayBeExempt: true, reason: "The building is less than 15 years old." };
  }
  return { mayBeExempt: false, reason: null };
}

export function calculateRent(inputs: RentInputs): RentResult {
  const capPercent = capPercentFor(inputs.cpiPercent);
  const maxNewRent = maxNewRentFor(inputs.currentRent, capPercent);
  const currentCents = toCents(inputs.currentRent);
  const proposedCents = toCents(inputs.proposedRent);
  const increaseCents = proposedCents - currentCents;
  const maxCents = toCents(maxNewRent);
  const withinCap = proposedCents <= maxCents;
  const exemption = exemptionFor(inputs);

  return {
    capPercent,
    maxNewRent,
    proposedRent: inputs.proposedRent,
    increaseAmount: increaseCents / 100,
    increasePercent: currentCents > 0 ? (increaseCents / currentCents) * 100 : 0,
    withinCap,
    overCapBy: withinCap ? 0 : (proposedCents - maxCents) / 100,
    noticeDays: noticeDaysFor(inputs.currentRent, inputs.proposedRent),
    mayBeExempt: exemption.mayBeExempt,
    exemptionReason: exemption.reason,
    tooManyIncreases: inputs.increasesInLast12Months >= MAX_INCREASES_PER_12_MONTHS,
  };
}

export interface NoticeInput {
  ownerName: string;
  tenantName: string;
  address: string;
  currentRent: number;
  newRent: number;
  /** ISO date (YYYY-MM-DD) the owner plans to give the notice */
  noticeDate: string;
  noticeDays: number;
}

export function effectiveDateFor(noticeDate: string, noticeDays: number): string {
  return addDays(noticeDate, noticeDays);
}

/** Plain-language rent increase notice, stamped as a draft. */
export function buildNotice(input: NoticeInput): string {
  const effective = longDate(effectiveDateFor(input.noticeDate, input.noticeDays));
  const given = longDate(input.noticeDate);
  return [
    "DRAFT, NOT LEGAL ADVICE",
    "",
    "NOTICE OF RENT INCREASE",
    "",
    `Date of notice: ${given || "(add date)"}`,
    `To: ${input.tenantName}`,
    `From: ${input.ownerName}`,
    `Property: ${input.address}`,
    "",
    `Your rent is changing. Your current rent is ${usdCents(input.currentRent)} per month.`,
    `Starting ${effective || "(add date)"}, your new rent will be ${usdCents(input.newRent)} per month.`,
    "",
    `This notice gives you ${input.noticeDays} days before the change starts.`,
    "All other terms of your tenancy stay the same.",
    "",
    "If you have questions, please contact me.",
    "",
    "",
    "Owner signature: ______________________________",
    `Printed name: ${input.ownerName}`,
    "Date signed: __________________________________",
    "",
    "DRAFT, NOT LEGAL ADVICE. Local rules can be stricter than state law. Check before sending.",
  ].join("\n");
}
