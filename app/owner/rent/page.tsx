"use client";

import Link from "next/link";
import { PlainCodeNote } from "@/components/Agent";
import { useState } from "react";
import { StepShell } from "@/components/StepShell";
import { Badge, Callout, Card, NumberField, PlaceholderNote } from "@/components/ui";
import { addDays, longDate, pct, usd, usdCents } from "@/lib/format";
import { useToday } from "@/lib/hooks";
import { LEASE_ANNIVERSARY, LEASE_ANNIVERSARY_ISO } from "@/lib/houseQa";
import { BASE_CAP_PERCENT, MAX_CAP_PERCENT, buildExemptionNotice, MAX_SANE_RENT, buildNotice, calculateRent, maxNewRentFor, noticeKindFor, rentLooksTooHigh, roundToCents, startDateFor } from "@/lib/rent";
import { PROPERTY } from "@/lib/seed";

const STATUTE_URL = "https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=CIV&sectionNum=1947.12";
import { daysUntil, dueStatus } from "@/lib/payments";
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

const VERDICT_STYLES = {
  good: "border-good bg-good-tint text-good-ink",
  caution: "border-glow-deep bg-caution-tint text-caution-ink",
  urgent: "border-urgent bg-urgent-tint text-urgent",
  neutral: "border-line bg-white text-ink",
} as const;

