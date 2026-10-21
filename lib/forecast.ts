// 5-year replacement forecast. Plain math, no AI.
// Window: the current year plus the next four (five calendar years).
// Items already past due are counted in the current year, because that is
// when the money is needed.

export const CURRENT_YEAR = 2026;
export const FORECAST_YEARS = 5;

export type ForecastStatus = "overdue or due now" | "within 5 years" | "beyond 5 years";

export interface ForecastInput {
  id: string;
  name: string;
  installYear: number;
  typicalLifeYears: number;
  replaceLow: number;
  replaceHigh: number;
}

export interface ForecastRow extends ForecastInput {
  dueYear: number;
  status: ForecastStatus;
  /** Negative when overdue */
  yearsUntilDue: number;
}

export interface ForecastYear {
  year: number;
  low: number;
  high: number;
}

export interface ForecastResult {
  currentYear: number;
  rows: ForecastRow[];
  years: ForecastYear[];
  totalLow: number;
  totalHigh: number;
  setAsideLowPerYear: number;
  setAsideHighPerYear: number;
  /** The same plan spread over 60 months */
  setAsideLowPerMonth: number;
  setAsideHighPerMonth: number;
}

export function statusFor(dueYear: number, currentYear: number): ForecastStatus {
  if (dueYear <= currentYear) return "overdue or due now";
  if (dueYear <= currentYear + FORECAST_YEARS - 1) return "within 5 years";
  return "beyond 5 years";
}

export function buildForecast(
  items: ForecastInput[],
  currentYear: number = CURRENT_YEAR,
): ForecastResult {
  const rows: ForecastRow[] = items.map((item) => {
    const dueYear = item.installYear + item.typicalLifeYears;
    return {
      ...item,
      dueYear,
      status: statusFor(dueYear, currentYear),
      yearsUntilDue: dueYear - currentYear,
    };
  });

  const years: ForecastYear[] = [];
  for (let i = 0; i < FORECAST_YEARS; i++) {
    years.push({ year: currentYear + i, low: 0, high: 0 });
  }

  for (const row of rows) {
    if (row.status === "beyond 5 years") continue;
    const bucketYear = Math.max(row.dueYear, currentYear);
    const bucket = years.find((y) => y.year === bucketYear);
    if (bucket) {
      bucket.low += row.replaceLow;
      bucket.high += row.replaceHigh;
    }
  }

  const totalLow = years.reduce((sum, y) => sum + y.low, 0);
  const totalHigh = years.reduce((sum, y) => sum + y.high, 0);

  return {
    currentYear,
    rows,
    years,
    totalLow,
    totalHigh,
    setAsideLowPerYear: Math.round(totalLow / FORECAST_YEARS),
    setAsideHighPerYear: Math.round(totalHigh / FORECAST_YEARS),
    setAsideLowPerMonth: Math.round(totalLow / (FORECAST_YEARS * 12)),
    setAsideHighPerMonth: Math.round(totalHigh / (FORECAST_YEARS * 12)),
  };
}

// ---------------------------------------------------------------------------
// Cash flow: will the monthly set-aside actually cover each year's bills?
// ---------------------------------------------------------------------------

export interface CashFlowRow {
  year: number;
  /** Money on hand when this year's bills come due: what was already saved, plus the set-aside from the years before */
  onHand: number;
  /** Bills due this year, at the high estimate */
  bills: number;
  /** On hand minus bills. Negative means short. */
  left: number;
}

export interface CashFlow {
  rows: CashFlowRow[];
  /** The first year with a shortfall, or null when every year is covered */
  firstShortYear: number | null;
  /** The most the owner is short in any one year, zero when covered */
  worstShortfall: number;
  /** Cash needed right now to cover the current year's bills, beyond what is already saved */
  neededNow: number;
  /** The monthly set-aside that covers every later year, given the cash on hand now. Rounded up to the dollar. */
  monthlyToCover: number;
}

/**
 * Walks the forecast year by year with the high estimates (so the plan errs on the safe side). A year's bills are paid from
 * what is on hand at that point, and a year's set-aside only counts for later years, since the bills can come at any time.
 */
export function cashFlowFor(years: ForecastYear[], monthly: number, alreadySaved = 0): CashFlow {
  const rows: CashFlowRow[] = [];
  let cumulativeBills = 0;
  let worst = 0;
  let firstShort: number | null = null;
  let monthlyNeeded = 0;
  years.forEach((y, i) => {
    cumulativeBills += y.high;
    const onHand = alreadySaved + 12 * monthly * i - (cumulativeBills - y.high);
    const left = onHand - y.high;
    rows.push({ year: y.year, onHand, bills: y.high, left });
    if (left < 0) {
      worst = Math.max(worst, -left);
      if (firstShort === null) firstShort = y.year;
    }
    if (i > 0) monthlyNeeded = Math.max(monthlyNeeded, (cumulativeBills - alreadySaved) / (12 * i));
  });
  const first = years[0];
  return {
    rows,
    firstShortYear: firstShort,
    worstShortfall: worst,
    neededNow: first ? Math.max(0, first.high - alreadySaved) : 0,
    monthlyToCover: Math.ceil(Math.max(0, monthlyNeeded)),
  };
}
