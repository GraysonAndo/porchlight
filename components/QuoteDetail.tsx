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
import { compareQuote, nearTopLines, normalizeQuote, rangePosition } from "@/lib/quote";
import { missingLines } from "@/lib/recommend";
import { WATER_HEATER_JOB, type VendorDetails } from "@/lib/seed";
import type { VendorQuote } from "@/lib/types";

const NOT_PROVIDED = "Not provided";

export function QuoteDetail({ quote, license, details, showNote = true }: { quote: VendorQuote; license?: string | null; details?: VendorDetails | null; showNote?: boolean }) {
  const comparison = compareQuote(quote, WATER_HEATER_JOB);
  const normalized = normalizeQuote(quote, WATER_HEATER_JOB);
  const position = rangePosition(quote.total, WATER_HEATER_JOB.marketTotal);
  const nearTop = nearTopLines(quote, WATER_HEATER_JOB);
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
        <p className="mt-2 text-sm">
          {position >= 1
            ? `This total is above the top of the typical range.`
            : position <= 0
              ? `This total is below the bottom of the typical range.`
              : `This total sits about ${Math.round(position * 100)}% of the way up the typical range of ${usdRange(total.range.low, total.range.high)}.`}
        </p>
        {nearTop.length > 0 && (
          <ul className="mt-2 space-y-1 text-sm font-bold text-caution-ink">
            {nearTop.map((l) => (
              <li key={l.id}>
                {l.label} {usd(l.amount)} is {l.position >= 1 ? "at or above" : "near"} the top of its typical {usdRange(l.range.low, l.range.high)}. A good line to ask about.
              </li>
            ))}
          </ul>
        )}
        {normalized.adjustments.length > 0 && (
          <div className="mt-3 rounded-xl border border-line bg-cream p-3 text-sm">
            <p className="font-extrabold">Adjusted so it covers the same work as the others</p>
            <dl className="mt-1 space-y-0.5">
              <div className="flex justify-between gap-3">
                <dt>As quoted</dt>
                <dd className="font-bold">{usd(normalized.original)}</dd>
              </div>
              {normalized.adjustments.map((a) => (
                <div key={a.id} className="flex justify-between gap-3">
                  <dt>
                    Not listed: {a.label.toLowerCase()}, added at a typical price
                    <span className="block text-xs text-ink-soft">{a.basis}</span>
                  </dt>
                  <dd className="font-bold">+{usd(a.amount)}</dd>
                </div>
              ))}
              <div className="flex justify-between gap-3 border-t border-line pt-1">
                <dt className="font-extrabold">Adjusted total for comparison</dt>
                <dd className="font-extrabold">{usd(normalized.adjusted)}</dd>
              </div>
            </dl>
            <p className="mt-1 text-xs text-ink-soft">The vendor&apos;s own price is unchanged. Ask whether the missing work is included or extra.</p>
          </div>
        )}
        {details !== undefined && (
          <dl className="mt-3 grid grid-cols-[10rem_1fr] gap-y-1 text-sm">
            <dt className="font-bold text-ink-soft">Soonest visit</dt>
            <dd>{details?.availability ?? NOT_PROVIDED}</dd>
            <dt className="font-bold text-ink-soft">Parts warranty</dt>
            <dd>{details?.partsWarranty ?? NOT_PROVIDED}</dd>
            <dt className="font-bold text-ink-soft">Labor warranty</dt>
            <dd>{details?.laborWarranty ?? NOT_PROVIDED}</dd>
            <dt className="font-bold text-ink-soft">Tank size</dt>
            <dd>{details?.unitSize ?? NOT_PROVIDED}</dd>
            <dt className="font-bold text-ink-soft">Fuel</dt>
            <dd>{details?.fuel ?? NOT_PROVIDED}</dd>
            <dt className="font-bold text-ink-soft">Quote is good for</dt>
            <dd>{details?.validFor ?? NOT_PROVIDED}</dd>
          </dl>
        )}
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

      {check.timedOut || check.failed ? (
        <Callout tone="caution" title="The questions are taking longer than expected" role="alert">
          <p>Here are the basics to ask any vendor while that finishes, or try again.</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>How many labor hours are in the estimate, and what is the hourly rate?</li>
            <li>Is a permit needed, and is it included or extra?</li>
            <li>How long is the warranty on parts and on labor?</li>
          </ul>
          <button type="button" className="btn btn-primary mt-3" onClick={check.retry}>
            Retry
          </button>
        </Callout>
      ) : check.loading || !check.data ? (
        <div className="min-h-[28rem] md:min-h-[13rem]">
          <Thinking message="Writing questions to ask this vendor..." />
        </div>
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
