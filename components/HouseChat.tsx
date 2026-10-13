"use client";

// "Ask about your home": the tenant asks, Porchlight answers only from the house
// record and the lease on file. If it is not in the data, it says so.

import { useState } from "react";
import { ChatIcon } from "./icons";
import { Badge, Card } from "./ui";
import { QA_SUGGESTIONS, answerHouseQuestion, type QaAnswer } from "@/lib/houseQa";
import { PROPERTY } from "@/lib/seed";
import { useDemo } from "@/lib/store";

interface Turn {
  id: number;
  question: string;
  reply: QaAnswer;
  sentToOwner: boolean;
}

export function HouseChat() {
  const { state } = useDemo();
  const [turns, setTurns] = useState<Turn[]>([]);
  const [draft, setDraft] = useState("");

  function ask(question: string) {
    const q = question.trim();
    if (!q) return;
    const reply = answerHouseQuestion(q, { heater: state.houseRecord, rentPaidAt: state.rentPaidAt });
    setTurns((prev) => [...prev, { id: prev.length + 1, question: q, reply, sentToOwner: false }]);
    setDraft("");
  }

  return (
    <Card
      title={
        <span className="flex items-center gap-2">
          <ChatIcon /> Ask about your home
        </span>
      }
    >
      <p className="mb-3 text-ink-soft">
        Ask about your rent, your lease, or what is in the home. Porchlight answers only from the house record and the
        lease on file. If it is not there, it will say &quot;I don&apos;t know&quot;.
      </p>

      <div role="log" aria-live="polite" aria-label="Questions and answers" className="space-y-3">
        {turns.map((t) => (
          <div key={t.id} className="reveal space-y-2">
            <p className="ml-auto w-fit max-w-[90%] rounded-2xl rounded-br-sm bg-glow px-3 py-2 text-sm font-bold">{t.question}</p>
            <div className="max-w-[92%] rounded-2xl rounded-bl-sm border border-line bg-white px-3 py-2 text-sm shadow-sm">
              <p>{t.reply.answer}</p>
              <p className="mt-1 flex flex-wrap items-center gap-2 text-xs font-bold text-ink-soft">
                {t.reply.known ? (
                  t.reply.source && <Badge tone="good" icon={false}>From the record: {t.reply.source}</Badge>
                ) : (
                  <Badge tone="caution" icon={false}>Not in the data</Badge>
                )}
              </p>
              {!t.reply.known && (
                <div className="mt-2">
                  {t.sentToOwner ? (
                    <p className="text-sm font-bold text-good-ink" role="status">
                      ✓ Your question was sent to {PROPERTY.owner} (demo, nothing was actually sent).
                    </p>
                  ) : (
                    <button
                      type="button"
                      className="btn btn-secondary !min-h-11 text-sm"
                      onClick={() => setTurns((prev) => prev.map((x) => (x.id === t.id ? { ...x, sentToOwner: true } : x)))}
                    >
                      Ask {PROPERTY.owner} this
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Question ideas">
        {QA_SUGGESTIONS.map((s) => (
          <button key={s} type="button" className="btn btn-secondary !min-h-11 text-sm" onClick={() => ask(s)}>
            {s}
          </button>
        ))}
      </div>

      <form
        className="mt-3 flex items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          ask(draft);
        }}
      >
        <label htmlFor="house-question" className="sr-only">
          Your question
        </label>
        <input
          id="house-question"
          className="field min-w-0 flex-1"
          placeholder="Type a question"
          maxLength={200}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          autoComplete="off"
        />
        <button type="submit" className="btn btn-primary" disabled={!draft.trim()}>
          Ask
        </button>
      </form>
    </Card>
  );
}