/** A one-event calendar file: a reminder on the last day to send the notice, with an alert the day before. */
function reminderIcs(sendBy: string, startIso: string): string {
  const day = sendBy.replace(/-/g, "");
  const next = addDays(sendBy, 1).replace(/-/g, "");
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//GoHome//Rent notice reminder//EN",
    "BEGIN:VEVENT",
    `UID:rent-notice-${day}@gohome.example`,
    `DTSTAMP:${day}T090000Z`,
    `DTSTART;VALUE=DATE:${day}`,
    `DTEND;VALUE=DATE:${next}`,
    `SUMMARY:Last day to send the rent notice (new rent starts ${startIso})`,
    "BEGIN:VALARM",
    "ACTION:DISPLAY",
    "DESCRIPTION:Send the rent notice tomorrow",
    "TRIGGER:-P1D",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
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
  const [empty, setEmpty] = useState({ current: false, cpi: false, proposed: false, increases: false, prior: false });
  const markEmpty = (key: "current" | "cpi" | "proposed" | "increases" | "prior") => (isEmpty: boolean) =>
    setEmpty((e) => (e[key] === isEmpty ? e : { ...e, [key]: isEmpty }));
  const missing = [
    empty.current || form.currentRent <= 0 ? "the current rent" : null,
    empty.proposed || form.proposedRent <= 0 ? "the proposed new rent" : null,
    empty.cpi ? "the local inflation number" : null,
    empty.increases ? "the number of increases already given" : null,
    empty.prior && form.increasesInLast12Months > 0 ? "how much the earlier increase was" : null,
  ].filter((m): m is string => m !== null);
  const cpiOdd = !empty.cpi && (form.cpiPercent < 0 || form.cpiPercent > 10);
  // One home renting for more than this is almost surely a typing mistake, so no result is made from it.
  const rentOdd = rentLooksTooHigh(form.currentRent) || rentLooksTooHigh(form.proposedRent);
  const [startOverride, setStartOverride] = useState<string | null>(null);
  const [service, setService] = useState("first-class mail");
  const [showExemption, setShowExemption] = useState(false);

  const result = calculateRent({
    currentRent: form.currentRent,
    cpiPercent: form.cpiPercent,
    proposedRent: form.proposedRent,
    tenancy12Plus: form.tenancy12Plus,
    increasesInLast12Months: form.increasesInLast12Months,
    priorIncreasePercent: form.increasesInLast12Months > 0 ? form.priorIncreasePercent : 0,
    singleFamilyOrCondo: form.singleFamilyOrCondo,
    notCorporateOwned: form.notCorporateOwned,
    exemptionNoticeGiven: form.exemptionNoticeGiven,
    leaseHasExemptionWording: form.leaseExemptionWording,
    buildingUnder15Years: form.buildingUnder15Years,
  });

  const kind = noticeKindFor(form.currentRent, form.proposedRent);
  // The start date the owner wants, and the last day to send the notice for it to start then.
  const startDate = startOverride ?? LEASE_ANNIVERSARY_ISO;
  const noticeLead = kind === "increase" ? result.noticeDays : 0;
  const sendBy = addDays(startDate, -noticeLead);
  // Judged against the date the owner entered for sending, not against today.
  const tooLate = Boolean(sendBy) && Boolean(noticeDate) && sendBy < noticeDate;
  const startIso = startDateFor(kind, noticeDate, result.noticeDays, startDate);
  const effective = longDate(startIso);
  // An increase that is more than the rules allow, or a third one in a year, is never sent.
  const blockedByCount = kind === "increase" && result.tooManyIncreases && !result.mayBeExempt;
  const notice = buildNotice({
    ownerName: PROPERTY.owner,
    tenantName: PROPERTY.tenant,
    address: PROPERTY.address,
    currentRent: form.currentRent,
    newRent: form.proposedRent,
    noticeDate,
    noticeDays: result.noticeDays,
    startDate,
    serviceMethod: service,
    ownerAddress: PROPERTY.ownerAddress,
    basis: result.mayBeExempt
      ? `This property may be exempt from the yearly limit in Civil Code section 1947.12: ${result.exemptionReason ?? ""}`
      : `This increase is within the yearly limit in Civil Code section 1947.12 (5% plus local inflation, never more than ${MAX_CAP_PERCENT}%).`,
  });
  const ready = missing.length === 0 && !rentOdd && !cpiOdd && Boolean(noticeDate);
  // No dollar maximum is final until the owner has checked the inflation figure for their own area.
  const capKnown = form.cpiConfirmed;
  const lateRent = !state.rentPaidAt && !state.payments.some((pay) => pay.kind === "rent") && dueStatus("rent").overdue;
  const canSend = ready && kind !== "none" && !blockedByCount && (kind === "decrease" || (capKnown && (result.withinCap || result.mayBeExempt)));
  // Two ways to pick a number: the most the law allows, or a modest raise. Only shown when the inputs make sense.
  const maxLegal = maxNewRentFor(form.currentRent, result.capPercent, form.increasesInLast12Months > 0 ? form.priorIncreasePercent : 0);
  const modest = Math.min(Math.round(form.currentRent * 1.05), Math.floor(maxLegal));
  // The suggestion waits for a confirmed inflation figure, and for late rent to be settled.
  const showSuggestion = ready && capKnown && !lateRent && !rentOdd && !blockedByCount && maxLegal > form.currentRent;
  const sameAsMax = Math.abs(modest - maxLegal) < 0.005;
  const yearly = (rent: number) => usd(Math.round((rent - form.currentRent) * 12));
  const sent = state.rentNotice;
  // The notice that went out no longer matches what is on screen once the numbers or the date change.
  const verdict: { tone: keyof typeof VERDICT_STYLES; title: string; detail?: string } = !ready
    ? { tone: "neutral", title: "Fill in the numbers to see if you can send a notice" }
    : kind === "none"
      ? { tone: "neutral", title: "No change: the new rent is the same as the current rent" }
      : blockedByCount
        ? { tone: "urgent", title: "Do not send: a third increase in 12 months is not allowed", detail: `You said you already gave ${form.increasesInLast12Months}.` }
        : kind !== "decrease" && !capKnown
          ? { tone: "caution", title: "Confirm your area's inflation figure first", detail: "The highest allowed rent depends on it, and the number shown now is only a sample." }
          : result.mayBeExempt
          ? { tone: "caution", title: "May be exempt from the yearly limit", detail: "Confirm with an attorney before you send." }
          : kind === "decrease"
            ? { tone: "good", title: "OK to send: this lowers the rent" }
            : result.withinCap
              ? { tone: "good", title: "OK to send: within the yearly limit", detail: `${usdCents(form.proposedRent)} is at or below ${usdCents(result.maxNewRent)}.` }
              : { tone: "urgent", title: `Do not send: over the limit by ${usdCents(result.overCapBy)}`, detail: `Lower the new rent to ${usdCents(result.maxNewRent)} or less.` };
  const sentIsStale = Boolean(sent) && (sent!.to !== form.proposedRent || sent!.from !== form.currentRent || sent!.effective !== startIso || sent!.kind !== kind);

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
      <Row label="Yearly limit">
        {capKnown ? pct(result.capPercent) : "Depends on your inflation figure"}
        <span className="block text-sm font-normal text-ink-soft">
          {pct(BASE_CAP_PERCENT)} plus local inflation{capKnown ? ` of ${pct(form.cpiPercent)}` : ""}, never more than {pct(MAX_CAP_PERCENT)}
        </span>
      </Row>
      <Row label="Highest allowed new rent">
        {capKnown ? usdCents(result.maxNewRent) : "Confirm the inflation figure first"}
        {form.increasesInLast12Months > 0 && form.priorIncreasePercent > 0 && (
          <span className="block text-sm font-normal text-ink-soft">Lower because of the earlier increase of {pct(form.priorIncreasePercent)}.</span>
        )}
      </Row>
      <Row label="Your proposed rent">
        {usdCents(result.proposedRent)}
        <span className="block text-sm font-normal text-ink-soft">
          {result.increaseAmount >= 0 ? "+" : "-"}
          {usdCents(Math.abs(result.increaseAmount))} ({pct(result.increasePercent)})
        </span>
      </Row>
      <Row label="Notice period">
        {kind === "increase" ? `${result.noticeDays} days` : "None needed"}
        <span className="block text-sm font-normal text-ink-soft">
          {kind === "increase"
            ? result.noticeDays === 30
              ? "The increase is 10% or less."
              : "The increase is more than 10%."
            : "A lower rent can start on any day you choose."}
        </span>
      </Row>
    </dl>
  );

  return (
    <StepShell stepId="tools-rent">
      <p className="rounded-2xl bg-glow-tint px-4 py-3 font-bold">
        California only, for now. California limits how much rent can go up in a year. This follows that law (California&apos;s rent-cap law, called AB 1482,{" "}
        <a href={STATUTE_URL} className="underline underline-offset-4" target="_blank" rel="noreferrer">
          Civil Code 1947.12
        </a>
        ).
      </p>
      <Card title="From your lease">
        <dl className="grid gap-x-6 gap-y-1 text-sm sm:grid-cols-3">
          <div>
            <dt className="font-bold text-ink-soft">Rent on your lease</dt>
            <dd className="text-lg font-extrabold">{usdCents(PROPERTY.rent)} a month</dd>
          </div>
          <div>
            <dt className="font-bold text-ink-soft">Last increase</dt>
            <dd className="text-lg font-extrabold">December 2024</dd>
          </div>
          <div>
            <dt className="font-bold text-ink-soft">Next lease anniversary</dt>
            <dd className="text-lg font-extrabold">{LEASE_ANNIVERSARY}</dd>
          </div>
        </dl>
        {form.currentRent !== PROPERTY.rent && (
          <p className="mt-2 text-sm text-ink-soft">
            You changed the current rent below to {usdCents(form.currentRent)}.{" "}
            <button type="button" className="font-bold text-brand underline underline-offset-4" onClick={() => actions.setRent({ currentRent: PROPERTY.rent })}>
              Put back {usdCents(PROPERTY.rent)} from the lease
            </button>
          </p>
        )}
        {!state.rentPaidAt && !state.payments.some((p) => p.kind === "rent") && dueStatus("rent").overdue && (
          <p className="mt-3 rounded-xl border-l-8 border-glow-deep bg-caution-tint p-3 font-bold text-caution-ink">
            Heads up: {PROPERTY.tenant}&apos;s October rent is {dueStatus("rent").text.replace(/\. It was due.*/, "")}. A rent increase does not change what is owed now, so you may want to settle that first.{" "}
            <Link href="/owner" className="underline underline-offset-4">
              See it in the Inbox
            </Link>
          </p>
        )}
        {showSuggestion ? (
          <div className="mt-3 space-y-2 rounded-xl bg-good-tint p-3">
            <p className="font-bold text-good-ink">
              {sameAsMax
                ? `The most the law allows right now is ${usdCents(maxLegal)} (${pct(((maxLegal - form.currentRent) / form.currentRent) * 100, 1)} more).`
                : `GoHome recommends the modest raise: it is the usual 5% and well inside the limit. The most the law allows is also here.`}
            </p>
            <div className="flex flex-col gap-2 sm:flex-row">
              {!sameAsMax && (
                <button type="button" className="btn btn-primary" onClick={() => actions.setRent({ proposedRent: modest })}>
                  Recommended: {usdCents(modest)} ({pct(((modest - form.currentRent) / form.currentRent) * 100, 1)}), {yearly(modest)} more a year
                </button>
              )}
              <button type="button" className={`btn ${sameAsMax ? "btn-primary" : "btn-secondary"}`} onClick={() => actions.setRent({ proposedRent: maxLegal })}>
                Max legal: {usdCents(maxLegal)} ({pct(((maxLegal - form.currentRent) / form.currentRent) * 100, 1)}), {yearly(maxLegal)} more a year
              </button>
            </div>
          </div>
        ) : (
          ready && blockedByCount && <p className="mt-3 rounded-xl bg-urgent-tint p-3 font-bold text-urgent">No suggestion: a third increase in 12 months is not allowed.</p>
        )}
      </Card>
      <PlainCodeNote>
        The legal cap is worked out with exact math from the numbers you enter. The AI never decides what is legal. It
        only helps word the notice.
      </PlainCodeNote>
      <div role="status" aria-live="polite" className={`sticky top-16 z-10 rounded-2xl border-2 px-4 py-3 shadow-sm ${VERDICT_STYLES[verdict.tone]}`}>
        <p className="text-xl font-extrabold">{verdict.title}</p>
        {verdict.detail && <p className="text-sm font-bold">{verdict.detail}</p>}
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <Card title="Your numbers">
          <p className="hint mb-3">Every number here is needed. The check boxes are optional.</p>
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
              label="Local inflation rate (CPI), percent"
              suffix="%"
              step="any"
              value={form.cpiPercent}
              onChange={(v) => actions.setRent({ cpiPercent: roundToCents(v) })}
              onEmptyChange={markEmpty("cpi")}
              invalid={empty.cpi || cpiOdd}
              hint={
                <>
                  This is a sample number, not a live lookup. <PlaceholderNote /> Use your area&apos;s real figure from the{" "}
                  <a href="https://www.bls.gov/cpi/" className="underline underline-offset-4" target="_blank" rel="noreferrer">
                    U.S. Bureau of Labor Statistics
                  </a>
                  .
                  {cpiOdd && (
                    <span role="alert" className="mt-1 block font-bold text-caution-ink">
                      Check this number. A yearly inflation change is usually between 0% and 10%.
                    </span>
                  )}
                </>
              }
            />
            <Check id="cpi-confirmed" checked={form.cpiConfirmed} onChange={(v) => actions.setRent({ cpiConfirmed: v })}>
              I checked this inflation figure for my area. Until I do, GoHome will not show a dollar maximum as final.
            </Check>
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
              label="Rent increases already given in the last 12 months"
              step={1}
              min={0}
              value={form.increasesInLast12Months}
              onChange={(v) => actions.setRent({ increasesInLast12Months: v })}
              onEmptyChange={markEmpty("increases")}
              validate={(v) => (v < 0 ? "Enter 0 or more." : !Number.isInteger(v) ? "Enter a whole number, like 0, 1 or 2." : null)}
              hint="The last increase on your lease was in December 2024, about 22 months ago, so this starts at 0."
            />
            {form.increasesInLast12Months > 0 && (
              <NumberField
                id="prior-increase"
                label="How much did the rent go up in total, in percent?"
                suffix="%"
                step="any"
                min={0}
                value={form.priorIncreasePercent}
                onChange={(v) => actions.setRent({ priorIncreasePercent: roundToCents(v) })}
                onEmptyChange={markEmpty("prior")}
                validate={(v) => (v < 0 ? "Enter 0 or more." : v > 100 ? "That is more than 100%. Check the number." : null)}
                hint="The yearly limit counts any increase in the last 12 months, so this lowers the room you have left."
              />
            )}

            <fieldset>
              <legend className="label">Exemption checks</legend>
              <p className="hint mb-1">
                Some homes are exempt from the yearly limit: a single family home or condo that is not owned by a large
                investment company or a corporation, when the tenant was given the written exemption notice, or a building
                under 15 years old. Check each box that is true for this property.
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
                It is not owned by a big investment company (a real estate investment trust, or REIT), a corporation, or an LLC with a corporate member.
              </Check>
              <Check
                id="ex-notice"
                checked={form.exemptionNoticeGiven}
                onChange={(v) => actions.setRent({ exemptionNoticeGiven: v })}
              >
                The tenant was given the required written exemption notice.
              </Check>
              <Check
                id="ex-lease"
                checked={form.leaseExemptionWording}
                onChange={(v) => actions.setRent({ leaseExemptionWording: v })}
              >
                The lease itself has the exemption wording.
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
                <Callout tone="caution" title="Why it may be exempt">
                  <p>{result.exemptionReason}</p>
                </Callout>
                <details className="rounded-xl bg-cream px-4">
                  <summary className="flex min-h-11 cursor-pointer items-center font-bold">
                    Show the yearly limit calculation anyway
                  </summary>
                  <div className="pb-3">{capBlock}</div>
                </details>
              </div>
            ) : (
              <div className="mt-3">
                {capBlock}
              </div>
            )}

            {form.singleFamilyOrCondo && form.notCorporateOwned && !(form.exemptionNoticeGiven && form.leaseExemptionWording) && !form.buildingUnder15Years && (
              <div className="mt-4">
                <Callout tone="info" title="You could be exempt from the yearly limit">
                  <p>
                    This home is a single family home with an individual owner. The exemption needs two things: the written exemption notice given to
                    your tenant, and the exemption wording in the lease itself. {form.exemptionNoticeGiven ? "You have the notice. Check the lease wording." : form.leaseExemptionWording ? "You have the lease wording. Check the notice." : "Check both."} For a tenancy that began after July
                    1, 2020 the law asks for the notice to be in the lease itself, so look at your lease first. Confirm with an attorney.
                  </p>
                  <button type="button" className="btn btn-secondary mt-3" aria-expanded={showExemption} onClick={() => setShowExemption((s) => !s)}>
                    {showExemption ? "Hide the draft" : "Draft the exemption notice"}
                  </button>
                </Callout>
                {showExemption && (
                  <pre className="mt-3 max-h-80 overflow-auto whitespace-pre-wrap rounded-xl border border-line bg-cream p-4 font-mono text-sm leading-relaxed" tabIndex={0}>
                    {buildExemptionNotice({ ownerName: PROPERTY.owner, tenantName: PROPERTY.tenant, address: PROPERTY.address, date: noticeDate })}
                  </pre>
                )}
              </div>
            )}

            <div className="mt-4 space-y-3">
              {result.tooManyIncreases ? (
                <Callout tone="urgent" title="▲ Too many increases">
                  <p>No more than two increases are allowed in 12 months, and you already gave {form.increasesInLast12Months}. Wait until the earliest one is more than 12 months old.</p>
                </Callout>
              ) : (
                <p className="text-sm text-ink-soft">
                  No more than two increases are allowed in 12 months.
                  {form.increasesInLast12Months === 1 &&
                    " The yearly limit is measured over any 12 months, so the earlier increase counts toward it."}
                </p>
              )}
              <p className="text-sm text-ink-soft">
                The yearly limit applies no matter how long the tenant has lived there, so GoHome does not ask. Other
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
                    <p className="hint">This date goes in the letter.</p>
                  </div>
                  <div>
                    <label htmlFor="notice-date" className="label">
                      Date you plan to send the notice
                    </label>
                    <input id="notice-date" type="date" className="field" value={noticeDate} onChange={(e) => setDateOverride(e.target.value)} />
                    <p className="hint">
                      {kind === "increase" ? `With a ${result.noticeDays}-day notice, the earliest the new rent can start is ${longDate(startDateFor(kind, noticeDate, result.noticeDays))}.` : `The lower rent can start as soon as ${longDate(noticeDate)}.`}
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

                {kind === "increase" && !tooLate && (
                  <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                    <strong>
                      {daysUntil(sendBy) > 0 ? `${daysUntil(sendBy)} days left to send` : daysUntil(sendBy) === 0 ? "Last day to send is today" : ""}
                    </strong>
                    <a
                      className="inline-flex min-h-11 items-center font-bold text-brand underline underline-offset-4"
                      href={`data:text/calendar;charset=utf-8,${encodeURIComponent(reminderIcs(sendBy, startIso))}`}
                      download="send-rent-notice.ics"
                    >
                      Add a reminder to my calendar
                    </a>
                  </p>
                )}

                <div className="mt-3">
                  <label htmlFor="service" className="label">
                    How will you deliver it?
                  </label>
                  <select id="service" className="field" value={service} onChange={(e) => setService(e.target.value)}>
                    <option value="first-class mail">First-class mail</option>
                    <option value="personal delivery to the tenant">Hand it to the tenant</option>
                    <option value="posting on the door and mailing a copy">Post on the door and mail a copy</option>
                  </select>
                  <p className="hint">The letter says how it was delivered. A rent notice has to be properly served, so keep proof.</p>
                </div>

                <section aria-labelledby="notice-heading" className="mt-3">
                  <pre className="max-h-96 overflow-auto whitespace-pre-wrap rounded-xl border border-line bg-cream p-4 font-mono text-sm leading-relaxed" tabIndex={0}>
                    {notice}
                  </pre>
                </section>

                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    className="btn btn-primary"
                    disabled={!canSend || (Boolean(sent) && !sentIsStale)}
                    onClick={() => actions.sendRentNotice({ kind: kind === "decrease" ? "decrease" : "increase", from: form.currentRent, to: form.proposedRent, effective: startIso })}
                  >
                    {sent && !sentIsStale ? "Notice sent" : sent ? "Send updated notice" : `Send notice to ${PROPERTY.tenant}`}
                  </button>
                  <button type="button" className="btn btn-secondary" onClick={copy}>
                    Copy notice
                  </button>
                  <span role="status" aria-live="polite" className="font-bold">
                    {copied === "yes" && "✓ Copied to your clipboard"}
                    {copied === "no" && "Could not copy. Select the text above and copy it by hand."}
                  </span>
                </div>
                {!canSend && !sent && (
                  <p className="hint">
                    {blockedByCount ? "You cannot send a third increase within 12 months." : "You can send the notice once the new rent is within the yearly limit (or the home may be exempt)."}
                  </p>
                )}
                {sent && sentIsStale && (
                  <p role="status" className="mt-3 rounded-xl bg-caution-tint p-3 font-bold text-caution-ink">
                    The notice you sent on {longDate(sent.sentAt.slice(0, 10))} said {usdCents(sent.to)} starting {longDate(sent.effective)}. The numbers on this page are different now. Send an updated notice to replace it.
                  </p>
                )}
                {sent && !sentIsStale && (
                  <p role="status" className="mt-3 rounded-xl bg-good-tint p-3 font-bold text-good-ink">
                    Sent on {longDate(sent.sentAt.slice(0, 10))}. {PROPERTY.tenant} was told by text, and the notice goes by mail (sample: nothing was really mailed). New rent {usdCents(sent.to)} starts {longDate(sent.effective)}.
                  </p>
                )}
                {state.rentNoticeLog.length > 0 && (
                  <div className="mt-4">
                    <h3 className="font-extrabold">Notices you have sent</h3>
                    <ul className="mt-1 divide-y divide-line text-sm">
                      {[...state.rentNoticeLog].reverse().map((n) => (
                        <li key={n.sentAt} className="py-1.5">
                          {longDate(n.sentAt.slice(0, 10))}: {n.kind === "decrease" ? "decrease" : "increase"} from {usdCents(n.from)} to {usdCents(n.to)}, starting {longDate(n.effective)}.
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            ) : (
              <p className="mt-3 rounded-xl bg-cream p-3 text-ink-soft">
                {kind === "none" && ready
                  ? "The notice draft appears once the new rent is different from the current rent."
                  : "The notice draft appears once every number above is filled in correctly."}
              </p>
            )}
          </Card>
        </div>
      </div>
    </StepShell>
  );
}
