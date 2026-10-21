// The one-click demo story: a tiny external store that says whether the story is playing, so the button on the welcome page and the
// player that runs it (mounted once, above every page) can talk to each other.

import { useSyncExternalStore } from "react";

export interface StoryState {
  status: "idle" | "playing" | "done";
  /** 0-based step being shown */
  step: number;
  total: number;
  label: string;
  /** Bumped on every start, so a restart is a new run */
  run: number;
}

let current: StoryState = { status: "idle", step: 0, total: 0, label: "", run: 0 };
const listeners = new Set<() => void>();

function set(next: Partial<StoryState>): void {
  current = { ...current, ...next };
  listeners.forEach((l) => l());
}

export const story = {
  start: () => set({ status: "playing", step: 0, label: "Starting a fresh sample home...", run: current.run + 1 }),
  progress: (step: number, total: number, label: string) => set({ status: "playing", step, total, label }),
  finish: () => set({ status: "done", label: "That is the whole story." }),
  stop: () => set({ status: "idle", label: "" }),
};

export function useStory(): StoryState {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => current,
    () => current,
  );
}
