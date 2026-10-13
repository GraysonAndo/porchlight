"use client";

import { useState } from "react";
import { StepShell } from "@/components/StepShell";
import { Badge, Callout, Card, NumberField, PlaceholderNote } from "@/components/ui";
import { longDate, pct, usdCents } from "@/lib/format";
import { useToday } from "@/lib/hooks";
import { buildNotice, calculateRent, effectiveDateFor } from "@/lib/rent";
import { PROPERTY } from "@/lib/seed";
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
          5% plus local CPI of {pct(form.cpiPercent)}, never more than 10%
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
    <StepShell step={8}>
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
              onChange={(v) => actions.setRent({ currentRent: v })}
            />
            <NumberField
              id="cpi"
              label="Local CPI change (percent)"
              suffix="%"
              step="any"
              value={form.cpiPercent}
              onChange={(v) => actions.setRent({ cpiPercent: v })}
              hint={
                <>
                  <PlaceholderNote /> Look up the current figure for your area before using.
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
              onChange={(v) => actions.setRent({ proposedRent: v })}
            />

            <fieldset>
              <legend className="label">Has the tenant lived there 12 months or more?</legend>
              <div className="flex gap-3">
                {[
                  { v: true, text: "Yes" },
                  { v: false, text: "No" },
                ].map((o) => (
                  <label
                    key={o.text}
                    className={`flex min-h-11 flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border-2 px-4 font-bold has-[:focus-visible]:outline has-[:focus-visible]:outline-[3px] has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ink ${
                      form.tenancy12Plus === o.v ? "border-ink bg-glow" : "border-line bg-white"
                    }`}
                  >
                    <input
                      type="radio"
                      name="tenancy"
                      className="sr-only"
                      checked={form.tenancy12Plus === o.v}
                      onChange={() => actions.setRent({ tenancy12Plus: o.v })}
                    />
                    {o.text}
                  </label>
                ))}
              </div>
            </fieldset>

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
              <p className="hint mb-1">Tick each one that is true for this property.</p>
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
                It is not owned by a REIT, a corporation, or an LLC with a corporate member.
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

            {result.mayBeExempt ? (
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
                  <Callout tone="good" title="✓ OK: within the state cap" role="status">
                    <p>The proposed rent is at or below the highest allowed new rent.</p>
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
              {!form.tenancy12Plus && (
                <p className="text-sm text-ink-soft">
                  The state rent cap generally applies no matter how long the tenant has lived there. Other
                  protections, like just cause rules, start after 12 months. Confirm with an attorney.
                </p>
              )}
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
              <h2 className="text-xl font-extrabold">Notice draft</h2>
              <Badge tone="info">Draft, not legal advice</Badge>
            </div>

            <div className="mt-3">
              <label htmlFor="notice-date" className="label">
                Date you plan to send the notice
              </label>
              <input
                id="notice-date"
                type="date"
                className="field"
                value={noticeDate}
                onChange={(e) => setDateOverride(e.target.value)}
              />
              <p className="hint">
                {effective
                  ? `With a ${result.noticeDays} day notice, the new rent would start ${effective}.`
                  : "Pick a date to see when the new rent would start."}
              </p>
            </div>

            {!result.mayBeExempt && !result.withinCap && (
              <div className="mt-3">
                <Callout tone="urgent" title="This draft is above the cap">
                  <p>Lower the proposed rent first, or this notice could cause trouble.</p>
                </Callout>
              </div>
            )}

            <pre
              className="mt-3 max-h-96 overflow-auto whitespace-pre-wrap rounded-xl border border-line bg-cream p-4 font-mono text-sm leading-relaxed"
              aria-label="Rent increase notice draft"
              tabIndex={0}
            >
              {notice}
            </pre>

            <div className="mt-3 flex flex-wrap items-center gap-3">
              <button type="button" className="btn btn-secondary" onClick={copy}>
                Copy notice
              </button>
              <span role="status" aria-live="polite" className="font-bold">
                {copied === "yes" && "✓ Copied to your clipboard"}
                {copied === "no" && "Could not copy. Select the text above and copy it by hand."}
              </span>
            </div>
          </Card>
        </div>
      </div>
    </StepShell>
  );
}
