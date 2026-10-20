"use client";

import Link from "next/link";
import { PlainCodeNote } from "@/components/Agent";
import { StepShell } from "@/components/StepShell";
import { Badge, Callout, Card, PlaceholderNote, type Tone } from "@/components/ui";
import { currentHeater, equipmentFor } from "@/lib/equipment";
import { buildForecast, type ForecastStatus } from "@/lib/forecast";
import { usd, usdRange } from "@/lib/format";
import { useDemo } from "@/lib/store";

const STATUS_TONE: Record<ForecastStatus, Tone> = {
  "overdue or due now": "urgent",
  "within 5 years": "caution",
  "beyond 5 years": "good",
};

/** $1,600 becomes $1.6k, so bar labels fit on a phone. */
function compact(n: number): string {
  if (n < 1000) return `$${n}`;
  const k = n / 1000;
  return `$${Number.isInteger(k) ? k : k.toFixed(1)}k`;
}

/** A new heater is on this list because a repair finished. This is the way back to that job. */
function JobLink() {
  return (
    <Link href="/owner/request" className="mt-0.5 block text-sm font-bold text-brand underline underline-offset-4">
      Replaced, see the job
    </Link>
  );
}

export default function ForecastPage() {
  const { state } = useDemo();
  const built = buildForecast(equipmentFor(currentHeater(state), state.equipmentEdits));
  // Soonest first, so the most urgent items are at the top.
  const forecast = { ...built, rows: [...built.rows].sort((x, y) => x.dueYear - y.dueYear) };
  const maxHigh = Math.max(1, ...forecast.years.map((y) => y.high));
  const first = forecast.years[0].year;
  const last = forecast.years[forecast.years.length - 1].year;

  return (
    <StepShell stepId="tools-forecast">
      <div className="hero-ink">
        <p className="eyebrow !text-cream/70">Plan to set aside each year</p>
        <p className="mt-2 text-4xl font-extrabold leading-tight text-glow sm:text-6xl">
          {usd(forecast.setAsideLowPerYear)} to {usd(forecast.setAsideHighPerYear)}
        </p>
        <p className="mt-2 text-xl font-bold text-cream">
          About {usd(forecast.setAsideLowPerMonth)} to {usd(forecast.setAsideHighPerMonth)} a month
        </p>
        <p className="mt-3 text-lg text-cream/85">
          That is the cost of everything due from {first} to {last} ({usdRange(forecast.totalLow, forecast.totalHigh)}),
          spread over {forecast.years.length} years.
        </p>
        <p className="mt-3">
          <PlaceholderNote className="!text-cream/80" />{" "}
          <span className="text-sm text-cream/80">(all costs and lifespans on this screen)</span>
        </p>
      </div>

      <PlainCodeNote>
        Every number here is add-and-divide on the equipment ages in your house record. The AI is not involved, so the
        plan never changes unless the record does.
      </PlainCodeNote>

      <Card title={`What you may spend, ${first} to ${last}`}>
        <div
          role="img"
          aria-label={`Bar chart of estimated replacement costs by year. ${forecast.years
            .map((y) => `${y.year}: ${usdRange(y.low, y.high)}`)
            .join(". ")}.`}
        >
          <div className="flex h-56 items-end gap-2 border-b-2 border-ink sm:gap-4">
            {forecast.years.map((y) => {
              const lowPct = (y.low / maxHigh) * 100;
              const highPct = (y.high / maxHigh) * 100;
              return (
                <div key={y.year} className="flex h-full flex-1 flex-col justify-end">
                  <p className="mb-1 text-center text-xs font-bold sm:text-sm">
                    {y.high === 0 ? (
                      "$0"
                    ) : (
                      <>
                        <span className="sm:hidden">{`${compact(y.low)} to ${compact(y.high)}`}</span>
                        <span className="hidden sm:inline">{usdRange(y.low, y.high)}</span>
                      </>
                    )}
                  </p>
                  <div className="bar-rise relative w-full" style={{ height: `${highPct * 0.82}%` }}>
                    <div className="absolute inset-0 rounded-t-lg bg-glow/50" />
                    <div
                      className="absolute inset-x-0 bottom-0 rounded-t-lg bg-ink"
                      style={{ height: `${highPct > 0 ? (lowPct / highPct) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-1 flex gap-2 sm:gap-4">
            {forecast.years.map((y) => (
              <p key={y.year} className="flex-1 text-center text-sm font-extrabold">
                {y.year}
              </p>
            ))}
          </div>
        </div>
        <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
          <span className="inline-flex items-center gap-2">
            <span className="inline-block h-3 w-3 rounded-sm bg-ink" aria-hidden="true" /> Low estimate
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="inline-block h-3 w-3 rounded-sm bg-glow/50" aria-hidden="true" /> Up to the high estimate
          </span>
        </p>
        <p className="mt-2 text-sm text-ink-soft">
          Items already past due are counted in {first}, because that is when the money is needed.
        </p>
      </Card>

      <Card title="Each item">
        {/* Phone: stacked list. Larger screens: table. */}
        <ul className="divide-y divide-line md:hidden">
          {forecast.rows.map((row) => (
            <li key={row.id} className="py-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-lg font-extrabold">
                  {row.name}
                  {row.id === "water-heater" && state.jobCompletedAt && <JobLink />}
                </p>
                <Badge tone={STATUS_TONE[row.status]}>{row.status}</Badge>
              </div>
              <p className="text-ink-soft">
                Installed {row.installYear}. Typical life {row.typicalLifeYears} years. Due {row.dueYear}.
              </p>
              <p className="font-bold">Replace: {usdRange(row.replaceLow, row.replaceHigh)}</p>
            </li>
          ))}
        </ul>

        <div className="hidden overflow-hidden rounded-xl border border-line md:block">
          <table className="w-full text-left">
            <caption className="sr-only">Replacement forecast by item</caption>
            <thead className="bg-cream-deep text-sm">
              <tr>
                <th scope="col" className="px-3 py-2">Item</th>
                <th scope="col" className="px-3 py-2">Installed</th>
                <th scope="col" className="px-3 py-2">Typical life</th>
                <th scope="col" className="px-3 py-2">Due</th>
                <th scope="col" className="px-3 py-2">Status</th>
                <th scope="col" className="px-3 py-2 text-right">Replace cost</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {forecast.rows.map((row) => (
                <tr key={row.id}>
                  <th scope="row" className="px-3 py-2 font-bold">
                    {row.name}
                    {row.id === "water-heater" && state.jobCompletedAt && <JobLink />}
                  </th>
                  <td className="px-3 py-2">{row.installYear}</td>
                  <td className="px-3 py-2">{row.typicalLifeYears} years</td>
                  <td className="px-3 py-2">{row.dueYear}</td>
                  <td className="px-3 py-2">
                    <Badge tone={STATUS_TONE[row.status]}>{row.status}</Badge>
                  </td>
                  <td className="px-3 py-2 text-right">{usdRange(row.replaceLow, row.replaceHigh)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Callout tone="neutral" title="About these numbers">
        <p>
          Costs and lifespans are rough placeholders. Real homes vary a lot. A real version
          would use local prices and the condition of each item.
        </p>
        <p className="mt-1">
          <PlaceholderNote />
        </p>
      </Callout>
    </StepShell>
  );
}
