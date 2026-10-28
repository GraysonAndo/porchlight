// The dates GoHome is keeping track of for the owner, soonest first. Every date comes from the same sources the rest of
// the app uses (the bill due dates, the lease anniversary, the notice period), so a date here never disagrees with a page.

import { addDays, longDate } from "./format";
import { LEASE_ANNIVERSARY_ISO } from "./houseQa";
import { demoToday } from "./demoDate";
import { BILL_DUE_DATES, daysUntil } from "./payments";

export interface ComingUpItem {
  id: string;
  /** ISO date the thing happens */
  date: string;
  title: string;
  detail: string;
  href?: string;
  /** Whole days from today. Never negative here: past things are left out. */
  inDays: number;
}

export interface ComingUpInput {
  now?: Date;
  /** Water and trash has been paid, so it is no longer coming up */
  utilitiesPaid: boolean;
  /** Days of notice a rent increase needs: 30, or 90 over 10% */
  noticeDays?: number;
}

export function comingUp({ now = demoToday(), utilitiesPaid, noticeDays = 30 }: ComingUpInput): ComingUpItem[] {
  const items: Omit<ComingUpItem, "inDays">[] = [];
  if (!utilitiesPaid) {
    items.push({ id: "utilities", date: BILL_DUE_DATES.utilities, title: "Water and trash is due", detail: "Your tenant pays this in the app. GoHome records it when it comes in." });
  }
  items.push({
    id: "notice",
    date: addDays(LEASE_ANNIVERSARY_ISO, -noticeDays),
    title: "Last day to send a rent notice for the lease anniversary",
    detail: `A ${noticeDays} day notice sent by then lets a new rent start on ${longDate(LEASE_ANNIVERSARY_ISO)}.`,
    href: "/owner/rent",
  });
  items.push({ id: "anniversary", date: LEASE_ANNIVERSARY_ISO, title: "Lease anniversary", detail: "The usual day a new rent would start.", href: "/owner/rent" });
  return items
    .map((i) => ({ ...i, inDays: daysUntil(i.date, now) }))
    .filter((i) => i.inDays >= 0)
    .sort((a, b) => a.date.localeCompare(b.date));
}

/** "today", "tomorrow", "in 8 days" */
export function inDaysText(days: number): string {
  if (days === 0) return "today";
  if (days === 1) return "tomorrow";
  return `in ${days} days`;
}
