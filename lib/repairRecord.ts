// The repair record: a plain text history of what happened and when, for an owner's own files. It is built only from
// the activity log, so it never says something happened that the log does not show.

import type { ActivityItem } from "./agents/views";

export function repairRecordText(address: string, owner: string, items: ActivityItem[]): string {
  const lines = [
    "REPAIR RECORD",
    `Property: ${address}`,
    `Owner: ${owner}`,
    "Made by GoHome from the activity log. All names, prices, and addresses in this sample are fictional.",
    "",
  ];
  const jobs: string[] = [];
  for (const i of items) if (!jobs.includes(i.job)) jobs.push(i.job);
  for (const job of jobs) {
    lines.push(job.toUpperCase());
    for (const i of items.filter((x) => x.job === job)) {
      lines.push(`  ${i.stamp}  ${i.title}`);
      if (i.detail) lines.push(`      ${i.detail.replace(/\n/g, " ")}`);
    }
    lines.push("");
  }
  return lines.join("\n");
}
