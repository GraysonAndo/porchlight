"use client";

import { useState } from "react";
import Link from "next/link";
import { StepShell } from "@/components/StepShell";
import { Badge, Callout, Card, NumberField, PlaceholderNote } from "@/components/ui";
import { VERDICT_LABEL, VERDICT_TONE } from "@/components/verdict";
import { ai } from "@/lib/ai";
import { usd } from "@/lib/format";
import { useAsyncResult } from "@/lib/hooks";
import { verdictFor } from "@/lib/quote";
import { ACCESS_WINDOWS, PROPERTY, VENDORS, WATER_HEATER_JOB, type Vendor } from "@/lib/seed";
import { useDemo } from "@/lib/store";
import type { Approval } from "@/lib/types";

const JOB_TEXT = "Replace a leaking 40 gallon natural gas water heater.";

function defaultNotToExceed(vendor: Vendor): number {
  return Math.round(vendor.total * 1.1);
}

function Timeline({ approval, vendor }: { approval: Approval; vendor: Vendor }) {
  const items = [
    { title: "Vendor notified", detail: `${vendor.name} got the booking message.`, time: "Today, 9:02 AM (sample)" },
    { title: "Tenant notified", detail: `${PROPERTY.tenant} got the access window.`, time: "Today, 9:03 AM (sample)" },
    { title: "Visit scheduled", detail: approval.accessWindow, time: "Confirmed (sample)" },
  ];
  return (
    <ol className="space-y-0">
      {items.map((item, i) => (
        <li key={item.title} className="relative flex gap-4 pb-6 last:pb-0">
          {i < items.length - 1 && (
            <span aria-hidden="true" className="absolute left-[15px] top-8 h-full w-0.5 bg-good" />
          )}
          <span
            aria-hidden="true"
            className="z-10 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-good font-extrabold text-white"
          >
            ✓
          </span>
          <div>
            <p className="text-lg font-extrabold">{item.title}</p>
            <p>{item.detail}</p>
            <p className="text-sm text-ink-soft">{item.time}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

function ApproveBody() {
  const { state, actions } = useDemo();
  const approval = state.approval;

  const [vendorId, setVendorId] = useState<string | null>(null);
  const [nteEdit, setNteEdit] = useState<{ vendorId: string; value: number } | null>(null);
  const [accessWindow, setAccessWindow] = useState(ACCESS_WINDOWS[0]);

  const vendor = VENDORS.find((v) => v.id === vendorId) ?? null;
  const notToExceed = vendor ? (nteEdit?.vendorId === vendor.id ? nteEdit.value : defaultNotToExceed(vendor)) : 0;

  // Drafts regenerate whenever the choices change. Older results are ignored.
  const draftKey = vendor ? `${vendor.id}|${notToExceed}|${accessWindow}` : null;
  const drafts = useAsyncResult(draftKey, async () => {
    if (!vendor) return { vendorText: "", tenantText: "" };
    const [vendorText, tenantText] = await Promise.all([
      ai.draftVendorMessage({
        ownerName: PROPERTY.owner,
        vendorName: vendor.name,
        address: PROPERTY.address,
        jobDescription: JOB_TEXT,
        quoteTotal: vendor.total,
        notToExceed,
        accessWindow,
        licenseShown: vendor.license !== null,
      }),
      ai.draftTenantMessage({
        tenantName: PROPERTY.tenant,
        ownerName: PROPERTY.owner,
        vendorName: vendor.name,
        address: PROPERTY.address,
        accessWindow,
      }),
    ]);
    return { vendorText, tenantText };
  });

  function send() {
    if (!vendor) return;
    actions.approve({
      vendorId: vendor.id,
      notToExceed,
      accessWindow,
      sentAt: new Date().toISOString(),
    });
  }

  // After sending: show the confirmation instead of the form.
  if (approval) {
    const sentVendor = VENDORS.find((v) => v.id === approval.vendorId) ?? VENDORS[0];
    return (
      <StepShell step={9} nextLabel="Back to home" nextHref="/">
        <Callout tone="good" title="✓ Approved and sent" role="status">
          <p>
            You approved <strong>{sentVendor.name}</strong> with a limit of{" "}
            <strong>{usd(approval.notToExceed)}</strong>.
          </p>
        </Callout>

        <Card title="What happened next">
          <Timeline approval={approval} vendor={sentVendor} />
        </Card>

        <Callout tone="caution" title="Nothing was actually sent">
          <p>This is a prototype. No message went to any vendor or tenant. The times above are samples.</p>
        </Callout>

        <div>
          <button type="button" className="btn btn-secondary" onClick={() => actions.clearApproval()}>
            Start this step over
          </button>
        </div>
      </StepShell>
    );
  }

  return (
    <StepShell step={9} nextLabel="Back to home" nextHref="/">
      <fieldset>
        <legend className="mb-2 text-xl font-extrabold">1. Pick a vendor</legend>
        <div className="grid gap-3 md:grid-cols-3">
          {VENDORS.map((v) => {
            const selected = v.id === vendorId;
            const verdict = verdictFor(v.total, WATER_HEATER_JOB.marketTotal);
            return (
              <label
                key={v.id}
                className={`card relative flex cursor-pointer flex-col gap-2 has-[:focus-visible]:outline has-[:focus-visible]:outline-[3px] has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ink ${
                  selected ? "!border-ink ring-4 ring-glow" : "hover:border-ink"
                }`}
              >
                <input
                  type="radio"
                  name="vendor"
                  className="sr-only"
                  checked={selected}
                  onChange={() => setVendorId(v.id)}
                />
                <span className="flex items-start justify-between gap-2">
                  <span className="text-lg font-extrabold leading-snug">{v.name}</span>
                  {selected && <Badge tone="good">Selected</Badge>}
                </span>
                <span className="text-3xl font-extrabold">{usd(v.total)}</span>
                <span>
                  <Badge tone={VERDICT_TONE[verdict]}>{VERDICT_LABEL[verdict]}</Badge>
                </span>
                <span className="text-sm">
                  <strong>License:</strong> {v.license ?? "Not shown"}
                </span>
                {v.warning && (
                  <span className="rounded-lg bg-caution-tint p-2 text-sm font-bold text-caution-ink">
                    ! {v.warning}
                  </span>
                )}
                {v.itemized && <span className="text-sm text-ink-soft">Itemized quote checked on screen 5.</span>}
                <span className="mt-1 font-bold underline underline-offset-4">
                  {selected ? "Chosen" : "Choose this vendor"}
                </span>
              </label>
            );
          })}
        </div>
        <p className="mt-2">
          <PlaceholderNote /> <span className="text-sm text-ink-soft">(vendor names and prices are fictional)</span>
        </p>
      </fieldset>

      <Card title="2. Set your limits">
        {vendor ? (
          <div className="grid gap-5 md:grid-cols-2">
            <NumberField
              id="nte"
              label="Not-to-exceed amount"
              prefix="$"
              step={10}
              min={0}
              value={notToExceed}
              onChange={(v) => setNteEdit({ vendorId: vendor.id, value: v })}
              hint={`Starts at 10% above the quote (${usd(vendor.total)}). The vendor must call you before going over.`}
            />
            <div>
              <label htmlFor="window" className="label">
                When can the tenant give access?
              </label>
              <select
                id="window"
                className="field"
                value={accessWindow}
                onChange={(e) => setAccessWindow(e.target.value)}
              >
                {ACCESS_WINDOWS.map((w) => (
                  <option key={w}>{w}</option>
                ))}
              </select>
              <p className="hint">We will tell the tenant this window.</p>
            </div>
          </div>
        ) : (
          <p className="text-ink-soft">Pick a vendor above to set a limit and a time.</p>
        )}
      </Card>

      <Card title="3. Check the messages">
        {!vendor ? (
          <p className="text-ink-soft">The drafted messages will show up here.</p>
        ) : drafts.loading || !drafts.data ? (
          <div role="status" aria-live="polite" className="flex items-center gap-4">
            <span className="flex items-center gap-1.5" aria-hidden="true">
              <span className="think-dot" />
              <span className="think-dot" />
              <span className="think-dot" />
            </span>
            <p className="font-bold">Drafting your messages...</p>
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <h3 className="mb-1 font-extrabold">To the vendor: {vendor.name}</h3>
              <pre className="whitespace-pre-wrap rounded-xl border border-line bg-cream p-4 text-sm leading-relaxed">
                {drafts.data.vendorText}
              </pre>
            </div>
            <div>
              <h3 className="mb-1 font-extrabold">To the tenant: {PROPERTY.tenant}</h3>
              <pre className="whitespace-pre-wrap rounded-xl border border-line bg-cream p-4 text-sm leading-relaxed">
                {drafts.data.tenantText}
              </pre>
            </div>
          </div>
        )}
      </Card>

      <div className="space-y-2">
        <button
          type="button"
          className="btn btn-primary btn-lg w-full"
          disabled={!vendor || drafts.loading}
          onClick={send}
        >
          Approve and send
        </button>
        <p className="text-center text-sm text-ink-soft">
          Prototype: pressing this does not send anything.{" "}
          <Link href="/quote" className="font-bold underline underline-offset-4">
            Review the quote check
          </Link>
        </p>
      </div>
    </StepShell>
  );
}

export default function ApprovePage() {
  const { hydrated } = useDemo();

  if (!hydrated) {
    return (
      <StepShell step={9} nextLabel="Back to home" nextHref="/">
        <p className="text-ink-soft">Loading...</p>
      </StepShell>
    );
  }
  return <ApproveBody />;
}
