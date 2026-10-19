"use client";

import { useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { ChatIcon } from "./icons";
import { screenNameFor } from "@/lib/steps";
import { useDemo } from "@/lib/store";

const RATING_WORDS = ["Very unclear", "Unclear", "Okay", "Clear", "Very clear"];

/** A "Send feedback" link for the footer, and the sheet it opens. */
export function FeedbackLink() {
  const { actions } = useDemo();
  const pathname = usePathname();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [rating, setRating] = useState<number | null>(null);
  const [note, setNote] = useState("");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const screen = screenNameFor(pathname);

  function open() {
    setRating(null);
    setNote("");
    setSaved(false);
    setError("");
    dialogRef.current?.showModal();
  }

  function close() {
    dialogRef.current?.close();
  }

  function save() {
    if (rating === null) {
      setError("Please pick a rating from 1 to 5.");
      return;
    }
    actions.addFeedback({ screen, rating, note: note.trim() });
    setSaved(true);
    setError("");
  }

  return (
    <>
      <button type="button" onClick={open} className="inline-flex min-h-11 items-center gap-1.5 font-bold underline underline-offset-4">
        <ChatIcon size={18} />
        Send feedback
      </button>

      <dialog
        ref={dialogRef}
        aria-labelledby="feedback-title"
        className="m-0 mt-auto w-full max-w-none rounded-t-2xl bg-white p-0 text-ink shadow-2xl backdrop:bg-ink/50 sm:m-auto sm:max-w-md sm:rounded-2xl"
      >
        <div className="p-5">
          <h2 id="feedback-title" className="text-xl font-extrabold">
            Send feedback
          </h2>
          <p className="mt-1 text-sm text-ink-soft">
            Screen: <strong className="text-ink">{screen}</strong>
          </p>

          {saved ? (
            <div className="mt-4" role="status">
              <p className="rounded-xl bg-good-tint p-3 font-bold text-good-ink">
                Saved. Thank you!
              </p>
              <div className="mt-4 flex justify-end">
                <button type="button" className="btn btn-primary" onClick={close}>
                  Done
                </button>
              </div>
            </div>
          ) : (
            <form
              className="mt-4 space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                save();
              }}
            >
              <fieldset>
                <legend className="label">How clear was this screen?</legend>
                <div className="grid grid-cols-5 gap-2">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <label
                      key={n}
                      className={`flex min-h-14 cursor-pointer flex-col items-center justify-center rounded-xl border-2 px-1 text-center has-[:focus-visible]:outline has-[:focus-visible]:outline-[3px] has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ink ${
                        rating === n ? "border-ink bg-glow" : "border-line bg-white hover:bg-cream-deep"
                      }`}
                    >
                      <input
                        type="radio"
                        name="rating"
                        value={n}
                        checked={rating === n}
                        onChange={() => setRating(n)}
                        className="sr-only"
                      />
                      <span className="text-lg font-extrabold">{n}</span>
                    </label>
                  ))}
                </div>
                <p className="hint flex justify-between">
                  <span>1: {RATING_WORDS[0]}</span>
                  <span>5: {RATING_WORDS[4]}</span>
                </p>
              </fieldset>

              <div>
                <label htmlFor="feedback-note" className="label">
                  What was confusing or missing? (optional)
                </label>
                <textarea
                  id="feedback-note"
                  className="field min-h-28"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              </div>

              {error && (
                <p role="alert" className="font-bold text-urgent">
                  {error}
                </p>
              )}

              <div className="flex justify-end gap-2">
                <button type="button" className="btn btn-secondary" onClick={close}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save feedback
                </button>
              </div>
            </form>
          )}
        </div>
      </dialog>
    </>
  );
}
