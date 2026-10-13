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
  };
}
