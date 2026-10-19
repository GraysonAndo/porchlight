// How long each thing takes to appear, so replies arrive at a human pace.

import type { Entry, World } from "./types";

export function entryDelay(entry: Entry): number {
  if (entry.kind === "record") return 120;
  if (entry.kind === "tool") return 200;
  if (entry.dir === "in") return 60;
  if (entry.channel === "call") return 400;
  return 600 + Math.min(entry.text.length * 4, 500);
}

/**
 * Gives every entry added after `fromIndex` a time to appear, one after another. The screen shows an
 * entry once that time has passed, so new texts arrive with a typing pause, and old ones are just there.
 */
export function stampReveal(world: World, fromIndex: number, now: number, speed = 1): World {
  let t = now;
  for (let i = Math.max(0, fromIndex - 1); i < fromIndex && i < world.timeline.length; i++) {
    t = Math.max(t, world.timeline[i].revealAt ?? 0);
  }
  for (let i = fromIndex; i < world.timeline.length; i++) {
    t += entryDelay(world.timeline[i]) / speed;
    world.timeline[i].revealAt = t;
  }
  return world;
}
