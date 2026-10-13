// Small formatting helpers shared by screens and notice text.

const usdFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const usdCentsFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** "$2,850" */
export function usd(amount: number): string {
  return usdFormatter.format(amount);
}

/** "$3,456.00" */
export function usdCents(amount: number): string {
  return usdCentsFormatter.format(amount);
}

/** "$1,600 to $2,600" */
export function usdRange(low: number, high: number): string {
  return `${usd(low)} to ${usd(high)}`;
}

/** "8.0%" */
export function pct(value: number, digits = 1): string {
  return `${value.toFixed(digits)}%`;
}

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

/** "2015-03" to "March 2015". Returns the input if it does not parse. */
export function monthYear(iso: string): string {
  const match = /^(\d{4})-(\d{2})/.exec(iso);
  if (!match) return iso;
  const month = Number(match[2]);
  if (month < 1 || month > 12) return iso;
  return `${MONTHS[month - 1]} ${match[1]}`;
}

/** "2026-10-13" to "October 13, 2026". Returns "" if it does not parse. */
export function longDate(iso: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!match) return "";
  const month = Number(match[2]);
  if (month < 1 || month > 12) return "";
  return `${MONTHS[month - 1]} ${Number(match[3])}, ${match[1]}`;
}

/** Adds days to an ISO date (YYYY-MM-DD) using UTC so time zones never shift the result. */
export function addDays(iso: string, days: number): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!match) return "";
  const d = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
