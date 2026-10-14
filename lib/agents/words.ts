import type { TimerId } from "./types";

/** What each scheduled event is, in a few plain words. */
export const TIMER_WORDS: Record<TimerId, string> = {
  quotes_in: "the vendor quotes arrive",
  owner_nudge: "Porchlight follows up with the owner",
  job_done: "the plumber finishes the job",
  notice_delivered: "the notice is delivered",
};
