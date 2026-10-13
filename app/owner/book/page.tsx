"use client";

import { useState } from "react";
import Link from "next/link";
import { AgentFeed, EngineChip, PlainCodeNote } from "@/components/Agent";
import { StepShell } from "@/components/StepShell";
import { JobStatusTracker } from "@/components/JobStatusTracker";
import { CheckIcon, HammerIcon, TapIcon } from "@/components/icons";
import { Badge, Callout, Card, NumberField, PlaceholderNote } from "@/components/ui";
import { VERDICT_LABEL, VERDICT_TONE } from "@/components/verdict";
import { ai } from "@/lib/ai";
import { usd } from "@/lib/format";
import { useAsyncResult } from "@/lib/hooks";
import { bookingEvents } from "@/lib/agentLog";
import { PLAN } from "@/lib/plan";
import { verdictFor } from "@/lib/quote";
import { ACCESS_WINDOWS, PROPERTY, VENDORS, WATER_HEATER_JOB, type Vendor } from "@/lib/seed";
import { useDemo } from "@/lib/store";
import { useJobStatus } from "@/lib/useJobStatus";
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
  const status = useJobStatus();

  const [vendorId, setVendorId] = useState<string | null>(null);
  const [nteEdit, setNteEdit] = useState<{ vendorId: string; value: number } | null>(null);
  const [accessWindow, setAccessWindow] = useState(ACCESS_WINDOWS[0]);
  // The drafted messages can be edited before sending. Edits are kept per draft.
  const [vendorEdit, setVendorEdit] = useState<{ base: string; text: string } | null>(null);
  const [tenantEdit, setTenantEdit] = useState<{ base: string; text: string } | null>(null);

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
      <StepShell stepId="owner-book">
        <Card title="Where this job stands">
          <JobStatusTracker status={status} />
          <p className="mt-2 text-sm text-ink-soft">
            It moves on its own. After the visit, tap Mark job done.
          </p>
        </Card>

        <Callout tone="good" title="✓ Approved and sent" role="status">
          <p>
            You approved <strong>{sentVendor.name}</strong> with a limit of{" "}
            <strong>{usd(approval.notToExceed)}</strong>.
          </p>
        </Callout>

        <Card title="What happened next">
          <Timeline approval={approval} vendor={sentVendor} />
        </Card>

        <Card title="What Porchlight did after your tap">
          <AgentFeed events={bookingEvents(approval)} />
        </Card>

        <Callout tone="caution" title="Nothing was actually sent">
          <p>This is a prototype. No message went to any vendor or tenant. The times above are samples.</p>
        </Callout>

        <Card title="What the tenant sees">
          <p>
            {PROPERTY.tenant} gets the booking, the plumber&apos;s name, and the time on their status page, and is asked to
            confirm the time.
          </p>
          <Link href="/tenant/status" className="btn btn-secondary mt-3">
            See the tenant&apos;s status page
          </Link>
        </Card>

        <Card
          title={
            <span className="flex items-center gap-2">
              <HammerIcon /> After the visit
            </span>
          }
        >
          {state.jobCompletedAt ? (
            <Callout tone="good" title="✓ House record updated automatically" role="status">
              <p>
                The installer finished the job. The new water heater (Hearthline HL-40G-NG, serial 26J0007-A, 40 gallons,
                natural gas) was added to your house record with its install date. The old heater was marked replaced and
                the 5-year forecast was updated. Nobody typed or photographed anything.
              </p>
              <p className="mt-2">
                <Link href="/owner/record" className="font-bold underline underline-offset-4">
                  Open the house record
                </Link>
              </p>
            </Callout>
          ) : (
            <>
              <ol className="space-y-2">
                <li>1. The plumber installs the new water heater and marks the job done in Porchlight.</li>
                <li>
                  2. The installer&apos;s details (brand, model, serial number, size, fuel type, install date) go into your
                  house record <strong>automatically</strong>. No photos, no typing.
                </li>
                <li>3. The old heater is marked replaced, and the 5-year forecast resets.</li>
              </ol>
              <button type="button" className="btn btn-secondary mt-3" onClick={() => actions.completeJob()}>
                Mark job done
              </button>
              <p className="hint">Tap this after the visit. The new equipment goes into the record on its own (simulated).</p>
            </>
          )}
        </Card>

        <div>
          <button type="button" className="btn btn-secondary" onClick={() => actions.clearApproval()}>
            Start this step over
          </button>
        </div>
      </StepShell>
    );
  }

  function approvePlan() {
    actions.approve({
      vendorId: PLAN.vendorId,
      notToExceed: PLAN.notToExceed,
      accessWindow: ACCESS_WINDOWS[0],
      sentAt: new Date().toISOString(),
    });
  }

  return (
    <StepShell stepId="owner-book">
      <div className="hero-ink">
        <p className="eyebrow !text-cream/70">Porchlight&apos;s plan, ready for one tap</p>
        <p className="mt-2 text-3xl font-extrabold leading-tight sm:text-5xl">
          Book <span className="text-glow">{PLAN.vendorName}</span>
        </p>
        <dl className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl bg-white/10 p-3">
            <dt className="text-sm text-cream/75">Quote</dt>
            <dd className="text-2xl font-extrabold">{usd(PLAN.total)}</dd>
          </div>
          <div className="rounded-2xl bg-white/10 p-3">
            <dt className="text-sm text-cream/75">Spending limit</dt>
            <dd className="text-2xl font-extrabold">{usd(PLAN.notToExceed)}</dd>
          </div>
          <div className="rounded-2xl bg-white/10 p-3">
            <dt className="text-sm text-cream/75">Saves you</dt>
            <dd className="text-2xl font-extrabold text-glow">{usd(PLAN.savedVsHighest)}</dd>
          </div>
        </dl>
        <p className="mt-3 text-cream/85">
          Visit: {ACCESS_WINDOWS[0]}. The vendor must call you before going over the limit.
        </p>
        <ul className="mt-3 space-y-1 text-cream/90">
          {PLAN.reasons.slice(0, 2).map((r) => (
            <li key={r} className="flex items-start gap-2">
              <span className="mt-1 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-glow text-ink">
                <CheckIcon size={12} />
              </span>
              <span>{r}</span>
            </li>
          ))}
        </ul>
        <button type="button" className="btn btn-lg mt-5 w-full bg-glow font-extrabold text-ink hover:bg-glow-deep sm:w-auto" onClick={approvePlan}>
          <TapIcon size={22} /> Approve Porchlight&apos;s plan
        </button>
        <p className="mt-2 text-sm text-cream/75">
          This is the one tap Porchlight waits for. Nothing is booked or spent before it. <EngineChip engine="human" />
        </p>
      </div>

      <PlainCodeNote>
        The vendor pick, the price check, and the spending limit all come from rules you can read. The AI only drafts the
        two messages below.
      </PlainCodeNote>

      <h2 className="font-display text-2xl font-extrabold">Or choose a different plan yourself</h2>

      <fieldset>
        <legend className="mb-2 text-xl font-extrabold">1. Pick a vendor</legend>
        <div className="grid gap-3 md:grid-cols-3">
          {VENDORS.map((v) => {
            const selected = v.id === vendorId;
            const verdict = verdictFor(v.total, WATER_HEATER_JOB.marketTotal);
            return (
              <label
                key={v.id}
                className={`card card-lift relative flex cursor-pointer flex-col gap-2 has-[:focus-visible]:outline has-[:focus-visible]:outline-[3px] has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ink ${
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
                {v.itemized && <span className="text-sm text-ink-soft">Itemized quote, checked on the quote screen.</span>}
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
              step={1}
              min={vendor.total}
              invalid={notToExceed < vendor.total}
              value={notToExceed}
              onChange={(v) => setNteEdit({ vendorId: vendor.id, value: v })}
              hint={
                notToExceed < vendor.total ? (
                  <span role="alert" className="font-bold text-urgent">
                    The limit cannot be lower than the quote ({usd(vendor.total)}).
                  </span>
                ) : (
                  `Starts at 10% above the quote (${usd(vendor.total)}). The vendor must call you before going over.`
                )
              }
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

      <Card title="3. Messages (optional to edit)">
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
          <>
          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <label htmlFor="vendor-message" className="mb-1 block font-extrabold">
                To the vendor: {vendor.name}
              </label>
              <textarea
                id="vendor-message"
                className="field min-h-64 text-sm leading-relaxed"
                value={vendorEdit && vendorEdit.base === drafts.data.vendorText ? vendorEdit.text : drafts.data.vendorText}
                onChange={(e) => setVendorEdit({ base: drafts.data!.vendorText, text: e.target.value })}
              />
            </div>
            <div>
              <label htmlFor="tenant-message" className="mb-1 block font-extrabold">
                To the tenant: {PROPERTY.tenant}
              </label>
              <textarea
                id="tenant-message"
                className="field min-h-64 text-sm leading-relaxed"
                value={tenantEdit && tenantEdit.base === drafts.data.tenantText ? tenantEdit.text : drafts.data.tenantText}
                onChange={(e) => setTenantEdit({ base: drafts.data!.tenantText, text: e.target.value })}
              />
            </div>
          </div>
          <p className="hint">Already written for you. Change the words if you like. You do not have to.</p>
          </>
        )}
      </Card>

      <div className="space-y-2">
        <button
          type="button"
          className="btn btn-primary btn-lg w-full"
          disabled={!vendor || drafts.loading || notToExceed < vendor.total}
          onClick={send}
        >
          Approve and send
        </button>
        <p className="text-center text-sm text-ink-soft">
          Prototype: pressing this does not send anything.{" "}
          <Link href="/owner/quote" className="font-bold underline underline-offset-4">
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
      <StepShell stepId="owner-book">
        <p className="text-ink-soft">Loading...</p>
      </StepShell>
    );
  }
  return <ApproveBody />;
}
