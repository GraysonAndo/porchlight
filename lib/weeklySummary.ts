// What the weekly email to the owner would say, built from the same activity log and dates the app already shows.
// It claims nothing the log does not show.

import type { ActivityItem } from "./agents/views";
import { inDaysText, type ComingUpItem } from "./comingUp";
import { longDate } from "./format";

export interface WeeklySummaryInput {
  address: string;
  activity: ActivityItem[];
  coming: ComingUpItem[];
  /** Things that wait on the owner right now */
  waitingOnOwner: number;
}

export function weeklySummaryLines(input: WeeklySummaryInput): string[] {
  const handled = input.activity.filter((i) => i.engine !== "human");
  const jobs = [...new Set(input.activity.map((i) => i.job))];
  const lines = [`This week at ${input.address}`];
  if (input.activity.length === 0) {
    lines.push("GoHome had nothing to do. No repairs were reported and nothing needed you.");
  } else {
    lines.push(`GoHome handled ${handled.length} ${handled.length === 1 ? "step" : "steps"} on its own, across ${jobs.length} ${jobs.length === 1 ? "job" : "jobs"}: ${jobs.join(", ")}.`);
  }
  lines.push(input.waitingOnOwner === 0 ? "Nothing is waiting on you." : `${input.waitingOnOwner} ${input.waitingOnOwner === 1 ? "thing is" : "things are"} waiting on you in the inbox.`);
  if (input.coming.length > 0) {
    lines.push("Coming up:");
    for (const c of input.coming) lines.push(`- ${c.title}: ${longDate(c.date)}, ${inDaysText(c.inDays)}`);
  }
  return lines;
}
