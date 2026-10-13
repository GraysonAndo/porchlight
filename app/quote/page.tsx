"use client";

import { useEffect } from "react";
import { RangeBar } from "@/components/Bars";
import { StepShell } from "@/components/StepShell";
import { Badge, Callout, Card, PlaceholderNote, Thinking } from "@/components/ui";
import { VERDICT_LABEL, VERDICT_TONE } from "@/components/verdict";
import { ai } from "@/lib/ai";
import { usd, usdRange } from "@/lib/format";
import { compareQuote, percentOverTop } from "@/lib/quote";
import { BAYSIDE_QUOTE, WATER_HEATER_JOB } from "@/lib/seed";
import { useDemo } from "@/lib/store";

export default function QuotePage() {
  const { state, actions, hydrated } = useDemo();
  const result = state.quoteCheck;
  const comparison = compareQuote(BAYSIDE_QUOTE, WATER_HEATER_JOB);

  useEffect(() => {
    if (!hydrated || result) return;
    let cancelled = false;
    ai.checkQuote({ quote: BAYSIDE_QUOTE, item: WATER_HEATER_JOB }).then((r) => {
      if (!cancelled) actions.setQuoteCheck(r);
    });
    return () => {
      cancelled = true;
    };
  }, [hydrated, result, actions]);

  const flaggedNames = new Set(result?.flaggedLines.map((f) => f.line) ?? []);
  const over = Math.round(percentOverTop(BAYSIDE_QUOTE.total, WATER_HEATER_JOB.marketTotal));

  return (
    <StepShell step={5} nextLabel="Next: Repair or replace" nextDisabled={!result}>
      <Card title="The vendor quote">
        <p className="font-bold">{BAYSIDE_QUOTE.vendorName}</p>
        <p className="text-ink-soft">Job: {WATER_HEATER_JOB.name}</p>
        <div className="mt-3 overflow-hidden rounded-xl border border-line">
          <table className="w-full text-left">
            <caption className="sr-only">Quote line items compared with typical prices</caption>
            <thead className="bg-cream-deep text-sm">
              <tr>
                <th scope="col" className="px-3 py-2">
                  Item
                </th>
                <th scope="col" className="px-3 py-2 text-right">
                  Quote
                </th>
                <th scope="col" className="hidden px-3 py-2 text-right sm:table-cell">
                  Typical
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {comparison.lines.map((line) => {
                const high = line.verdict === "high" || line.verdict === "slightly high";
                const flagged = high || flaggedNames.has(line.label);
                return (
                  <tr key={line.id} className={flagged ? "bg-caution-tint/60" : ""}>
                    <td className="px-3 py-2">
                      {line.label}
                      {high && (
                        <span className="ml-2 align-middle">
                          <Badge tone="urgent">High</Badge>
                        </span>
                      )}
                      {!high && flaggedNames.has(line.label) && (
                        <span className="ml-2 align-middle">
                          <Badge tone="caution">Ask</Badge>
                        </span>
                      )}
                      {line.range && (
                        <span className="block text-sm text-ink-soft sm:hidden">
                          Typical {usdRange(line.range.low, line.range.high)}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right font-bold">{usd(line.amount)}</td>
                    <td className="hidden px-3 py-2 text-right text-ink-soft sm:table-cell">
                      {line.range ? usdRange(line.range.low, line.range.high) : "n/a"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-cream-deep">
              <tr>
                <th scope="row" className="px-3 py-2">
                  Total
                </th>
                <td className="px-3 py-2 text-right text-lg font-extrabold">{usd(BAYSIDE_QUOTE.total)}</td>
                <td className="hidden px-3 py-2 text-right text-ink-soft sm:table-cell">
                  {usdRange(WATER_HEATER_JOB.marketTotal.low, WATER_HEATER_JOB.marketTotal.high)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
        <p className="mt-2">
          <PlaceholderNote /> <span className="text-sm text-ink-soft">(typical prices and this sample quote)</span>
        </p>
      </Card>

      {!result ? (
        <Thinking message="Comparing this quote to typical prices..." />
      ) : (
        <>
          <Card>
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-2xl font-extrabold">Is this quote fair?</h2>
              <Badge tone={VERDICT_TONE[result.verdict]} size="lg">
                {VERDICT_LABEL[result.verdict]}
              </Badge>
            </div>
            <p className="mt-2 text-lg">
              {result.verdict === "fair" && "The total is inside the typical range."}
              {result.verdict === "low" &&
                "The total is below the typical range. Ask what is left out before you say yes."}
              {(result.verdict === "slightly high" || result.verdict === "high") &&
                `The total is about ${over}% above the top of the typical range of ${usdRange(result.marketLow, result.marketHigh)}.`}
            </p>
            <div className="mt-2">
              <RangeBar amount={BAYSIDE_QUOTE.total} range={{ low: result.marketLow, high: result.marketHigh }} />
            </div>
            <p className="mt-3">
              <PlaceholderNote /> <span className="text-sm text-ink-soft">(typical range)</span>
            </p>
          </Card>

          <div className="grid gap-5 md:grid-cols-2">
            <Card title="Lines to look at">
              <ul className="space-y-3">
                {result.flaggedLines.map((f) => (
                  <li key={f.line} className="rounded-xl bg-caution-tint/70 p-3">
                    <p className="font-extrabold">{f.line}</p>
                    <p>{f.reason}</p>
                  </li>
                ))}
              </ul>
            </Card>

            <Card title="Questions to ask the vendor">
              <ol className="list-decimal space-y-2 pl-6">
                {result.questionsToAsk.map((q) => (
                  <li key={q}>{q}</li>
                ))}
              </ol>
            </Card>
          </div>

          {result.estimatedSavingsHigh > 0 && (
            <Callout tone="info" title="Possible savings">
              <p>
                You may be able to negotiate{" "}
                <strong>
                  {usd(result.estimatedSavingsLow)} to {usd(result.estimatedSavingsHigh)}
                </strong>{" "}
                off this quote. Getting a second quote is a good idea. Two more vendors are on the last screen.
              </p>
              <p className="mt-1">
                <PlaceholderNote />
              </p>
            </Callout>
          )}
        </>
      )}
    </StepShell>
  );
}
