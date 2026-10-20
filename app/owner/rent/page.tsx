"use client";

import { PlainCodeNote } from "@/components/Agent";
import { useState } from "react";
import { StepShell } from "@/components/StepShell";
import { Badge, Callout, Card, NumberField, PlaceholderNote } from "@/components/ui";
import { addDays, longDate, pct, usd, usdCents } from "@/lib/format";
import { useToday } from "@/lib/hooks";
import { LEASE_ANNIVERSARY, LEASE_ANNIVERSARY_ISO } from "@/lib/houseQa";
import { MAX_SANE_RENT, buildNotice, calculateRent, effectiveDateFor, maxNewRentFor, noticeKindFor, rentLooksTooHigh, roundToCents } from "@/lib/rent";
import { PROPERTY } from "@/lib/seed";

const STATUTE_URL = "https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=CIV&sectionNum=1947.12";
import { useDemo } from "@/lib/store";

function Check({
  id,
  checked,
  onChange,
  children,
}: {
  id: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  children: React.ReactNode;
}) {
  return (
    <label htmlFor={id} className="flex min-h-11 cursor-pointer items-start gap-3 py-1.5">
      <input
        id={id}
        type="checkbox"
        className="mt-1 h-6 w-6 shrink-0 accent-[#2e7d5b]"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span>{children}</span>
    </label>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-4 border-b border-line py-2 last:border-b-0">
      <dt className="font-bold text-ink-soft">{label}</dt>
      <dd className="text-right text-lg font-extrabold">{children}</dd>
    </div>
  );
}

