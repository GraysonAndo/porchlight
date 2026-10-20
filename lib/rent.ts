// California AB 1482 rent increase screen. Plain math, no AI.
// DRAFT, NOT LEGAL ADVICE. Local rules can be stricter than state law.
//
// Money math runs in whole cents so results never drift by a penny.

import { addDays, longDate, usdCents } from "./format";

export const BASE_CAP_PERCENT = 5;
export const MAX_CAP_PERCENT = 10;
export const DEFAULT_CPI_PERCENT = 3.0;
export const MAX_INCREASES_PER_12_MONTHS = 2;

/** One home renting for more than this per month is almost surely a typing mistake. */
export const MAX_SANE_RENT = 25000;

/** Dollars rounded to the cent, so 1234.567 is 1234.57 and nothing downstream sees 1234.5670166015625. */
export function roundToCents(dollars: number): number {
  return Math.round((dollars + Number.EPSILON) * 100) / 100;
}

/** A rent number that is too big to be real for one home. */
export function rentLooksTooHigh(dollars: number): boolean {
  return dollars > MAX_SANE_RENT;
}

export type NoticeKind = "increase" | "decrease" | "none";

/** Whether the change from the current rent to the new rent is an increase, a decrease, or no change at all. */
export function noticeKindFor(currentRent: number, newRent: number): NoticeKind {
  const diff = toCentsSafe(newRent) - toCentsSafe(currentRent);
  return diff > 0 ? "increase" : diff < 0 ? "decrease" : "none";
}

function toCentsSafe(dollars: number): number {
  return Math.round(dollars * 100);
}

export interface RentInputs {
  currentRent: number;
  /** Local inflation (CPI) change, in percent. A sample number until it is looked up. */
  cpiPercent: number;
  proposedRent: number;
  tenancy12Plus: boolean;
  increasesInLast12Months: number;
  /**
   * How much the rent went up in total over the last 12 months, in percent (0 when it did not). The yearly cap is measured
   * over any 12 months, so an increase already given uses up part of the room.
   */
  priorIncreasePercent?: number;
  singleFamilyOrCondo: boolean;
  /** Not owned by a large investment company (REIT), a corporation, or an LLC with a corporate member */
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
  /** True when two increases were already given in the last 12 months, so a third is not allowed */
  tooManyIncreases: boolean;
}

export function capPercentFor(cpiPercent: number): number {
  return Math.min(BASE_CAP_PERCENT + cpiPercent, MAX_CAP_PERCENT);
}

const toCents = (dollars: number) => Math.round(dollars * 100);

/**
 * Highest allowed new rent: the rent a year ago times (1 + cap), rounded down to the cent. With no earlier increase the rent
 * a year ago is the current rent. After one, it is the current rent taken back by that increase.
 */
export function maxNewRentFor(currentRent: number, capPercent: number, priorIncreasePercent = 0): number {
  const cents = toCents(currentRent);
  // Percentages in units of 0.0001 percent, so 8.0% is 80000 over a base of 1,000,000.
  const capUnits = Math.round(capPercent * 10000);
  const priorUnits = Math.round(Math.max(0, priorIncreasePercent) * 10000);
  return Math.floor((cents * (1000000 + capUnits)) / (1000000 + priorUnits)) / 100;
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
        "A single family home or condo, not owned by a large investment company or a corporation, where the tenant was given the written exemption notice.",
    };
  }
  if (inputs.buildingUnder15Years) {
    return { mayBeExempt: true, reason: "The building is less than 15 years old." };
  }
  return { mayBeExempt: false, reason: null };
}

export function calculateRent(inputs: RentInputs): RentResult {
  const capPercent = capPercentFor(inputs.cpiPercent);
  const maxNewRent = maxNewRentFor(inputs.currentRent, capPercent, inputs.priorIncreasePercent ?? 0);
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
  /** ISO date the new rent starts, when the owner picked one. Otherwise it is the notice date plus the notice days. */
  startDate?: string;
  /** How the notice will be delivered, for the service line */
  serviceMethod?: string;
  ownerAddress?: string;
  /** One sentence on why the increase is allowed, or why the home may be exempt */
  basis?: string;
}

export function effectiveDateFor(noticeDate: string, noticeDays: number): string {
  return addDays(noticeDate, noticeDays);
}

/**
 * The day the new rent starts: the owner's chosen date, unless the notice would not be early enough for it. An increase needs
 * its notice days first. A decrease can start any day from the notice date on.
 */
export function startDateFor(kind: NoticeKind, noticeDate: string, noticeDays: number, chosen?: string): string {
  const earliest = kind === "increase" ? effectiveDateFor(noticeDate, noticeDays) : noticeDate;
  return chosen && chosen >= earliest ? chosen : earliest;
}

/** Plain-language notice of a rent change, stamped as a draft. An increase and a decrease get different titles and wording. */
export function buildNotice(input: NoticeInput): string {
  const effective = longDate(startDateFor(noticeKindFor(input.currentRent, input.newRent), input.noticeDate, input.noticeDays, input.startDate));
  const given = longDate(input.noticeDate);
  const kind = noticeKindFor(input.currentRent, input.newRent);
  const title = kind === "decrease" ? "NOTICE OF RENT DECREASE" : kind === "none" ? "NOTICE OF NO RENT CHANGE" : "NOTICE OF RENT INCREASE";
  const opening =
    kind === "decrease"
      ? `Good news: your rent is going down. Your current rent is ${usdCents(input.currentRent)} per month.`
      : kind === "none"
        ? `Your rent is not changing. Your rent stays ${usdCents(input.currentRent)} per month.`
        : `Your rent is going up. Your current rent is ${usdCents(input.currentRent)} per month.`;
  return [
    "DRAFT, NOT LEGAL ADVICE",
    "",
    title,
    "",
    `Date of notice: ${given || "(add date)"}`,
    `To: ${input.tenantName}`,
    `From: ${input.ownerName}`,
    `Property: ${input.address}`,
    ...(input.ownerAddress ? [`Owner mailing address: ${input.ownerAddress}`] : []),
    `Delivery: ${input.serviceMethod ?? "first-class mail"}`,
    "",
    opening,
    ...(kind === "none"
      ? []
      : [
          `Starting ${effective || "(add date)"}, your new rent will be ${usdCents(input.newRent)} per month, ${kind === "decrease" ? "a decrease" : "an increase"} of ${usdCents(Math.abs(input.newRent - input.currentRent))} (${kind === "decrease" ? "-" : "+"}${((Math.abs(input.newRent - input.currentRent) / input.currentRent) * 100).toFixed(1)}%).`,
        ]),
    "",
    ...(kind === "increase" ? [`This notice gives you ${input.noticeDays} days before the change starts.`] : []),
    ...(input.basis && kind === "increase" ? [input.basis] : []),
    "All other terms of your tenancy stay the same.",
    "",
    "If you have questions, please contact me.",
    "",
    "",
    "Owner signature: ______________________________",
    `Printed name: ${input.ownerName}`,
    `Date signed: ${given || "__________________________________"}`,
    "",
    "DRAFT, NOT LEGAL ADVICE. Local rules can be stricter than state law. Check before sending.",
  ].join("\n");
}
