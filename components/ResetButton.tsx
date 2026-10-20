"use client";

// Clears all the sample data, after asking. It stays on the page, and says it is done.

import { useEffect, useRef, useState } from "react";
import { useDemo } from "@/lib/store";

export function ResetButton({ variant = "ghost" }: { variant?: "ghost" | "secondary" }) {
  const { actions } = useDemo();
  const [asking, setAsking] = useState(false);
  const [done, setDone] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  if (asking) {
    return (
      <div role="alertdialog" aria-label="Reset the sample data?" className="flex flex-wrap items-center gap-2 rounded-xl border border-line bg-cream p-2">
        <p className="px-1 text-sm font-bold">Clear every conversation, payment, and setting in this sample?</p>
        <button
          type="button"
          className="btn btn-primary !min-h-10 text-sm"
          onClick={() => {
            actions.reset();
            setAsking(false);
            setDone(true);
            timer.current = setTimeout(() => setDone(false), 4000);
          }}
        >
          Yes, reset
        </button>
        <button type="button" className="btn btn-secondary !min-h-10 text-sm" onClick={() => setAsking(false)}>
          Cancel
        </button>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2">
      <button type="button" className={`btn ${variant === "ghost" ? "btn-ghost" : "btn-secondary"} text-sm`} onClick={() => { setAsking(true); setDone(false); }}>
        Reset sample data
      </button>
      <span role="status" aria-live="polite" className="text-sm font-bold text-good-ink">
        {done ? "Sample data was reset." : ""}
      </span>
    </div>
  );
}
