"use client";

// One quote, checked line by line against the typical prices. The math is plain
// code (lib/quote.ts). The AI only writes the "questions to ask".

import { PlainCodeNote } from "./Agent";
import { RangeBar } from "./Bars";
import { Badge, Callout, Card, PlaceholderNote, Thinking } from "./ui";
import { VERDICT_LABEL, VERDICT_TONE } from "./verdict";
import { ai } from "@/lib/ai";
import { usd, usdRange } from "@/lib/format";
import { useAsyncResult } from "@/lib/hooks";
import { compareQuote } from "@/lib/quote";
import { missingLines } from "@/lib/recommend";
import { WATER_HEATER_JOB } from "@/lib/seed";
import type { VendorQuote } from "@/lib/types";

export function QuoteDetail({ quote, license, showNote = true }: { quote: VendorQuote; license?: string | null; showNote?: boolean }) {
  const comparison = compareQuote(quote, WATER_HEATER_JOB);
  const total = comparison.total;
  const missing = missingLines(quote, WATER_HEATER_JOB);
  const key = `${quote.vendorId}|${quote.total}|${quote.lines.map((l) => `${l.id}:${l.amount}`).join(",")}`;
  const check = useAsyncResult(key, () => ai.checkQuote({ quote, item: WATER_HEATER_JOB }));
  const flaggedNames = new Set(check.data?.flaggedLines.map((f) => f.line) ?? []);
  const over = Math.round(total.percentOverTop);

  return (
    <div className="space-y-5">
      <Card>
        <div className="flex flex-wrap items-center gap-3">
          <h3 className="font-display text-2xl font-extrabold">{quote.vendorName}</h3>
          <Badge tone={VERDICT_TONE[total.verdict]} size="lg">
            {VERDICT_LABEL[total.verdict]}
          </Badge>
        </div>
        <p className="mt-2 text-lg">
          {total.verdict === "fair" && `${usd(quote.total)} is inside the typical range of ${usdRange(total.range.low, total.range.high)}.`}
          {total.verdict === "low" &&
            `${usd(quote.total)} is below the typical range. Ask what is left out before you say yes.`}
          {(total.verdict === "slightly high" || total.verdict === "high") &&
            `${usd(quote.total)} is about ${over}% above the top of the typical range of ${usdRange(total.range.low, total.range.high)}.`}
        </p>
        <div className="mt-2">
          <RangeBar amount={quote.total} range={total.range} />
        </div>
        {license !== undefined && (
          <p className="mt-3">
            <strong>License:</strong> {license ?? "Not shown"}
            {license === null && (
              <span className="ml-1 align-middle">{" "}
                <Badge tone="caution">Ask before booking</Badge>
              </span>
            )}
          </p>
        )}
        {missing.length > 0 && (
          <p className="mt-2 rounded-xl bg-caution-tint/70 p-3 font-bold text-caution-ink">
            Not listed on this quote: {missing.join(", ")}. Ask whether it is included or extra.
          </p>
        )}
        <div className="mt-3 space-y-2">
          <PlainCodeNote>The total is compared with a hand-checked price table. The AI did not set this verdict.</PlainCodeNote>
          {showNote && (
            <>
              <PlaceholderNote /> <span className="text-sm text-ink-soft">(typical prices and these sample quotes)</span>
            </>
          )}
        </div>
      </Card>

      <details className="card !p-0">
        <summary className="flex min-h-11 cursor-pointer items-center px-5 py-3 text-lg font-extrabold">
          See the line by line math
          <span className="ml-1 text-sm font-normal text-ink-soft">{" "}(each item against a typical price)</span>
        </summary>
        <div className="px-5 pb-5">
        <div className="overflow-hidden rounded-xl border border-line">
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
                        {line.verdict === "high" && (
                        <span className="ml-1 align-middle">{" "}
                          <Badge tone="urgent">High</Badge>
                        </span>
                      )}
                      {line.verdict === "slightly high" && (
                        <span className="ml-1 align-middle">{" "}
                          <Badge tone="caution">Slightly high</Badge>
                        </span>
                      )}
                      {line.verdict === "low" && (
                        <span className="ml-1 align-middle">{" "}
                          <Badge tone="caution">Low</Badge>
                        </span>
                      )}
                      {line.verdict === "fair" && (
                        <span className="ml-1 align-middle">{" "}
                          <Badge tone="good">OK</Badge>
                        </span>
                      )}
                      {line.verdict === null && (
                        <span className="ml-1 align-middle">{" "}
                          <Badge tone="neutral" icon={false}>Not compared</Badge>
                        </span>
                      )}
                      {!high && flaggedNames.has(line.label) && (
                          <span className="mt-0.5 block text-sm font-bold text-caution-ink">
                            Question for the vendor: {check.data?.flaggedLines.find((f) => f.line === line.label)?.reason}
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
                  <td className="px-3 py-2 text-right text-lg font-extrabold">{usd(quote.total)}</td>
                  <td className="hidden px-3 py-2 text-right text-ink-soft sm:table-cell">
                    {usdRange(total.range.low, total.range.high)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </details>

      {check.loading || !check.data ? (
        <Thinking message="Writing questions to ask this vendor..." />
      ) : (
        <div className="grid gap-5 md:grid-cols-2">
          <Card title="Lines to look at">
            {check.data.flaggedLines.length === 0 ? (
              <p>Nothing stands out on this quote.</p>
            ) : (
              <ul className="space-y-3">
                {check.data.flaggedLines.map((f) => (
                  <li key={f.line} className="rounded-xl bg-caution-tint/70 p-3">
                    <p className="font-extrabold">{f.line}</p>
                    <p>{f.reason}</p>
                  </li>
                ))}
              </ul>
            )}
          </Card>
          <Card title="Questions to ask the vendor">
            <ol className="list-decimal space-y-2 pl-6">
              {check.data.questionsToAsk.map((q) => (
                <li key={q}>{q}</li>
              ))}
            </ol>
            <p className="hint">Written by the AI. The numbers above are not.</p>
          </Card>
        </div>
      )}

      {check.data && check.data.estimatedSavingsHigh > 0 && (
        <Callout tone="info" title="Possible savings">
          <p>
            You may be able to negotiate{" "}
            <strong>
              {usd(check.data.estimatedSavingsLow)} to {usd(check.data.estimatedSavingsHigh)}
            </strong>{" "}
            off this quote, or choose a quote that is already fair.
          </p>
          <p className="mt-1 text-sm">
            {usd(check.data.estimatedSavingsLow)} brings it down to {usd(total.range.high)}, the top of the typical range.{" "}
            {usd(check.data.estimatedSavingsHigh)} brings it to {usd(Math.round((total.range.low + total.range.high) / 2))}, the middle of it.
          </p>
        </Callout>
      )}
    </div>
  );
}
