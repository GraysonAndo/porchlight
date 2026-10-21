"use client";

import Link from "next/link";
import { PlainCodeNote } from "@/components/Agent";
import { StepShell } from "@/components/StepShell";
import { Badge, Callout, Card, NumberField, PlaceholderNote, type Tone } from "@/components/ui";
import { currentHeater, equipmentFor } from "@/lib/equipment";
import { buildForecast, cashFlowFor, type ForecastStatus } from "@/lib/forecast";
import { usd, usdRange } from "@/lib/format";
import { useDemo } from "@/lib/store";
import { useState } from "react";

const STATUS_TONE: Record<ForecastStatus, Tone> = {
  "overdue or due now": "urgent",
  "within 5 years": "info",
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
  const [saved, setSaved] = useState(0);
  const [savedBad, setSavedBad] = useState(false);
  const [monthlyOverride, setMonthlyOverride] = useState<number | null>(null);
  const [monthlyBad, setMonthlyBad] = useState(false);
  // A heater that is booked for replacement is not a future cost any more: the money is already decided. It leaves the plan
  // until the new one is registered.
  const replacing = state.approval !== null && state.jobCompletedAt === null;
  const everything = equipmentFor(currentHeater(state), state.equipmentEdits, state.extraEquipment);
  const built = buildForecast(replacing ? everything.filter((e) => e.id !== "water-heater") : everything);
  // Soonest first, so the most urgent items are at the top.
  const forecast = { ...built, rows: [...built.rows].sort((x, y) => x.dueYear - y.dueYear) };
  const maxHigh = Math.max(1, ...forecast.years.map((y) => y.high));
  const first = forecast.years[0].year;
  const monthly = monthlyOverride ?? forecast.setAsideHighPerMonth;
  const cash = cashFlowFor(forecast.years, monthlyBad ? forecast.setAsideHighPerMonth : monthly, savedBad ? 0 : saved);
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
        <p className="mt-2 text-cream/85">That is an average. Bills do not come evenly, so see the cash check below.</p>
        <p className="mt-3">
          <PlaceholderNote className="!text-cream/80" />{" "}
          <span className="text-sm text-cream/80">(all costs and lifespans on this screen)</span>
        </p>
      </div>

      <PlainCodeNote>
        Every number here is add-and-divide on the equipment ages in your house record. The AI is not involved, so the
        plan never changes unless the record does.
      </PlainCodeNote>

      {replacing && (
        <Callout tone="good" title="Your water heater is being replaced now">
          <p>
            It is booked, so it is not counted as a future cost. When the plumber finishes, the new one is added here on its own.{" "}
            <Link href="/owner/request" className="font-bold underline underline-offset-4">
              See the job
            </Link>
          </p>
        </Callout>
      )}

      <Card title="Will your set-aside cover it?">
        <p className="text-ink-soft">
          Spreading the cost over five years gives {usd(forecast.setAsideLowPerMonth)} to {usd(forecast.setAsideHighPerMonth)} a month. But bills come due in
          their own years, not evenly. This walks through each year, using the high estimates to be safe.
        </p>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <NumberField
            id="already-saved"
            label="Already set aside for repairs"
            prefix="$"
            step="any"
            min={0}
            value={saved}
            onChange={(v) => setSaved(Math.round(v * 100) / 100)}
            onEmptyChange={setSavedBad}
            validate={(v) => (v < 0 ? "Enter $0 or more." : null)}
          />
          <NumberField
            id="monthly-setaside"
            label="Set aside each month"
            prefix="$"
            step="any"
            min={0}
            value={monthly}
            onChange={(v) => setMonthlyOverride(Math.round(v * 100) / 100)}
            onEmptyChange={setMonthlyBad}
            validate={(v) => (v < 0 ? "Enter $0 or more." : null)}
            hint="Starts at the high end of the even plan."
          />
        </div>
        <div className="mt-4 overflow-hidden rounded-xl border border-line">
          <table className="w-full text-left text-sm sm:text-base">
            <caption className="sr-only">Money on hand against bills, by year</caption>
            <thead className="bg-cream-deep text-sm">
              <tr>
                <th scope="col" className="px-3 py-2">Year</th>
                <th scope="col" className="px-3 py-2 text-right">On hand</th>
                <th scope="col" className="px-3 py-2 text-right">Bills</th>
                <th scope="col" className="px-3 py-2 text-right">Left</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {cash.rows.map((r) => (
                <tr key={r.year} className={r.left < 0 ? "bg-urgent-tint" : ""}>
                  <th scope="row" className="px-3 py-2 font-bold">{r.year}</th>
                  <td className="px-3 py-2 text-right">{usd(Math.max(0, r.onHand))}</td>
                  <td className="px-3 py-2 text-right">{usd(r.bills)}</td>
                  <td className={`px-3 py-2 text-right font-extrabold ${r.left < 0 ? "text-urgent" : "text-good-ink"}`}>
                    {r.left < 0 ? `Short ${usd(-r.left)}` : usd(r.left)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p
          role="status"
          className={`mt-3 rounded-xl p-3 font-bold ${cash.firstShortYear === null ? "bg-good-tint text-good-ink" : "bg-caution-tint text-caution-ink"}`}
        >
          {cash.firstShortYear === null
            ? "Covered: every year's bills are paid from what is on hand."
            : `You would be short in ${cash.firstShortYear}, by as much as ${usd(cash.worstShortfall)} in one year. To stay covered, have ${usd(cash.neededNow)} on hand now${cash.monthlyToCover > 0 ? ` and set aside ${usd(cash.monthlyToCover)} a month after that` : ""}.`}
        </p>
      </Card>

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
      </Callout>
    </StepShell>
  );
}
