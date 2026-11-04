"use client";

// Clears all the sample data, after asking. It stays on the page, and says it is done.

import { useEffect, useRef, useState } from "react";
import { useDemo } from "@/lib/store";

export function ResetButton({ variant = "ghost" }: { variant?: "ghost" | "secondary" }) {
  const { actions } = useDemo();
  const [asking, setAsking] = useState(false);
  const [done, setDone] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const yesRef = useRef<HTMLButtonElement>(null);
  const openRef = useRef<HTMLButtonElement>(null);
  /** True when focus should go back to the Reset button after the question closes */
  const returnFocus = useRef(false);

  // The question replaces the button, so focus has to be moved by hand or a keyboard user lands on the page body.
  useEffect(() => {
    if (asking) yesRef.current?.focus();
    else if (returnFocus.current) {
      returnFocus.current = false;
      openRef.current?.focus();
    }
  }, [asking]);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  if (asking) {
    return (
      <div role="alertdialog" aria-label="Reset the sample data?" className="flex flex-wrap items-center gap-2 rounded-xl border border-line bg-cream p-2">
        <p className="px-1 text-sm font-bold">Clear every conversation, payment, setting, feedback note, and pricing pick in this sample?</p>
        <button
          ref={yesRef}
          type="button"
          className="btn btn-primary !min-h-10 text-sm"
          onClick={() => {
            returnFocus.current = true;
            actions.reset();
            setAsking(false);
            setDone(true);
            timer.current = setTimeout(() => setDone(false), 4000);
          }}
        >
          Yes, reset
        </button>
        <button type="button" className="btn btn-secondary !min-h-10 text-sm" onClick={() => { returnFocus.current = true; setAsking(false); }}>
          Cancel
        </button>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2">
      <button ref={openRef} type="button" className={`btn ${variant === "ghost" ? "btn-ghost" : "btn-secondary"} text-sm`} onClick={() => { setAsking(true); setDone(false); }}>
        Reset sample data
      </button>
      <span role="status" aria-live="polite" className="text-sm font-bold text-good-ink">
        {done ? "Sample data was reset." : ""}
      </span>
    </div>
  );
}
