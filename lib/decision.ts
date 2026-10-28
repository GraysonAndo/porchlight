// Repair vs replace. Plain rules, no AI. The same rules are shown on screen
// ("How we decided") so the owner can see exactly why.

/** "unknown leak" is a leak with no sign yet of where the water comes from, so the tank is not assumed to be the cause. */
export type FailureMode = "tank leak" | "unknown leak" | "other";

export interface DecisionInput {
  item: string;
  ageYears: number;
  typicalLifeYears: number;
  repairCost: number;
  replaceCost: number;
  failureMode: FailureMode;
}

export interface DecisionCheck {
  id: "age" | "cost" | "tank-leak";
  /** The rule in plain English */
  rule: string;
  triggered: boolean;
  /** The rule applied to the actual numbers */
  detail: string;
}

export interface DecisionResult {
  recommendation: "repair" | "replace";
  /** Plain English reasons, only for rules that triggered */
  reasons: string[];
  /** All rules, triggered or not, so the screen can show the full list */
  checks: DecisionCheck[];
  numbers: {
    ageYears: number;
    typicalLifeYears: number;
    agePercentOfLife: number;
    repairCost: number;
    replaceCost: number;
    repairPercentOfReplace: number;
  };
}

/** Replace once the item reaches 80% of its typical life. */
export const AGE_THRESHOLD = 0.8;
/** Replace once the repair costs half or more of a new one. */
export const COST_THRESHOLD = 0.5;

// Tolerance so values like 7.2 / 9 still count as exactly 80%.
const EPSILON = 1e-9;

/** top over bottom, or NaN when there is nothing sensible to divide by. NaN never triggers a rule and never prints as a percent. */
function ratio(top: number, bottom: number): number {
  return bottom > 0 && Number.isFinite(top) && Number.isFinite(bottom) ? top / bottom : Number.NaN;
}

const percentText = (r: number) => (Number.isFinite(r) ? `${Math.round(r * 100)}%` : "unknown");

export function decideRepairOrReplace(input: DecisionInput): DecisionResult {
  const { item, ageYears, typicalLifeYears, repairCost, replaceCost, failureMode } = input;

  const ageRatio = ratio(ageYears, typicalLifeYears);
  const costRatio = ratio(repairCost, replaceCost);
  const agePercentOfLife = Number.isFinite(ageRatio) ? Math.round(ageRatio * 100) : 0;
  const repairPercentOfReplace = Number.isFinite(costRatio) ? Math.round(costRatio * 100) : 0;

  const ageTriggered = ageRatio + EPSILON >= AGE_THRESHOLD;
  const costTriggered = costRatio + EPSILON >= COST_THRESHOLD;
  const leakTriggered = failureMode === "tank leak";

  const checks: DecisionCheck[] = [
    {
      id: "age",
      rule: "Replace if the age is 80% or more of the typical life.",
      triggered: ageTriggered,
      detail: `Age ${ageYears} years is ${percentText(ageRatio)} of the typical life of ${typicalLifeYears} years.`,
    },
    {
      id: "cost",
      rule: "Replace if the repair costs 50% or more of a new one.",
      triggered: costTriggered,
      detail: `The repair estimate is ${percentText(costRatio)} of the replacement cost.`,
    },
    {
      id: "tank-leak",
      rule: "Replace if the tank itself is likely leaking. A leaking tank usually cannot be repaired. A leak from a valve or fitting can be.",
      triggered: leakTriggered,
      detail: leakTriggered
        ? "The tank is likely leaking, based on the evidence so far."
        : failureMode === "unknown leak"
          ? "Not confirmed. The leak could be the tank, or just a valve or fitting, which can be a cheap fix. A photo or the plumber will show which."
          : "The tank is not leaking.",
    },
  ];

  const reasons: string[] = [];
  if (ageTriggered) {
    reasons.push(
      `The ${item.toLowerCase()} is ${ageYears} years old. That is ${agePercentOfLife}% of its typical life of ${typicalLifeYears} years.`,
    );
  }
  if (costTriggered) {
    reasons.push(
      `The repair would cost ${repairPercentOfReplace}% of a replacement, which is half or more.`,
    );
  }
  if (leakTriggered) {
    reasons.push("The tank itself is likely leaking, and a leaking tank usually cannot be repaired. The plumber confirms before any work.");
  }

  return {
    recommendation: reasons.length > 0 ? "replace" : "repair",
    reasons,
    checks,
    numbers: {
      ageYears,
      typicalLifeYears,
      agePercentOfLife,
      repairCost,
      replaceCost,
      repairPercentOfReplace,
    },
  };
}
