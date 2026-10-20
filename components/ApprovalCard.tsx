"use client";

// One thing that needs the owner's OK, already worked out. One big button. Everything else is quieter.

import Link from "next/link";
import { TapIcon } from "./icons";
import type { Msg } from "@/lib/agents/types";

const TONE = {
  good: "text-good-ink",
  caution: "text-caution-ink",
  urgent: "text-urgent",
} as const;

const KIND_LABEL = {
  decision: "Needs your OK",
  quote: "Needs your OK",
  lease: "Needs your OK",
  emergency: "Emergency",
} as const;

export function ApprovalCard({ msg, onTap }: { msg: Msg; onTap: (msgId: string, action: string) => void }) {
  const card = msg.card;
  const actions = msg.actions ?? [];
  const [primary, ...others] = actions;
  const emergency = card?.kind === "emergency";
  const firstLine = msg.text.split("\n")[0];

  return (
    <section
      aria-label={card ? `${KIND_LABEL[card.kind]}: ${card.title}` : "Needs your OK"}
      className={`reveal rounded-3xl border-2 p-5 shadow-sm sm:p-6 ${emergency ? "border-urgent bg-urgent-tint" : "border-glow-deep bg-white"}`}
    >
      <p className={`eyebrow ${emergency ? "!text-urgent" : ""}`}>{card ? KIND_LABEL[card.kind] : "Needs your OK"}</p>
      <h2 className="mt-1 font-display text-2xl font-extrabold leading-tight sm:text-3xl">{card ? card.title : firstLine}</h2>
      {card && <p className="mt-2 text-lg text-ink-soft">{card.summary}</p>}

      {card && card.facts.length > 0 && (
        <dl className="mt-4 grid gap-2 sm:grid-cols-2">
          {card.facts.map((f) => (
            <div key={f.label} className="rounded-2xl bg-cream px-4 py-2">
              <dt className="text-sm font-bold text-ink-soft">{f.label}</dt>
              <dd className={`text-lg font-extrabold ${f.tone ? TONE[f.tone] : ""}`}>{f.value}</dd>
            </div>
          ))}
        </dl>
      )}

      {primary && (
        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
          <button type="button" className="btn btn-primary btn-lg w-full sm:w-auto" onClick={() => onTap(msg.id, primary.id)}>
            <TapIcon size={22} /> {primary.label}
          </button>
          {others.map((a) => (
            <button key={a.id} type="button" className="btn btn-ghost w-full sm:w-auto" onClick={() => onTap(msg.id, a.id)}>
              {a.label}
            </button>
          ))}
        </div>
      )}
      {!emergency && <p className="mt-2 text-sm text-ink-soft">{card?.note ?? "One tap. Nothing is spent or sent until you tap."}</p>}

      <details className="mt-3 rounded-2xl bg-cream/70 px-4">
        <summary className="flex min-h-11 cursor-pointer items-center font-bold">See the details, or change something</summary>
        <div className="space-y-3 pb-4">
          <p className="whitespace-pre-line text-sm">{msg.text}</p>
          {msg.attachment && (
            <div>
              <p className="text-sm font-extrabold">{msg.attachment.title}</p>
              <pre className="mt-1 max-h-56 overflow-auto whitespace-pre-wrap rounded-xl border border-line bg-white p-3 font-sans text-sm">{msg.attachment.body}</pre>
            </div>
          )}
          {card?.kind === "decision" && (
            <p className="flex flex-wrap gap-x-4 gap-y-1 text-sm font-bold">
              <Link href="/owner/book" className="underline underline-offset-4">
                Pick another vendor, limit, or time
              </Link>
              <Link href="/owner/quote" className="underline underline-offset-4">
                See all the quotes
              </Link>
              <Link href="/owner/decide" className="underline underline-offset-4">
                Why replace and not repair
              </Link>
            </p>
          )}
          {card?.kind === "lease" && (
            <p className="text-sm font-bold">
              <Link href="/owner/rent" className="underline underline-offset-4">
                Open the rent increase check
              </Link>
            </p>
          )}
        </div>
      </details>
    </section>
  );
}
