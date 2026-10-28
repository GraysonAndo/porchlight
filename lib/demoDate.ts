// The sample's bills and lease dates belong to October and December 2026: rent due Oct 1, water and trash due Oct 31,
// a lease anniversary on Dec 14. Without a clock of its own the sample would drift as the real calendar moves. Rent
// would be a hundred days late, water and trash would turn overdue on Nov 1, and "Coming up" would empty out after the
// anniversary. So "today" in the sample is the real date, held inside the window where the sample tells its story.

export const DEMO_WINDOW = { start: "2026-10-05", end: "2026-10-30" } as const;

function localIso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Today for the sample: the real date, but never before the start or after the end of the sample's window. */
export function demoToday(real: Date = new Date()): Date {
  const iso = localIso(real);
  if (iso < DEMO_WINDOW.start) return new Date(2026, 9, 5, 12);
  if (iso > DEMO_WINDOW.end) return new Date(2026, 9, 30, 12);
  return real;
}
