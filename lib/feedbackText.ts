import type { FeedbackNote } from "./types";

function whenText(timestamp: string): string {
  const d = new Date(timestamp);
  if (Number.isNaN(d.getTime())) return timestamp;
  return d.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
}

/** Clean, readable text for pasting into notes or a doc after an interview. */
export function feedbackToText(notes: FeedbackNote[]): string {
  if (notes.length === 0) return "GoHome feedback\nNo notes saved yet.";
  const lines: string[] = [
    "GoHome feedback",
    `${notes.length} ${notes.length === 1 ? "note" : "notes"}`,
    "",
  ];
  notes.forEach((n, i) => {
    lines.push(`${i + 1}. ${n.screen}`);
    lines.push(`   Clarity rating: ${n.rating} of 5`);
    lines.push(`   Note: ${n.note.trim() || "(no note)"}`);
    lines.push(`   Saved: ${whenText(n.timestamp)}`);
    lines.push("");
  });
  return lines.join("\n").trimEnd();
}
