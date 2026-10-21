"use client";

// Plays the whole repair story by itself: the tenant reports a leak, the owner approves with one tap, the plumber is booked and finishes,
// and the record updates. It moves between the tenant and owner screens as it goes, so a presenter only has to press one button.

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { openOwnerMessage } from "@/lib/agents/engine";
import { story, useStory } from "@/lib/story";
import { actions, getDemoState } from "@/lib/store";

interface Step {
  label: string;
  path: string;
  run: () => void;
  /** How long to stay on this step so people can read it, in milliseconds */
  wait: number;
}

const STEPS: Step[] = [
  {
    label: "The tenant texts GoHome that the water heater is leaking.",
    path: "/tenant",
    run: () => actions.agentSend({ type: "tenant.text", text: "water heater is leaking all over the garage", shown: "My water heater is leaking" }),
    wait: 5500,
  },
  {
    label: "GoHome asks a safety question first. The tenant says the water is not near anything electrical.",
    path: "/tenant",
    run: () => actions.agentSend({ type: "tenant.text", text: "2", shown: "No" }),
    wait: 6500,
  },
  {
    label: "The tenant follows two safe steps and taps Done.",
    path: "/tenant",
    run: () => actions.agentSend({ type: "tenant.text", text: "done", shown: "Done" }),
    wait: 5500,
  },
  {
    label: "Over on the owner's side, GoHome collects three quotes and checks each one.",
    path: "/owner",
    run: () => actions.agentAdvance(),
    wait: 8500,
  },
  {
    label: "The owner gets one plan to approve, already worked out, and taps Approve once.",
    path: "/owner",
    run: () => {
      const open = openOwnerMessage(getDemoState().agent);
      if (open) actions.agentSend({ type: "owner.tap", msgId: open.id, action: "approve" });
    },
    wait: 7000,
  },
  {
    label: "The tenant is asked to confirm the visit time, and does.",
    path: "/tenant",
    run: () => actions.agentSend({ type: "tenant.text", text: "1", shown: "That works" }),
    wait: 6000,
  },
  {
    label: "The plumber finishes. The new heater goes into the home record on its own.",
    path: "/owner",
    run: () => actions.agentSend({ type: "owner.markDone" }),
    wait: 7000,
  },
  {
    label: "The home record and the 5-year forecast have already updated.",
    path: "/owner/record",
    run: () => {},
    wait: 6000,
  },
];

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export function StoryPlayer() {
  const router = useRouter();
  const s = useStory();
  const lastRun = useRef(0);
  const stopped = useRef(false);

  useEffect(() => {
    if (s.status !== "playing" || s.run === lastRun.current) return;
    lastRun.current = s.run;
    stopped.current = false;
    const myRun = s.run;
    (async () => {
      actions.reset();
      router.push("/tenant");
      await sleep(1200);
      for (let i = 0; i < STEPS.length; i++) {
        if (stopped.current || lastRun.current !== myRun) return;
        const step = STEPS[i];
        story.progress(i, STEPS.length, step.label);
        router.push(step.path);
        await sleep(900);
        if (stopped.current || lastRun.current !== myRun) return;
        step.run();
        await sleep(step.wait);
      }
      if (!stopped.current && lastRun.current === myRun) story.finish();
    })();
  }, [s.status, s.run, router]);

  if (s.status === "idle") return null;

  return (
    <aside
      aria-label="The demo story"
      className="fixed inset-x-3 bottom-20 z-40 mx-auto max-w-xl rounded-2xl border-2 border-ink bg-white p-4 shadow-2xl md:bottom-4"
    >
      <p className="eyebrow">{s.status === "done" ? "Finished" : `The whole story, step ${Math.min(s.step + 1, s.total || 1)} of ${s.total || STEPS.length}`}</p>
      <p role="status" aria-live="polite" className="mt-1 font-bold">
        {s.status === "done" ? "That is the whole story: a leak reported, one tap to approve, the plumber booked and done, and the record updated. Use Reset sample data to run it again." : s.label}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          className="btn btn-secondary !min-h-11 text-sm"
          onClick={() => {
            stopped.current = true;
            story.stop();
          }}
        >
          {s.status === "done" ? "Close" : "Stop"}
        </button>
        {s.status === "done" && (
          <button type="button" className="btn btn-primary !min-h-11 text-sm" onClick={() => story.start()}>
            Play it again
          </button>
        )}
      </div>
    </aside>
  );
}
