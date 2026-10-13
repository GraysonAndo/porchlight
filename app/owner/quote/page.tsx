"use client";

import { useState } from "react";
import { PlainCodeNote } from "@/components/Agent";
import { QuoteDetail } from "@/components/QuoteDetail";
import { StepShell } from "@/components/StepShell";
import { CheckIcon, TagIcon } from "@/components/icons";
import { Badge, Callout, Card } from "@/components/ui";
import { VERDICT_LABEL, VERDICT_TONE } from "@/components/verdict";
import { usd } from "@/lib/format";
import { COLLECTED, PLAN } from "@/lib/plan";
import { SAMPLE_QUOTE_TEXT, parseQuoteText, type ParsedQuote } from "@/lib/quoteParse";
import type { VendorQuote } from "@/lib/types";

function PasteQuote() {
  const [text, setText] = useState("");
  const [parsed, setParsed] = useState<ParsedQuote | null>(null);

  const quote: VendorQuote | null =
    parsed && parsed.lines.length > 0
      ? {
          vendorId: "pasted",
          vendorName: parsed.vendorName ?? "Your pasted quote",
          total: parsed.total,
          lines: parsed.lines,
        }
      : null;

  return (
    <div className="space-y-5">
      <Card
        title={
          <span className="flex items-center gap-2">
            <TagIcon /> Got a quote yourself? Paste it here
          </span>
        }
      >
        <p className="mb-3 text-ink-soft">
          Copy the text of an email or estimate and paste it in. Porchlight reads the line items and checks them against
          typical prices, so you can tell if it is fair before you reply.
        </p>
        <label htmlFor="paste-quote" className="label">
          The text of the quote
        </label>
        <textarea
          id="paste-quote"
          className="field min-h-44 font-mono text-sm"
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setParsed(null);
          }}
          placeholder={"Vendor name\nWater heater unit ........ $800\nLabor ........ $1,200\nTOTAL $2,500"}
        />
        <div className="mt-3 flex flex-col gap-3 sm:flex-row">
          <button type="button" className="btn btn-primary" disabled={text.trim() === ""} onClick={() => setParsed(parseQuoteText(text))}>
            Check this quote
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => {
              setText(SAMPLE_QUOTE_TEXT);
              setParsed(parseQuoteText(SAMPLE_QUOTE_TEXT));
            }}
          >
            Use a sample quote
          </button>
          {(text || parsed) && (
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => {
                setText("");
                setParsed(null);
              }}
            >
              Clear
            </button>
          )}
        </div>
        <p className="hint">Prototype note: the sample quote is fictional. Reading the text is plain code, not AI.</p>
      </Card>

      {parsed && !quote && (
        <Callout tone="caution" title="I could not find any dollar amounts" role="alert">
          <p>Put each item on its own line with its price at the end, like &quot;Labor ........ $1,200&quot;.</p>
        </Callout>
      )}

      {parsed && quote && (
        <div className="space-y-5" aria-label="Result for the pasted quote">
          {(parsed.warnings.length > 0 || parsed.mismatch !== null) && (
            <Callout tone="caution" title="Check these before you trust the result" role="status">
              <ul className="list-disc space-y-1 pl-5">
                {parsed.mismatch !== null && (
                  <li>
                    The total on the quote is {usd(parsed.statedTotal ?? 0)}, but the lines add up to {usd(parsed.sumOfLines)}. Ask
                    the vendor which is right. The total on the quote was used.
                  </li>
                )}
                {parsed.warnings.map((w) => (
                  <li key={w}>{w}</li>
                ))}
              </ul>
            </Callout>
          )}
          <QuoteDetail quote={quote} />
        </div>
      )}
    </div>
  );
}

export default function QuotePage() {
  const [selected, setSelected] = useState(PLAN.vendorId);
  const current = COLLECTED.find((c) => c.vendorId === selected) ?? COLLECTED[0];

  return (
    <StepShell stepId="owner-quote">
      <div className="hero-ink">
        <p className="eyebrow !text-cream/70">Porchlight collected {COLLECTED.length} quotes and checked each one</p>
        <p className="mt-2 text-3xl font-extrabold leading-tight sm:text-5xl">
          Best pick: <span className="text-glow">{PLAN.vendorName}</span>, {usd(PLAN.total)}
        </p>
        <p className="mt-2 text-lg text-cream/85">
          That is <strong className="text-glow">{usd(PLAN.savedVsHighest)} less</strong> than the highest quote.
        </p>
        <ul className="mt-4 space-y-2">
          {PLAN.reasons.map((reason) => (
            <li key={reason} className="flex items-start gap-3">
              <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-glow text-ink">
                <CheckIcon size={14} />
              </span>
              <span>{reason}</span>
            </li>
          ))}
        </ul>
        {PLAN.skipped.length > 0 && (
          <div className="mt-4 rounded-2xl bg-white/10 p-3">
            <p className="font-extrabold">Skipped, and why</p>
            <ul className="mt-1 space-y-1 text-cream/90">
              {PLAN.skipped.map((s) => (
                <li key={s.vendorId}>
                  <strong>{s.vendorName}:</strong> {s.reason}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <PlainCodeNote>
        Which quote to pick is a rule, not a guess: the cheapest quote with a fair price from a vendor that shows a
        license. The AI never chooses a vendor or a price.
      </PlainCodeNote>

      <fieldset>
        <legend className="mb-2 text-xl font-extrabold">The quotes</legend>
        <div className="grid gap-3 md:grid-cols-3">
          {COLLECTED.map((c) => {
            const isSelected = c.vendorId === selected;
            const pick = c.vendorId === PLAN.vendorId;
            return (
              <label
                key={c.vendorId}
                className={`card card-lift relative flex cursor-pointer flex-col gap-2 has-[:focus-visible]:outline has-[:focus-visible]:outline-[3px] has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ink ${
                  isSelected ? "!border-ink ring-4 ring-glow" : "hover:border-ink"
                }`}
              >
                <input
                  type="radio"
                  name="quote"
                  className="sr-only"
                  checked={isSelected}
                  onChange={() => setSelected(c.vendorId)}
                />
                <span className="flex flex-wrap items-center gap-2">
                  <span className="text-lg font-extrabold leading-snug">{c.vendorName}</span>
                  {pick && <Badge tone="good">Porchlight&apos;s pick</Badge>}
                </span>
                <span className="text-3xl font-extrabold">{usd(c.quote.total)}</span>
                <span>
                  <Badge tone={VERDICT_TONE[c.verdict]}>{VERDICT_LABEL[c.verdict]}</Badge>
                </span>
                <span className="text-sm">
                  <strong>License:</strong> {c.license ?? "Not shown"}
                </span>
                {c.missingLines.length > 0 && (
                  <span className="rounded-lg bg-caution-tint p-2 text-sm font-bold text-caution-ink">
                    ! Not listed: {c.missingLines.join(", ")}
                  </span>
                )}
                <span className="mt-1 font-bold underline underline-offset-4">
                  {isSelected ? "Showing below" : "Show details"}
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <QuoteDetail key={current.vendorId} quote={current.quote} license={current.license} />

      <PasteQuote />
    </StepShell>
  );
}
