"use client";

// A step-by-step picture guide for one item in the home. Tap through the steps, or press Play to watch it
// as a short animated walkthrough. It keeps people inside GoHome instead of sending them to a video site.

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { GuideScene } from "./GuideScene";
import { AlertIcon, PlayIcon } from "./icons";
import { guideById, type HomeGuide } from "@/lib/homeGuides";
import { useDemo } from "@/lib/store";
import { useEquipment } from "@/lib/useEquipment";

const PLAY_STEP_MS = 4500;

export function GuideViewer({ guide, onDone, doneLabel = "Done" }: { guide: HomeGuide; onDone?: () => void; doneLabel?: string }) {
  const { state, actions } = useDemo();
  const last = guide.steps.length - 1;
  // Where the tenant was is remembered, so a reload or a phone call in the middle of a guide loses nothing.
  const index = Math.min(Math.max(state.guideProgress[guide.id] ?? 0, 0), last);
  const setIndex = (change: number | ((i: number) => number)) =>
    actions.setGuideStep(guide.id, typeof change === "function" ? change(index) : change);
  const [playing, setPlaying] = useState(false);
  const step = guide.steps[index];
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Play moves to the next step on a timer. At the last step it simply stops, so there is no state to reset.
  const isPlaying = playing && index < last;
  useEffect(() => {
    if (!isPlaying) return;
    timer.current = setTimeout(() => actions.setGuideStep(guide.id, Math.min(index + 1, last)), PLAY_STEP_MS);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [isPlaying, index, last, actions, guide.id]);

  function play() {
    if (index >= last) setIndex(0);
    setPlaying(true);
  }

  return (
    <article aria-label={guide.title} className="space-y-4">
      <header>
        {guide.forItem && <p className="eyebrow mb-1">For your {guide.forItem}</p>}
        <h2 className="text-2xl font-extrabold leading-tight">{guide.title}</h2>
        <p className="mt-1 text-sm text-ink-soft">
          <strong className="text-ink">Time:</strong> {guide.time}. <strong className="text-ink">You need:</strong> {guide.youNeed}
        </p>
      </header>

      <div>
        <GuideScene scene={guide.scene} part={step.part} state={step.state} label={step.caption} />
        <p className="mt-2 text-center text-sm font-bold text-ink-soft">{step.caption}</p>
      </div>

      <div
        className="h-1.5 overflow-hidden rounded-full bg-line"
        role="progressbar"
        aria-label="Guide progress"
        aria-valuemin={1}
        aria-valuemax={guide.steps.length}
        aria-valuenow={index + 1}
      >
        <div className="h-full rounded-full bg-glow transition-[width] duration-300" style={{ width: `${((index + 1) / guide.steps.length) * 100}%` }} />
      </div>

      <section aria-live="polite" className="rounded-2xl border border-line bg-white p-4">
        <p className="text-sm font-extrabold uppercase tracking-wide text-ink-soft">
          Step {index + 1} of {guide.steps.length}
        </p>
        <p className="mt-1 text-lg">{step.text}</p>
        {step.warn && (
          <p className="mt-3 flex items-start gap-2 rounded-xl border-l-8 border-urgent bg-urgent-tint p-3 font-bold text-urgent">
            <AlertIcon size={20} />
            <span>{step.warn}</span>
          </p>
        )}
      </section>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => {
            setPlaying(false);
            setIndex((i) => Math.max(0, i - 1));
          }}
          disabled={index === 0}
        >
          Back
        </button>
        <button type="button" className="btn btn-ghost order-last w-full sm:order-none sm:w-auto" onClick={() => (isPlaying ? setPlaying(false) : play())}>
          {isPlaying ? "Pause" : (<><PlayIcon size={18} /> Play as a short video</>)}
        </button>
        {index < last ? (
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              setPlaying(false);
              setIndex((i) => Math.min(last, i + 1));
            }}
          >
            Next step
          </button>
        ) : (
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              setPlaying(false);
              setIndex(0);
              // Finishing the water shut-off guide is the same as tapping Done in the chat, so the tenant never has to do both.
              if (guide.id === "heater-water-off" && state.agent.triage.stage === "steps_given") {
                actions.agentSend({ type: "tenant.text", text: "done", shown: "Done" });
              }
              onDone?.();
            }}
          >
            {doneLabel}
          </button>
        )}
      </div>

      {guide.stopIf.length > 0 && (
        <div className="rounded-xl border-l-8 border-urgent bg-urgent-tint p-3 text-urgent">
          <p className="flex items-center gap-2 font-extrabold">
            <AlertIcon size={20} /> Stop and get help if:
          </p>
          <ul className="mt-1 list-disc space-y-1 pl-6 text-ink">
            {guide.stopIf.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </div>
      )}
      <p className="text-xs text-ink-soft">General safety information, not professional advice.</p>
    </article>
  );
}

/** A button that opens a guide in a sheet. Used under chat messages. */
export function GuideButton({ guideId, label = "Show me how" }: { guideId: string; label?: string }) {
  const ref = useRef<HTMLDialogElement>(null);
  const guide = guideById(guideId, useEquipment());
  if (!guide) return null;
  return (
    <>
      <button type="button" className="btn btn-secondary !min-h-10 !px-4 text-sm" onClick={() => ref.current?.showModal()}>
        <PlayIcon size={18} /> {label}
      </button>
      <dialog
        ref={ref}
        aria-label={guide.title}
        className="m-0 mt-auto max-h-[92vh] w-full max-w-none overflow-y-auto rounded-t-2xl bg-white p-0 text-ink shadow-2xl backdrop:bg-ink/50 sm:m-auto sm:max-w-lg sm:rounded-2xl"
      >
        <div className="p-5">
          <div className="mb-2 flex justify-end">
            <button type="button" autoFocus className="btn btn-ghost !min-h-10 text-sm" onClick={() => ref.current?.close()}>
              Close
            </button>
          </div>
          <GuideViewer guide={guide} onDone={() => ref.current?.close()} />
        </div>
      </dialog>
    </>
  );
}

/** A guide looked up by id, written for the equipment as the home record has it now. Shows "not found" for an unknown id. */
export function GuideFromStore({ id }: { id: string }) {
  const router = useRouter();
  const guide = guideById(id, useEquipment());
  if (!guide) return <p className="card">We could not find that guide.</p>;
  return <GuideViewer guide={guide} doneLabel="Done, back to GoHome" onDone={() => router.push("/tenant")} />;
}