export default function RentPage() {
  const { state, actions } = useDemo();
  const form = state.rent;
  const today = useToday();
  const [dateOverride, setDateOverride] = useState<string | null>(null);
  const [copied, setCopied] = useState<"" | "yes" | "no">("");
  const noticeDate = dateOverride ?? today;
  // A box that has been cleared is not a number. The result waits instead of using an old value.
  const [empty, setEmpty] = useState({ current: false, cpi: false, proposed: false });
  const markEmpty = (key: "current" | "cpi" | "proposed") => (isEmpty: boolean) =>
    setEmpty((e) => (e[key] === isEmpty ? e : { ...e, [key]: isEmpty }));
  const missing = [
    empty.current || form.currentRent <= 0 ? "the current rent" : null,
    empty.proposed || form.proposedRent <= 0 ? "the proposed new rent" : null,
    empty.cpi ? "the local inflation number" : null,
  ].filter((m): m is string => m !== null);
  const cpiOdd = !empty.cpi && (form.cpiPercent < 0 || form.cpiPercent > 10);
  // One home renting for more than this is almost surely a typing mistake, so no result is made from it.
  const rentOdd = rentLooksTooHigh(form.currentRent) || rentLooksTooHigh(form.proposedRent);
  const [startOverride, setStartOverride] = useState<string | null>(null);

  const result = calculateRent({
    currentRent: form.currentRent,
    cpiPercent: form.cpiPercent,
    proposedRent: form.proposedRent,
    tenancy12Plus: form.tenancy12Plus,
    increasesInLast12Months: form.increasesInLast12Months,
    singleFamilyOrCondo: form.singleFamilyOrCondo,
    notCorporateOwned: form.notCorporateOwned,
    exemptionNoticeGiven: form.exemptionNoticeGiven,
    buildingUnder15Years: form.buildingUnder15Years,
  });

  const notice = buildNotice({
    ownerName: PROPERTY.owner,
    tenantName: PROPERTY.tenant,
    address: PROPERTY.address,
    currentRent: form.currentRent,
    newRent: form.proposedRent,
    noticeDate,
    noticeDays: result.noticeDays,
  });
  const effective = longDate(effectiveDateFor(noticeDate, result.noticeDays));
  const ready = missing.length === 0 && !rentOdd && !cpiOdd;
  const kind = noticeKindFor(form.currentRent, form.proposedRent);
  const canSend = ready && kind !== "none" && (kind === "decrease" || result.withinCap || result.mayBeExempt);
  // GoHome's suggestion: the usual 5% raise, but never above what the law allows.
  const suggested = Math.min(Math.round(form.currentRent * 1.05), Math.floor(maxNewRentFor(form.currentRent, result.capPercent)));
  // The start date the owner wants, and the last day to send the notice for it to start then.
  const startDate = startOverride ?? LEASE_ANNIVERSARY_ISO;
  const noticeLead = kind === "increase" ? result.noticeDays : 0;
  const sendBy = addDays(startDate, -noticeLead);
  const tooLate = Boolean(sendBy) && Boolean(today) && sendBy < today;
  const [sentNow, setSentNow] = useState(false);
  const sent = state.rentNotice;

  async function copy() {
    try {
      await navigator.clipboard.writeText(notice);
      setCopied("yes");
    } catch {
      setCopied("no");
    }
  }

  const capBlock = (
    <dl>
      <Row label="State cap">
        {pct(result.capPercent)}
        <span className="block text-sm font-normal text-ink-soft">
          5% plus local inflation of {pct(form.cpiPercent)}, never more than 10%
        </span>
      </Row>
      <Row label="Highest allowed new rent">{usdCents(result.maxNewRent)}</Row>
      <Row label="Your proposed rent">
        {usdCents(result.proposedRent)}
        <span className="block text-sm font-normal text-ink-soft">
          {result.increaseAmount >= 0 ? "+" : "-"}
          {usdCents(Math.abs(result.increaseAmount))} ({pct(result.increasePercent)})
        </span>
      </Row>
      <Row label="Notice period">
        {result.noticeDays} days
        <span className="block text-sm font-normal text-ink-soft">
          {result.noticeDays === 30 ? "The increase is 10% or less." : "The increase is more than 10%."}
        </span>
      </Row>
    </dl>
  );

  return (
    <StepShell stepId="tools-rent">
      <p className="rounded-2xl bg-glow-tint px-4 py-3 font-bold">
        California only, for now. California limits how much rent can go up in a year. This follows that law (called AB 1482,{" "}
        <a href={STATUTE_URL} className="underline underline-offset-4" target="_blank" rel="noreferrer">
          Civil Code 1947.12
        </a>
        ).
      </p>
      <Card title="From your lease">
        <dl className="grid gap-x-6 gap-y-1 text-sm sm:grid-cols-3">
          <div>
            <dt className="font-bold text-ink-soft">Current rent</dt>
            <dd className="text-lg font-extrabold">{usd(PROPERTY.rent)} a month</dd>
          </div>
          <div>
            <dt className="font-bold text-ink-soft">Last increase</dt>
            <dd className="text-lg font-extrabold">14 months ago</dd>
          </div>
          <div>
            <dt className="font-bold text-ink-soft">Lease anniversary</dt>
            <dd className="text-lg font-extrabold">{LEASE_ANNIVERSARY}</dd>
          </div>
        </dl>
        <div className="mt-3 flex flex-col gap-2 rounded-xl bg-good-tint p-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="font-bold text-good-ink">
            GoHome suggests a {usd(suggested)} rent ({pct(((suggested - form.currentRent) / form.currentRent) * 100, 1)} more). That is under the legal limit of {usdCents(maxNewRentFor(form.currentRent, result.capPercent))}.
          </p>
          <button type="button" className="btn btn-primary shrink-0" onClick={() => actions.setRent({ proposedRent: suggested })}>
            Use {usd(suggested)}
          </button>
        </div>
      </Card>
      <PlainCodeNote>
        The legal cap is worked out with exact math from the numbers you enter. The AI never decides what is legal. It
        only helps word the notice.
      </PlainCodeNote>
      <div className="grid gap-5 lg:grid-cols-2">
        <Card title="Your numbers">
          <div className="space-y-5">
            <NumberField
              id="current-rent"
              label="Current rent per month"
              prefix="$"
              step="any"
              min={0}
              value={form.currentRent}
              onChange={(v) => actions.setRent({ currentRent: roundToCents(v) })}
              onEmptyChange={markEmpty("current")}
              invalid={empty.current || rentLooksTooHigh(form.currentRent)}
            />
            <NumberField
              id="cpi"
              label="Local inflation (CPI), percent"
              suffix="%"
              step="any"
              value={form.cpiPercent}
              onChange={(v) => actions.setRent({ cpiPercent: roundToCents(v) })}
              onEmptyChange={markEmpty("cpi")}
              invalid={empty.cpi || cpiOdd}
              hint={
                <>
                  GoHome looked this up for your area. <PlaceholderNote />
                  {cpiOdd && (
                    <span role="alert" className="mt-1 block font-bold text-caution-ink">
                      Check this number. A yearly inflation change is usually between 0% and 10%.
                    </span>
                  )}
                </>
              }
            />
            <NumberField
              id="proposed-rent"
              label="Proposed new rent per month"
              prefix="$"
              step="any"
              min={0}
              value={form.proposedRent}
              onChange={(v) => actions.setRent({ proposedRent: roundToCents(v) })}
              onEmptyChange={markEmpty("proposed")}
              invalid={empty.proposed || rentLooksTooHigh(form.proposedRent)}
            />

            <NumberField
              id="increases"
              label="Increases already given in the last 12 months"
              step={1}
              min={0}
              value={form.increasesInLast12Months}
              onChange={(v) => actions.setRent({ increasesInLast12Months: Math.max(0, Math.round(v)) })}
            />

            <fieldset>
              <legend className="label">Exemption checks</legend>
              <p className="hint mb-1">
                Some homes are exempt from the yearly limit: a single family home or condo that is not owned by a large
                investment company or a corporation, when the tenant was given the written exemption notice, or a building
                under 15 years old. Tick each one that is true for this property.
              </p>
              <Check
                id="ex-sfh"
                checked={form.singleFamilyOrCondo}
                onChange={(v) => actions.setRent({ singleFamilyOrCondo: v })}
              >
                It is a single family home or a condo.
              </Check>
              <Check
                id="ex-owner"
                checked={form.notCorporateOwned}
                onChange={(v) => actions.setRent({ notCorporateOwned: v })}
              >
                It is not owned by a large investment company (a REIT), a corporation, or an LLC with a corporate member.
              </Check>
              <Check
                id="ex-notice"
                checked={form.exemptionNoticeGiven}
                onChange={(v) => actions.setRent({ exemptionNoticeGiven: v })}
              >
                The tenant was given the required written exemption notice.
              </Check>
              <Check
                id="ex-new"
                checked={form.buildingUnder15Years}
                onChange={(v) => actions.setRent({ buildingUnder15Years: v })}
              >
                The building is less than 15 years old.
              </Check>
            </fieldset>
          </div>
        </Card>

        <div className="space-y-5">
          <Card>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-xl font-extrabold">Result</h2>
              <Badge tone="info">Draft, not legal advice</Badge>
            </div>

            {missing.length > 0 ? (
              <Callout tone="caution" title="Fill in the numbers to see the result" role="status">
                <p>GoHome needs {missing.join(" and ")}. It will not guess or use an old number.</p>
              </Callout>
            ) : rentOdd ? (
              <Callout tone="caution" title="Check the rent numbers" role="status">
                <p>A rent above {usd(MAX_SANE_RENT)} a month for one home is probably a typing mistake, so GoHome will not make a result from it. Fix the number to continue.</p>
              </Callout>
            ) : cpiOdd ? (
              <Callout tone="caution" title="Check the inflation number" role="status">
                <p>GoHome will not make a result until the local inflation number is between 0% and 10%.</p>
              </Callout>
            ) : kind === "none" ? (
              <Callout tone="neutral" title="The new rent is the same as the current rent" role="status">
                <p>Nothing changes, so there is nothing to send. Change the proposed rent to see a result.</p>
              </Callout>
            ) : result.mayBeExempt ? (
              <div className="mt-3 space-y-3">
                <Callout tone="caution" title="May be exempt from the state cap. Confirm with an attorney.">
                  <p>{result.exemptionReason}</p>
                </Callout>
                <details className="rounded-xl bg-cream px-4">
                  <summary className="flex min-h-11 cursor-pointer items-center font-bold">
                    Show the cap calculation anyway
                  </summary>
                  <div className="pb-3">{capBlock}</div>
                </details>
              </div>
            ) : (
              <div className="mt-3">
                {result.withinCap ? (
                  <Callout tone="good" title={kind === "decrease" ? "✓ OK: this lowers the rent" : "✓ OK: within the state cap"} role="status">
                    <p>{kind === "decrease" ? "A rent decrease does not go over the limit." : "The proposed rent is at or below the highest allowed new rent."}</p>
                  </Callout>
                ) : (
                  <Callout tone="urgent" title={`▲ Exceeds cap by ${usdCents(result.overCapBy)}`} role="status">
                    <p>Lower the new rent to {usdCents(result.maxNewRent)} or less before sending a notice.</p>
                  </Callout>
                )}
                <div className="mt-3">{capBlock}</div>
              </div>
            )}

            <div className="mt-4 space-y-3">
              {result.tooManyIncreases && (
                <Callout tone="urgent" title="▲ Too many increases">
                  <p>No more than two increases are allowed in 12 months, and you already gave two.</p>
                </Callout>
              )}
              <p className="text-sm text-ink-soft">
                No more than two increases are allowed in 12 months.
                {form.increasesInLast12Months === 1 &&
                  " The cap is measured over any 12 months, so the earlier increase counts toward it."}
              </p>
              <p className="text-sm text-ink-soft">
                The state cap applies no matter how long the tenant has lived there, so GoHome does not ask. Other
                protections, like rules about when a tenant can be asked to leave, start after 12 months. Confirm with an attorney.
              </p>
              <Callout tone="caution" title="Check local rules first">
                <p>
                  Local rules (for example San Jose rent ordinances) can be stricter than state law. Check before
                  sending.
                </p>
              </Callout>
            </div>
          </Card>

          <Card>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 id="notice-heading" className="text-xl font-extrabold">
                {kind === "decrease" ? "Notice of rent decrease" : "Notice draft"}
              </h2>
              <Badge tone="info">Draft, not legal advice</Badge>
            </div>

            {ready && kind !== "none" ? (
              <>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div>
                    <label htmlFor="start-date" className="label">
                      When should the new rent start?
                    </label>
                    <input id="start-date" type="date" className="field" value={startDate} onChange={(e) => setStartOverride(e.target.value)} />
                    <p className="hint">Your lease anniversary is {LEASE_ANNIVERSARY}.</p>
                  </div>
                  <div>
                    <label htmlFor="notice-date" className="label">
                      Date you plan to send the notice
                    </label>
                    <input id="notice-date" type="date" className="field" value={noticeDate} onChange={(e) => setDateOverride(e.target.value)} />
                    <p className="hint">
                      {kind === "increase" ? `With a ${result.noticeDays} day notice, the new rent would start ${effective}.` : `The lower rent would start ${effective}.`}
                    </p>
                  </div>
                </div>
                <p
                  role="status"
                  className={`mt-3 rounded-xl p-3 font-bold ${tooLate ? "bg-caution-tint text-caution-ink" : "bg-good-tint text-good-ink"}`}
                >
                  {tooLate
                    ? `Too late for a ${longDate(startDate)} start: the notice should have gone out by ${longDate(sendBy)}. The earliest the new rent can start is ${effective}.`
                    : kind === "increase"
                      ? `To start on ${longDate(startDate)}, send the notice by ${longDate(sendBy)} (${result.noticeDays} days before).`
                      : `A rent decrease can start on ${longDate(startDate)}. Send the notice any time before then.`}
                </p>

                {!result.mayBeExempt && !result.withinCap && kind === "increase" && (
                  <div className="mt-3">
                    <Callout tone="urgent" title="This draft is above the cap">
                      <p>Lower the proposed rent first, or this notice could cause trouble.</p>
                    </Callout>
                  </div>
                )}

                <section aria-labelledby="notice-heading" className="mt-3">
                  <pre className="max-h-96 overflow-auto whitespace-pre-wrap rounded-xl border border-line bg-cream p-4 font-mono text-sm leading-relaxed" tabIndex={0}>
                    {notice}
                  </pre>
                </section>

                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    className="btn btn-primary"
                    disabled={!canSend || Boolean(sent) || sentNow}
                    onClick={() => {
                      actions.sendRentNotice({ kind: kind === "decrease" ? "decrease" : "increase", from: form.currentRent, to: form.proposedRent, effective: effectiveDateFor(noticeDate, result.noticeDays) });
                      setSentNow(true);
                    }}
                  >
                    {sent || sentNow ? "Notice sent" : `Send notice to ${PROPERTY.tenant}`}
                  </button>
                  <button type="button" className="btn btn-secondary" onClick={copy}>
                    Copy notice
                  </button>
                  <span role="status" aria-live="polite" className="font-bold">
                    {copied === "yes" && "✓ Copied to your clipboard"}
                    {copied === "no" && "Could not copy. Select the text above and copy it by hand."}
                  </span>
                </div>
                {!canSend && !sent && !sentNow && <p className="hint">You can send the notice once the new rent is within the limit (or the home may be exempt).</p>}
                {(sent || sentNow) && sent && (
                  <p role="status" className="mt-3 rounded-xl bg-good-tint p-3 font-bold text-good-ink">
                    Sent. {PROPERTY.tenant} was told by text, and the notice goes by mail (sample: nothing was really mailed). New rent {usdCents(sent.to)} starts {longDate(sent.effective)}.
                  </p>
                )}
              </>
            ) : (
              <p className="mt-3 rounded-xl bg-cream p-3 text-ink-soft">
                {kind === "none" && ready
                  ? "The notice draft appears once the new rent is different from the current rent."
                  : "The notice draft appears once the numbers above are filled in and make sense."}
              </p>
            )}
          </Card>
        </div>
      </div>
    </StepShell>
  );
}
