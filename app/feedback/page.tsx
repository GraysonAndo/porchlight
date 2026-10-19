"use client";

import Link from "next/link";
import { useState } from "react";
import { Badge, Card } from "@/components/ui";
import { feedbackToText } from "@/lib/feedbackText";
import { useDemo } from "@/lib/store";

function whenText(timestamp: string): string {
  const d = new Date(timestamp);
  return Number.isNaN(d.getTime()) ? timestamp : d.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
}

export default function FeedbackPage() {
  const { state, actions } = useDemo();
  const notes = state.feedback;
  const [copied, setCopied] = useState<"" | "yes" | "no">("");
  const [confirmClear, setConfirmClear] = useState(false);
  const pick = state.pricingPick;
  const pricingLine = pick
    ? `Pricing test: ${pick === "none" ? "none of the tiers felt right" : `would pick ${pick === "starter" ? "Starter ($4)" : pick === "plus" ? "Plus ($6)" : "Pro ($8)"} per unit per month`}`
    : null;
  const withPricing = (text: string) => (pricingLine ? `${pricingLine}\n\n${text}` : text);

  async function copyAll() {
    try {
      await navigator.clipboard.writeText(withPricing(feedbackToText(notes)));
      setCopied("yes");
    } catch {
      setCopied("no");
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div>
        <h1 className="text-3xl font-extrabold sm:text-4xl">Feedback notes</h1>
        <p className="mt-2 text-ink-soft">
          Notes saved with the &quot;Send feedback&quot; link at the bottom of any page. They live in this browser only.
        </p>
      </div>

      {pricingLine && (
        <p className="rounded-2xl bg-glow-tint px-4 py-3 font-bold" role="status">
          {pricingLine}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button type="button" className="btn btn-primary" onClick={copyAll} disabled={notes.length === 0}>
          Copy all as text
        </button>
        {confirmClear ? (
          <>
            <button
              type="button"
              className="btn btn-secondary !border-urgent !text-urgent"
              onClick={() => {
                actions.clearFeedback();
                setConfirmClear(false);
                setCopied("");
              }}
            >
              Yes, delete all {notes.length} notes
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => setConfirmClear(false)}>
              Keep them
            </button>
          </>
        ) : (
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setConfirmClear(true)}
            disabled={notes.length === 0}
          >
            Clear all
          </button>
        )}
        <span role="status" aria-live="polite" className="font-bold">
          {copied === "yes" && "✓ Copied to your clipboard"}
          {copied === "no" && "Could not copy. Select the text below and copy it by hand."}
        </span>
      </div>

      {notes.length === 0 ? (
        <Card>
          <p className="text-lg font-bold">No notes yet.</p>
          <p className="text-ink-soft">
            Open any screen and tap &quot;Send feedback&quot; at the bottom of the page to add one.{" "}
            <Link href="/tenant" className="font-bold underline underline-offset-4">
              Back to GoHome
            </Link>
          </p>
        </Card>
      ) : (
        <>
          <ol className="space-y-3">
            {notes.map((n, i) => (
              <li key={n.id} className="card">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-extrabold">
                    {i + 1}. {n.screen}
                  </p>
                  <Badge tone={n.rating >= 4 ? "good" : n.rating === 3 ? "caution" : "urgent"}>
                    Clarity {n.rating} of 5
                  </Badge>
                </div>
                <p className="mt-2 whitespace-pre-wrap">{n.note || "(no note)"}</p>
                <p className="mt-2 text-sm text-ink-soft">Saved {whenText(n.timestamp)}</p>
              </li>
            ))}
          </ol>

          <Card title="Plain text version">
            <pre
              className="max-h-80 overflow-auto whitespace-pre-wrap rounded-xl border border-line bg-cream p-4 font-mono text-sm"
              tabIndex={0}
              aria-label="Feedback notes as plain text"
            >
              {withPricing(feedbackToText(notes))}
            </pre>
          </Card>
        </>
      )}
    </div>
  );
}
